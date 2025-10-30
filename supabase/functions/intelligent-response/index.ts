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
    const { projectId, message, context } = await req.json();

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Get bot context
    const { data: project } = await supabaseClient
      .from("bot_projects")
      .select("*")
      .eq("id", projectId)
      .single();

    if (!project) {
      throw new Error("Project not found");
    }

    // Get recent conversation history
    const { data: recentEvents } = await supabaseClient
      .from("bot_events")
      .select("*")
      .eq("project_id", projectId)
      .order("timestamp", { ascending: false })
      .limit(10);

    const conversationHistory = recentEvents
      ?.filter((e) => e.event_type === "message")
      .map((e) => e.event_data?.text || "")
      .reverse()
      .join("\n");

    const systemPrompt = `You are a helpful Telegram bot assistant for: ${project.bot_name}

Bot Description: ${project.bot_description || "General purpose bot"}
Bot Context: ${project.context || "No specific context"}

Recent conversation:
${conversationHistory || "No recent messages"}

Provide helpful, concise, and friendly responses. Keep answers under 200 characters unless more detail is needed.`;

    const aiResponse = await callAI([
      { role: "system", content: systemPrompt },
      { role: "user", content: message },
    ]);

    return new Response(JSON.stringify({ response: aiResponse }), {
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
