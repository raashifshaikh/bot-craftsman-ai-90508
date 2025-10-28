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
    const { projectId, requirements, botToken, supabaseUrl, supabaseKey } = await req.json();
    const OPENROUTER_API_KEY = Deno.env.get('OPENROUTER_API_KEY');

    if (!OPENROUTER_API_KEY) {
      throw new Error('OPENROUTER_API_KEY is not configured');
    }

    console.log('Generating bot code for project:', projectId);
    console.log('Requirements:', requirements);

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
        status: 'pending',
      })
      .select()
      .single();

    const systemPrompt = `You are an expert Python Telegram bot developer. 
Generate complete, production-ready Python code for a Telegram bot using python-telegram-bot library.

Requirements:
${JSON.stringify(requirements, null, 2)}

Bot Token: ${botToken}
${supabaseUrl ? `Supabase URL: ${supabaseUrl}` : ''}
${supabaseKey ? `Supabase Key: ${supabaseKey}` : ''}

Generate these files:
1. main.py - Main bot file with all handlers
2. requirements.txt - All dependencies
3. README.md - Setup and deployment instructions
${requirements.needsDatabase ? '4. database.py - Database helper functions' : ''}

Make the code:
- Production-ready with error handling
- Well-commented and structured
- Following Python best practices
- Using async/await properly
- Including proper logging

Return ONLY valid JSON in this exact format:
{
  "files": [
    {
      "name": "main.py",
      "content": "# Full code here...",
      "type": "python"
    },
    {
      "name": "requirements.txt",
      "content": "python-telegram-bot==20.7\\n...",
      "type": "text"
    }
  ]
}`;

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
          { role: 'system', content: systemPrompt },
          { role: 'user', content: 'Generate the complete bot code now.' }
        ],
        response_format: { type: "json_object" },
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('OpenRouter error:', error);
      throw new Error(`OpenRouter API error: ${response.status}`);
    }

    const data = await response.json();
    const generatedData = JSON.parse(data.choices[0].message.content);

    console.log('Generated files:', generatedData.files.length);

    // Store generated code
    for (const file of generatedData.files) {
      await supabaseAdmin
        .from('generated_code')
        .insert({
          project_id: projectId,
          file_name: file.name,
          file_content: file.content,
          file_type: file.type,
        });
    }

    // Update history status
    await supabaseAdmin
      .from('generation_history')
      .update({
        status: 'completed',
        ai_response: generatedData,
      })
      .eq('id', historyEntry.id);

    return new Response(JSON.stringify(generatedData), {
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
