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
    const { botDescription, existingCommands } = await req.json();

    const OPENROUTER_API_KEY = Deno.env.get('OPENROUTER_API_KEY');
    if (!OPENROUTER_API_KEY) {
      throw new Error('OPENROUTER_API_KEY not configured');
    }

    const systemPrompt = `You are a Telegram bot expert. Given a bot description and existing commands, suggest 3-5 additional useful commands that would enhance the bot's functionality.

Return ONLY a JSON array of command suggestions with this structure:
[
  {
    "command": "/commandname",
    "description": "Brief description of what this command does",
    "response": "Sample response text that the bot should send",
    "priority": "high|medium|low"
  }
]

Existing commands: ${existingCommands?.map((c: any) => c.command).join(', ') || 'None yet'}

Make suggestions relevant to the bot's purpose. Be creative but practical.`;

    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.0-flash-exp:free',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: `Bot description: ${botDescription}` }
        ],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('OpenRouter error:', errorText);
      throw new Error(`OpenRouter API error: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices[0].message.content;
    
    // Extract JSON from response
    const jsonMatch = content.match(/\[[\s\S]*\]/);
    const suggestions = jsonMatch ? JSON.parse(jsonMatch[0]) : [];

    return new Response(JSON.stringify({ suggestions }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in suggest-commands:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
