import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

async function callAI(messages: any[]) {
  const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
  
  if (LOVABLE_API_KEY) {
    try {
      const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash",
          messages,
        }),
      });

      if (!response.ok) {
        throw new Error(`Lovable AI API error: ${response.status}`);
      }

      const data = await response.json();
      return data.choices[0].message.content;
    } catch (error) {
      console.error("Lovable AI failed, falling back to Gemini:", error);
    }
  }

  const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
  if (!GEMINI_API_KEY) {
    throw new Error("No AI API keys configured");
  }

  const systemPrompt = messages.find((m) => m.role === "system")?.content || "";
  const userMessages = messages.filter((m) => m.role !== "system");
  
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${GEMINI_API_KEY}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [
          {
            parts: [{ text: systemPrompt + "\n\n" + userMessages.map((m) => m.content).join("\n") }],
          },
        ],
      }),
    }
  );

  const data = await response.json();
  return data.candidates[0].content.parts[0].text;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { prompt, projectId } = await req.json();

    const authHeader = req.headers.get("Authorization")!;
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const systemPrompt = `You are an expert Telegram bot architect. Analyze the user's request and generate a complete bot configuration.

Return a JSON object with:
{
  "intents": [{ "name": "", "training_phrases": [], "parameters": [], "action_type": "flow|api_call|ai_response", "action_config": {} }],
  "flows": [{ "name": "", "description": "", "trigger_type": "command|keyword", "trigger_value": "", "steps": [{ "id": "", "type": "message|api_call|condition", "content": "", "buttons": [] }] }],
  "commands": [{ "command": "", "description": "", "response_text": "", "use_ai_response": false }],
  "api_integrations": [{ "name": "", "api_type": "rest", "endpoint_base_url": "", "auth_type": "api_key|oauth|none" }],
  "variables": [{ "name": "", "type": "string|number|json", "scope": "global|user" }],
  "database_tables": [{ "name": "", "columns": [{ "name": "", "type": "", "required": boolean }] }],
  "features": ["payments", "analytics", "user_roles"]
}`;

    const aiResponse = await callAI([
      { role: "system", content: systemPrompt },
      { role: "user", content: prompt },
    ]);

    // Parse AI response
    let botConfig;
    try {
      const jsonMatch = aiResponse.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        botConfig = JSON.parse(jsonMatch[0]);
      } else {
        botConfig = JSON.parse(aiResponse);
      }
    } catch (e) {
      console.error("Failed to parse AI response:", e);
      throw new Error("Failed to generate valid bot configuration");
    }

    // Create database records
    if (projectId) {
      // Create intents
      if (botConfig.intents) {
        for (const intent of botConfig.intents) {
          await supabaseClient.from("bot_intents").insert({
            project_id: projectId,
            intent_name: intent.name,
            training_phrases: intent.training_phrases,
            parameters: intent.parameters || [],
            action_type: intent.action_type,
            action_config: intent.action_config || {},
          });
        }
      }

      // Create flows
      if (botConfig.flows) {
        for (const flow of botConfig.flows) {
          await supabaseClient.from("conversation_flows").insert({
            project_id: projectId,
            name: flow.name,
            description: flow.description,
            trigger_type: flow.trigger_type,
            trigger_value: flow.trigger_value,
            flow_definition: { steps: flow.steps || [] },
          });
        }
      }

      // Create commands
      if (botConfig.commands) {
        for (const cmd of botConfig.commands) {
          await supabaseClient.from("bot_commands").insert({
            project_id: projectId,
            command: cmd.command,
            description: cmd.description,
            response_text: cmd.response_text,
            use_ai_response: cmd.use_ai_response || false,
          });
        }
      }

      // Create variables
      if (botConfig.variables) {
        for (const variable of botConfig.variables) {
          await supabaseClient.from("bot_variables").insert({
            project_id: projectId,
            variable_name: variable.name,
            variable_type: variable.type,
            scope: variable.scope || "global",
          });
        }
      }
    }

    return new Response(JSON.stringify({ 
      success: true, 
      config: botConfig,
      message: "Bot configuration generated successfully"
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error:", error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : String(error) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
