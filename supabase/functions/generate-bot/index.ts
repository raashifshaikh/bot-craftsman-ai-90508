const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

async function callAI(messages: any[]) {
  const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
  const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY');

  if (LOVABLE_API_KEY) {
    try {
      const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${LOVABLE_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'google/gemini-2.5-flash',
          messages
        }),
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
      }))
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
    const { projectId, requirements, botToken } = await req.json();
    
    console.log('Generating bot for project:', projectId);
    console.log('Requirements:', requirements);

    const historyResponse = await fetch(`${SUPABASE_URL}/rest/v1/generation_history`, {
      method: 'POST',
      headers: {
        'apikey': SUPABASE_SERVICE_ROLE_KEY,
        'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=representation'
      },
      body: JSON.stringify({
        project_id: projectId,
        user_prompt: JSON.stringify(requirements),
        status: 'processing'
      })
    });

    if (!historyResponse.ok) {
      throw new Error('Failed to create generation history');
    }

    const historyData = await historyResponse.json();
    const historyId = historyData[0].id;

    const commands = requirements.commands || [];
    
    if (!commands.includes('start')) {
      commands.unshift('start');
    }
    if (!commands.includes('help')) {
      commands.push('help');
    }

    console.log('Generating responses for commands:', commands);

    const generatedCommands = [];

    for (const command of commands) {
      try {
        const commandDescription = requirements.description || 'A helpful Telegram bot';
        
        const data = await callAI([
          {
            role: 'system',
            content: `You are generating Telegram bot responses. Generate a concise, friendly, and helpful response for the /${command} command. Keep it under 200 characters. Be direct and action-oriented.`
          },
          {
            role: 'user',
            content: `Bot purpose: ${commandDescription}\nGenerate response for /${command} command.`
          }
        ]);

        let responseText = data.choices[0].message.content.trim();
        
        if (!responseText || responseText.length < 5) {
          responseText = command === 'start' 
            ? '👋 Welcome! Use /help to see available commands.'
            : `Response for /${command} command.`;
        }

        console.log(`Generated response for /${command}:`, responseText);

        generatedCommands.push({
          project_id: projectId,
          command: command,
          description: `Handles the /${command} command`,
          response_type: 'text',
          response_content: responseText,
          is_active: true,
          order_index: generatedCommands.length
        });
      } catch (error) {
        console.error(`Error generating response for /${command}:`, error);
        generatedCommands.push({
          project_id: projectId,
          command: command,
          description: `Handles the /${command} command`,
          response_type: 'text',
          response_content: command === 'start' 
            ? '👋 Welcome to the bot!' 
            : `This is the /${command} command.`,
          is_active: true,
          order_index: generatedCommands.length
        });
      }
    }

    if (generatedCommands.length > 0) {
      const commandsResponse = await fetch(`${SUPABASE_URL}/rest/v1/bot_commands`, {
        method: 'POST',
        headers: {
          'apikey': SUPABASE_SERVICE_ROLE_KEY,
          'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
          'Content-Type': 'application/json',
          'Prefer': 'return=representation'
        },
        body: JSON.stringify(generatedCommands)
      });

      if (!commandsResponse.ok) {
        const errorText = await commandsResponse.text();
        console.error('Failed to insert commands:', errorText);
        throw new Error('Failed to insert bot commands');
      }
    }

    const updateResponse = await fetch(`${SUPABASE_URL}/rest/v1/generation_history?id=eq.${historyId}`, {
      method: 'PATCH',
      headers: {
        'apikey': SUPABASE_SERVICE_ROLE_KEY,
        'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        status: 'completed',
        ai_response: { commands: generatedCommands }
      })
    });

    if (!updateResponse.ok) {
      console.error('Failed to update generation history');
    }

    console.log('Bot generation completed successfully');

    return new Response(
      JSON.stringify({ 
        success: true, 
        commands: generatedCommands 
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Error in generate-bot:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
