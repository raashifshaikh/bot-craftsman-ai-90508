import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const startTime = Date.now();
    const url = new URL(req.url);
    const botToken = url.searchParams.get('token');

    if (!botToken) {
      return new Response(JSON.stringify({ error: 'Bot token required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Parse Telegram webhook update
    const update = await req.json();
    console.log('Received update:', JSON.stringify(update));

    const message = update.message || update.edited_message;
    if (!message) {
      return new Response(JSON.stringify({ ok: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

    // Find bot project by token (take most recent active one if duplicates exist)
    const projectsResponse = await fetch(
      `${supabaseUrl}/rest/v1/bot_projects?telegram_bot_token=eq.${botToken}&is_active=eq.true&select=id,user_id,bot_status,is_active&order=created_at.desc&limit=1`,
      {
        headers: {
          'apikey': supabaseKey,
          'Authorization': `Bearer ${supabaseKey}`,
        }
      }
    );

    if (!projectsResponse.ok) {
      console.error('Project not found');
      return new Response(JSON.stringify({ error: 'Bot not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const projects = await projectsResponse.json();
    const project = projects[0];

    if (!project || !project.is_active || project.bot_status !== 'active') {
      console.log('Bot is not active');
      return new Response(JSON.stringify({ ok: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Extract message info
    const messageText = message.text || '';
    const chatId = message.chat.id;
    const userId = message.from.id.toString();
    const username = message.from.username || '';
    const firstName = message.from.first_name || '';
    const lastName = message.from.last_name || '';

    // Check if it's a command
    let botResponse = '';
    const isCommand = messageText.startsWith('/');

    if (isCommand) {
      const command = messageText.split(' ')[0];
      
      // Get command configuration
      const commandResponse = await fetch(
        `${supabaseUrl}/rest/v1/bot_commands?project_id=eq.${project.id}&command=eq.${command}&is_active=eq.true&limit=1`,
        {
          headers: {
            'apikey': supabaseKey,
            'Authorization': `Bearer ${supabaseKey}`,
          }
        }
      );

      if (commandResponse.ok) {
        const commands = await commandResponse.json();
        const commandConfig = commands[0];

        if (commandConfig) {
          botResponse = commandConfig.response_content;

          // Prepare reply markup if buttons are configured
          let replyMarkup = undefined;
          if (commandConfig.response_type === 'buttons' && commandConfig.response_metadata?.buttons) {
            replyMarkup = {
              inline_keyboard: commandConfig.response_metadata.buttons
            };
          }

          // Send response via Telegram API
          const telegramResponse = await fetch(
            `https://api.telegram.org/bot${botToken}/sendMessage`,
            {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                chat_id: chatId,
                text: botResponse,
                reply_markup: replyMarkup,
                parse_mode: 'HTML',
              }),
            }
          );

          if (!telegramResponse.ok) {
            const errorText = await telegramResponse.text();
            console.error('Telegram API error:', errorText);
          }

          // Increment command usage
          await fetch(
            `${supabaseUrl}/rest/v1/rpc/increment_bot_metric`,
            {
              method: 'POST',
              headers: {
                'apikey': supabaseKey,
                'Authorization': `Bearer ${supabaseKey}`,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                p_project_id: project.id,
                p_metric_name: `command_${command}`,
                p_increment: 1
              })
            }
          );
        }
      }

      if (!botResponse) {
        // Unknown command
        botResponse = 'Unknown command. Type /help to see available commands.';
        await fetch(
          `https://api.telegram.org/bot${botToken}/sendMessage`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              chat_id: chatId,
              text: botResponse,
            }),
          }
        );
      }
    } else {
      // Not a command, send generic response
      botResponse = 'I only respond to commands. Type /help to see what I can do.';
      await fetch(
        `https://api.telegram.org/bot${botToken}/sendMessage`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chat_id: chatId,
            text: botResponse,
          }),
        }
      );
    }

    const responseTime = Date.now() - startTime;

    // Log message interaction
    await fetch(
      `${supabaseUrl}/rest/v1/bot_messages`,
      {
        method: 'POST',
        headers: {
          'apikey': supabaseKey,
          'Authorization': `Bearer ${supabaseKey}`,
          'Content-Type': 'application/json',
          'Prefer': 'return=minimal'
        },
        body: JSON.stringify({
          project_id: project.id,
          telegram_user_id: userId,
          telegram_username: username,
          telegram_first_name: firstName,
          telegram_last_name: lastName,
          message_text: messageText,
          message_type: isCommand ? 'command' : 'text',
          bot_response: botResponse,
          response_time_ms: responseTime,
        })
      }
    );

    // Update daily metrics
    await fetch(
      `${supabaseUrl}/rest/v1/rpc/increment_bot_metric`,
      {
        method: 'POST',
        headers: {
          'apikey': supabaseKey,
          'Authorization': `Bearer ${supabaseKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          p_project_id: project.id,
          p_metric_name: 'total_messages',
          p_increment: 1
        })
      }
    );

    // Track unique users
    const existingUserResponse = await fetch(
      `${supabaseUrl}/rest/v1/bot_messages?project_id=eq.${project.id}&telegram_user_id=eq.${userId}&select=telegram_user_id&limit=1`,
      {
        headers: {
          'apikey': supabaseKey,
          'Authorization': `Bearer ${supabaseKey}`,
        }
      }
    );

    if (existingUserResponse.ok) {
      const existingUser = await existingUserResponse.json();
      if (!existingUser || existingUser.length === 0) {
        await fetch(
          `${supabaseUrl}/rest/v1/rpc/increment_bot_metric`,
          {
            method: 'POST',
            headers: {
              'apikey': supabaseKey,
              'Authorization': `Bearer ${supabaseKey}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              p_project_id: project.id,
              p_metric_name: 'total_users',
              p_increment: 1
            })
          }
        );
      }
    }

    return new Response(JSON.stringify({ ok: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in telegram-bot-runtime:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
