const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { projectId, requirements, botToken } = await req.json();
    const OPENROUTER_API_KEY = Deno.env.get('OPENROUTER_API_KEY');

    if (!OPENROUTER_API_KEY) {
      throw new Error('OPENROUTER_API_KEY is not configured');
    }

    console.log('Generating bot configuration for project:', projectId);

    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

    // Create generation history entry
    const historyResponse = await fetch(
      `${supabaseUrl}/rest/v1/generation_history`,
      {
        method: 'POST',
        headers: {
          'apikey': supabaseKey,
          'Authorization': `Bearer ${supabaseKey}`,
          'Content-Type': 'application/json',
          'Prefer': 'return=representation'
        },
        body: JSON.stringify({
          project_id: projectId,
          user_prompt: JSON.stringify(requirements),
          status: 'processing',
        })
      }
    );

    if (!historyResponse.ok) throw new Error('Failed to create history');
    const [historyEntry] = await historyResponse.json();

    // Extract commands from requirements
    const commands: any[] = [];
    
    for (const req of requirements) {
      if (req.commands && Array.isArray(req.commands)) {
        commands.push(...req.commands.map((cmd: string) => ({
          command: cmd.startsWith('/') ? cmd : `/${cmd}`,
          description: req.description || 'No description',
        })));
      }
    }

    // Add default commands
    if (!commands.some(c => c.command === '/start')) {
      commands.push({ command: '/start', description: 'Welcome message' });
    }
    if (!commands.some(c => c.command === '/help')) {
      commands.push({ command: '/help', description: 'Show commands' });
    }

    // Generate responses for each command
    const commandsWithResponses = [];
    
    for (const cmd of commands) {
      const systemPrompt = `Generate a friendly Telegram bot response for "${cmd.command}". Context: ${requirements[0]?.description || 'A helpful bot'}. Return only the response text, under 200 characters.`;

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
            { role: 'user', content: `Generate response for ${cmd.command}` }
          ],
        }),
      });

      if (!response.ok) throw new Error(`API error: ${response.status}`);

      const data = await response.json();
      const generatedResponse = data.choices[0].message.content.trim();

      commandsWithResponses.push({
        project_id: projectId,
        command: cmd.command,
        description: cmd.description,
        response_type: 'text',
        response_content: generatedResponse,
        order_index: commandsWithResponses.length,
      });
    }

    // Insert commands
    const insertResponse = await fetch(
      `${supabaseUrl}/rest/v1/bot_commands`,
      {
        method: 'POST',
        headers: {
          'apikey': supabaseKey,
          'Authorization': `Bearer ${supabaseKey}`,
          'Content-Type': 'application/json',
          'Prefer': 'return=minimal'
        },
        body: JSON.stringify(commandsWithResponses)
      }
    );

    if (!insertResponse.ok) throw new Error('Failed to insert commands');

    // Update history
    const updateResponse = await fetch(
      `${supabaseUrl}/rest/v1/generation_history?id=eq.${historyEntry.id}`,
      {
        method: 'PATCH',
        headers: {
          'apikey': supabaseKey,
          'Authorization': `Bearer ${supabaseKey}`,
          'Content-Type': 'application/json',
          'Prefer': 'return=minimal'
        },
        body: JSON.stringify({
          status: 'completed',
          ai_response: { commands: commandsWithResponses },
        })
      }
    );

    if (!updateResponse.ok) throw new Error('Failed to update history');

    return new Response(JSON.stringify({ 
      success: true,
      commands: commandsWithResponses
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
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
