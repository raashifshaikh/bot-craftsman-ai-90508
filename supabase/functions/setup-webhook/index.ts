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
    const { projectId, botToken } = await req.json();

    if (!projectId || !botToken) {
      return new Response(
        JSON.stringify({ error: 'Project ID and bot token are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get bot info from Telegram
    const botInfoResponse = await fetch(
      `https://api.telegram.org/bot${botToken}/getMe`
    );

    if (!botInfoResponse.ok) {
      return new Response(
        JSON.stringify({ error: 'Invalid bot token' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const botInfo = await botInfoResponse.json();
    const botUsername = botInfo.result.username;

    // Set webhook URL
    const webhookUrl = `${Deno.env.get('SUPABASE_URL')}/functions/v1/telegram-bot-runtime?token=${botToken}`;

    const webhookResponse = await fetch(
      `https://api.telegram.org/bot${botToken}/setWebhook`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url: webhookUrl,
          allowed_updates: ['message', 'edited_message', 'callback_query'],
        }),
      }
    );

    if (!webhookResponse.ok) {
      const errorText = await webhookResponse.text();
      console.error('Failed to set webhook:', errorText);
      return new Response(
        JSON.stringify({ error: 'Failed to set webhook' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const webhookResult = await webhookResponse.json();
    console.log('Webhook set successfully:', webhookResult);

    // Update project in database
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
    
    const updateResponse = await fetch(
      `${supabaseUrl}/rest/v1/bot_projects?id=eq.${projectId}`,
      {
        method: 'PATCH',
        headers: {
          'apikey': supabaseKey,
          'Authorization': `Bearer ${supabaseKey}`,
          'Content-Type': 'application/json',
          'Prefer': 'return=minimal'
        },
        body: JSON.stringify({
          webhook_url: webhookUrl,
          bot_username: botUsername,
          bot_status: 'active',
          is_active: true,
        })
      }
    );

    if (!updateResponse.ok) {
      const errorText = await updateResponse.text();
      console.error('Failed to update project:', errorText);
      return new Response(
        JSON.stringify({ error: 'Failed to update project' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        botUsername,
        webhookUrl,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in setup-webhook:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
