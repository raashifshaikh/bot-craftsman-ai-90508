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
      
      console.warn('Lovable AI failed, falling back to Gemini');
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

async function getBotData(projectId: string, authHeader: string) {
  // Fetch project details
  const projectResponse = await fetch(`${SUPABASE_URL}/rest/v1/bot_projects?id=eq.${projectId}&select=*`, {
    headers: {
      'apikey': SUPABASE_SERVICE_ROLE_KEY,
      'Authorization': authHeader,
    }
  });
  
  const projects = await projectResponse.json();
  const project = projects[0];

  // Fetch commands
  const commandsResponse = await fetch(`${SUPABASE_URL}/rest/v1/bot_commands?project_id=eq.${projectId}&select=*`, {
    headers: {
      'apikey': SUPABASE_SERVICE_ROLE_KEY,
      'Authorization': authHeader,
    }
  });
  
  const commands = await commandsResponse.json();

  // Fetch recent messages
  const messagesResponse = await fetch(`${SUPABASE_URL}/rest/v1/bot_messages?project_id=eq.${projectId}&order=created_at.desc&limit=50`, {
    headers: {
      'apikey': SUPABASE_SERVICE_ROLE_KEY,
      'Authorization': authHeader,
    }
  });
  
  const messages = await messagesResponse.json();

  return { project, commands, messages };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization') || '';
    const { projectId, action, message, conversationHistory } = await req.json();
    
    console.log('Bot Assistant called:', { projectId, action });

    const botData = await getBotData(projectId, authHeader);

    let systemPrompt = '';
    let userPrompt = '';

    switch (action) {
      case 'health-check':
        systemPrompt = `You are a Telegram bot expert analyzing bot health. Provide a comprehensive health report including:
1. Health score (0-100)
2. List of issues found
3. Specific suggestions for improvement

Analyze commands, response quality, coverage, and potential problems.`;
        
        userPrompt = `Bot: ${botData.project.name}
Description: ${botData.project.description}
Status: ${botData.project.bot_status}
Commands: ${JSON.stringify(botData.commands, null, 2)}
Recent Messages: ${JSON.stringify(botData.messages.slice(0, 10), null, 2)}

Provide a detailed health analysis.`;
        break;

      case 'diagnose-error':
        systemPrompt = `You are a Telegram bot debugging expert. Analyze the error and provide:
1. Clear explanation of what went wrong
2. Root cause analysis
3. Step-by-step fix instructions`;
        
        userPrompt = `Bot: ${botData.project.name}
Error/Issue: ${message}
Commands: ${JSON.stringify(botData.commands, null, 2)}

Help diagnose and fix this issue.`;
        break;

      case 'suggest-improvements':
        systemPrompt = `You are a Telegram bot optimization expert. Suggest concrete improvements for:
1. New useful commands
2. Better response text
3. User experience enhancements
4. Missing features`;
        
        userPrompt = `Bot: ${botData.project.name}
Description: ${botData.project.description}
Current Commands: ${botData.commands.map((c: any) => c.command).join(', ')}
Usage Stats: ${botData.messages.length} total messages

Suggest 5 specific improvements.`;
        break;

      case 'edit-bot':
        systemPrompt = `You are a Telegram bot editor. The user wants to modify their bot. Understand their request and provide:
1. What changes need to be made
2. Which commands to modify/add/remove
3. New response text if needed

Be conversational and helpful.`;
        
        userPrompt = `Bot: ${botData.project.name}
Commands: ${JSON.stringify(botData.commands, null, 2)}
User Request: ${message}

Help them edit their bot.`;
        break;

      case 'chat':
      default:
        systemPrompt = `You are a helpful AI assistant for managing Telegram bots. You can:
- Analyze bot health and performance
- Diagnose issues and errors
- Suggest improvements
- Help edit commands and responses
- Answer questions about the bot

Be conversational, helpful, and provide actionable advice.`;
        
        userPrompt = message;
    }

    // Build conversation with history
    const messages = [
      { role: 'system', content: systemPrompt }
    ];

    if (conversationHistory && conversationHistory.length > 0) {
      messages.push(...conversationHistory);
    }

    messages.push({ role: 'user', content: userPrompt });

    const data = await callAI(messages);
    const assistantResponse = data.choices[0].message.content;

    console.log('Assistant response generated');

    // Save conversation if projectId provided
    if (projectId) {
      const userId = authHeader.split('Bearer ')[1]; // Extract user from JWT if needed
      
      await fetch(`${SUPABASE_URL}/rest/v1/bot_conversations`, {
        method: 'POST',
        headers: {
          'apikey': SUPABASE_SERVICE_ROLE_KEY,
          'Authorization': authHeader,
          'Content-Type': 'application/json',
          'Prefer': 'return=minimal'
        },
        body: JSON.stringify([
          {
            project_id: projectId,
            role: 'user',
            message: message
          },
          {
            project_id: projectId,
            role: 'assistant',
            message: assistantResponse
          }
        ])
      });
    }

    return new Response(
      JSON.stringify({ response: assistantResponse }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Error in bot-assistant:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
