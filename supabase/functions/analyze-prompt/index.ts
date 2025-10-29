const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

async function callAI(messages: any[], useJsonMode = false) {
  const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
  const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY');

  // Try Lovable AI first
  if (LOVABLE_API_KEY) {
    try {
      const body: any = {
        model: 'google/gemini-2.5-flash',
        messages
      };
      
      if (useJsonMode) {
        body.response_format = { type: "json_object" };
      }

      const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${LOVABLE_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      });

      if (response.ok) {
        return await response.json();
      }
      
      console.warn('Lovable AI failed, falling back to Gemini:', response.status);
    } catch (error) {
      console.warn('Lovable AI error, falling back to Gemini:', error);
    }
  }

  // Fallback to Gemini
  if (!GEMINI_API_KEY) {
    throw new Error('No AI API key configured');
  }

  const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${GEMINI_API_KEY}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: messages.map(msg => ({
        role: msg.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: msg.content }]
      })),
      generationConfig: useJsonMode ? { responseMimeType: "application/json" } : {}
    }),
  });

  if (!response.ok) {
    throw new Error(`Gemini API error: ${response.status}`);
  }

  const data = await response.json();
  return {
    choices: [{
      message: {
        content: data.candidates[0].content.parts[0].text
      }
    }]
  };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { prompt, useSupabase } = await req.json();
    console.log('Analyzing prompt:', prompt);

    const data = await callAI([
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
    ], true);

    const requirements = JSON.parse(data.choices[0].message.content);
    console.log('Analysis result:', requirements);

    return new Response(JSON.stringify({ requirements }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error in analyze-prompt:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
