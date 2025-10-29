const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

async function callAI(messages: any[], useJsonMode = false) {
  const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
  const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY');

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
    const { botDescription, existingCommands } = await req.json();
    
    console.log('Generating command suggestions');
    console.log('Bot description:', botDescription);
    console.log('Existing commands:', existingCommands);

    const systemPrompt = `You are a Telegram bot expert. Suggest 3-5 useful commands for this bot.
Return a JSON array with this format:
[
  {
    "command": "commandname",
    "description": "What this command does",
    "response": "Example response text"
  }
]

Make commands relevant, useful, and avoid duplicating: ${existingCommands.join(', ')}`;

    const data = await callAI([
      { role: 'system', content: systemPrompt },
      { role: 'user', content: `Bot: ${botDescription}` }
    ], true);

    const suggestions = JSON.parse(data.choices[0].message.content);
    console.log('Generated suggestions:', suggestions);

    return new Response(
      JSON.stringify({ suggestions }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
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
