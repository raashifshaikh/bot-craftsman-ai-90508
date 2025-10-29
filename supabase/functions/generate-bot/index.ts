import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from 'jsr:@supabase/supabase-js@2';

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

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Create generation history entry
    const { data: historyEntry } = await supabaseAdmin
      .from('generation_history')
      .insert({
        project_id: projectId,
        user_prompt: JSON.stringify(requirements),
        status: 'processing',
      })
      .select()
      .single();

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
    await supabaseAdmin.from('bot_commands').insert(commandsWithResponses);

    // Update history
    await supabaseAdmin
      .from('generation_history')
      .update({
        status: 'completed',
        ai_response: { commands: commandsWithResponses },
      })
      .eq('id', historyEntry.id);

    return new Response(JSON.stringify({ 
      success: true,
      commands: commandsWithResponses
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error in generate-bot:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
