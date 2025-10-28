import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { prompt, useSupabase } = await req.json();
    const OPENROUTER_API_KEY = Deno.env.get('OPENROUTER_API_KEY');

    if (!OPENROUTER_API_KEY) {
      throw new Error('OPENROUTER_API_KEY is not configured');
    }

    console.log('Analyzing prompt:', prompt);

    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://botforge.ai',
        'X-Title': 'BotForge AI',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.0-flash-exp:free',
        messages: [
          {
            role: 'system',
            content: `You are an expert at analyzing Telegram bot requirements. 
Extract the following information from the user's prompt and return as JSON:
{
  "commands": ["array of command names like start, help, etc"],
  "features": ["array of feature descriptions"],
  "needsDatabase": boolean,
  "messageTypes": ["text", "photo", "video", etc],
  "description": "clear summary of what the bot does"
}

Be thorough and extract all implied requirements.`
          },
          {
            role: 'user',
            content: `Analyze this bot request. UseSupabase: ${useSupabase}\n\nPrompt: ${prompt}`
          }
        ],
        response_format: { type: "json_object" }
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('OpenRouter error:', error);
      throw new Error(`OpenRouter API error: ${response.status}`);
    }

    const data = await response.json();
    const requirements = JSON.parse(data.choices[0].message.content);

    console.log('Analysis result:', requirements);

    return new Response(JSON.stringify({ requirements }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error in analyze-prompt:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
