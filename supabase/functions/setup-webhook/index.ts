import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'jsr:@supabase/supabase-js@2';

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
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const webhookUrl = `${supabaseUrl}/functions/v1/telegram-bot-runtime?token=${botToken}`;

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
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { error: updateError } = await supabase
      .from('bot_projects')
      .update({
        webhook_url: webhookUrl,
        bot_username: botUsername,
        bot_status: 'active',
        is_active: true,
      })
      .eq('id', projectId);

    if (updateError) {
      console.error('Failed to update project:', updateError);
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
