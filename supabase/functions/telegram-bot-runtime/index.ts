import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

interface TelegramUpdate {
  message?: {
    message_id: number;
    from: {
      id: number;
      is_bot: boolean;
      first_name: string;
      last_name?: string;
      username?: string;
      language_code?: string;
    };
    chat: { id: number; type: string };
    text?: string;
    photo?: any[];
    document?: any;
    voice?: any;
    video?: any;
    audio?: any;
  };
  callback_query?: {
    id: string;
    from: { id: number };
    message: { chat: { id: number }; message_id: number };
    data: string;
  };
  pre_checkout_query?: {
    id: string;
    from: { id: number };
    currency: string;
    total_amount: number;
    invoice_payload: string;
  };
}

class BotRuntime {
  private supabase: any;
  private botToken: string;
  private projectId: string;
  private project: any;

  constructor(supabase: any, botToken: string, projectId: string, project: any) {
    this.supabase = supabase;
    this.botToken = botToken;
    this.projectId = projectId;
    this.project = project;
  }

  async handleUpdate(update: TelegramUpdate) {
    try {
      if (update.message) {
        await this.handleMessage(update.message);
      } else if (update.callback_query) {
        await this.handleCallback(update.callback_query);
      } else if (update.pre_checkout_query) {
        await this.handlePreCheckout(update.pre_checkout_query);
      }
    } catch (error) {
      console.error("Error handling update:", error);
      await this.logError("update_handling", error);
    }
  }

  private async handleMessage(message: any) {
    const telegramUserId = message.from.id;
    const chatId = message.chat.id;
    const text = message.text || "";

    // Register/update Telegram user
    await this.upsertTelegramUser(message.from);
    await this.logEvent("message", telegramUserId, { text });

    // Get conversation state
    const state = await this.getConversationState(telegramUserId);

    // Check if user is in a flow
    if (state?.current_flow_id) {
      await this.continueFlow(state, message);
      return;
    }

    // Try intent recognition
    const intent = await this.recognizeIntent(text);
    if (intent) {
      await this.handleIntent(intent, message);
      return;
    }

    // Try command matching
    const command = await this.findCommand(text);
    if (command) {
      await this.handleCommand(command, message);
      return;
    }

    // Try conversation flow trigger
    const flow = await this.findFlow(text);
    if (flow) {
      await this.startFlow(flow, message);
      return;
    }

    // AI fallback
    await this.handleAIFallback(message);
  }

  private async upsertTelegramUser(from: any) {
    await this.supabase.from("telegram_users").upsert({
      telegram_id: from.id,
      username: from.username,
      first_name: from.first_name,
      last_name: from.last_name,
      language_code: from.language_code,
      is_bot: from.is_bot || false,
      last_seen_at: new Date().toISOString(),
    });
  }

  private async getConversationState(telegramUserId: number) {
    const { data } = await this.supabase
      .from("conversation_states")
      .select("*")
      .eq("telegram_user_id", telegramUserId)
      .eq("project_id", this.projectId)
      .maybeSingle();
    return data;
  }

  private async recognizeIntent(text: string) {
    const { data: intents } = await this.supabase
      .from("bot_intents")
      .select("*")
      .eq("project_id", this.projectId)
      .eq("is_active", true);

    if (!intents) return null;

    for (const intent of intents) {
      const phrases = intent.training_phrases || [];
      for (const phrase of phrases) {
        if (text.toLowerCase().includes(phrase.toLowerCase())) {
          return intent;
        }
      }
    }
    return null;
  }

  private async findCommand(text: string) {
    const { data } = await this.supabase
      .from("bot_commands")
      .select("*")
      .eq("project_id", this.projectId)
      .eq("command", text.split(" ")[0])
      .maybeSingle();
    return data;
  }

  private async findFlow(text: string) {
    const { data: flows } = await this.supabase
      .from("conversation_flows")
      .select("*")
      .eq("project_id", this.projectId)
      .eq("is_active", true)
      .order("priority", { ascending: false });

    if (!flows) return null;

    for (const flow of flows) {
      if (flow.trigger_type === "command" && text.startsWith(flow.trigger_value)) {
        return flow;
      } else if (flow.trigger_type === "keyword" && text.toLowerCase().includes(flow.trigger_value.toLowerCase())) {
        return flow;
      } else if (flow.trigger_type === "regex") {
        const regex = new RegExp(flow.trigger_value);
        if (regex.test(text)) {
          return flow;
        }
      }
    }
    return null;
  }

  private async handleIntent(intent: any, message: any) {
    const chatId = message.chat.id;

    if (intent.action_type === "flow") {
      const { data: flow } = await this.supabase
        .from("conversation_flows")
        .select("*")
        .eq("id", intent.action_config.flow_id)
        .maybeSingle();
      
      if (flow) {
        await this.startFlow(flow, message);
      }
    } else if (intent.action_type === "api_call") {
      await this.executeAPICall(intent.action_config, message);
    } else if (intent.action_type === "ai_response") {
      await this.generateAIResponse(message);
    }
  }

  private async handleCommand(command: any, message: any) {
    const chatId = message.chat.id;
    let responseText = command.response_text || command.response_content || "Command executed";

    // Generate AI response if needed
    if (command.use_ai_response) {
      responseText = await this.callGenerateResponse(command.command, command.description);
    }

    const buttons = command.response_metadata?.buttons || command.response_buttons;
    await this.sendMessage(chatId, responseText, buttons);
  }

  private async startFlow(flow: any, message: any) {
    const chatId = message.chat.id;
    const telegramUserId = message.from.id;
    const flowDef = flow.flow_definition;

    // Create conversation state
    await this.supabase.from("conversation_states").upsert({
      telegram_user_id: telegramUserId,
      project_id: this.projectId,
      current_flow_id: flow.id,
      current_step: "start",
      state_data: {},
      context: {},
      started_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      expires_at: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
    });

    // Execute first step
    const firstStep = flowDef.steps?.[0];
    if (firstStep) {
      await this.executeFlowStep(firstStep, chatId, telegramUserId);
    }
  }

  private async continueFlow(state: any, message: any) {
    const chatId = message.chat.id;
    const { data: flow } = await this.supabase
      .from("conversation_flows")
      .select("*")
      .eq("id", state.current_flow_id)
      .maybeSingle();

    if (!flow) {
      await this.clearConversationState(state.telegram_user_id);
      return;
    }

    const flowDef = flow.flow_definition;
    const currentStepIndex = flowDef.steps?.findIndex((s: any) => s.id === state.current_step);
    
    if (currentStepIndex === -1) {
      await this.clearConversationState(state.telegram_user_id);
      return;
    }

    // Store user input in context
    const context = { ...state.context, [state.current_step]: message.text };
    
    // Get next step
    const nextStep = flowDef.steps?.[currentStepIndex + 1];
    
    if (!nextStep) {
      // Flow completed
      await this.sendMessage(chatId, "Thank you! Flow completed.");
      await this.clearConversationState(state.telegram_user_id);
      return;
    }

    // Update state
    await this.supabase.from("conversation_states").update({
      current_step: nextStep.id,
      context,
      updated_at: new Date().toISOString(),
    }).eq("telegram_user_id", state.telegram_user_id)
      .eq("project_id", this.projectId);

    // Execute next step
    await this.executeFlowStep(nextStep, chatId, state.telegram_user_id);
  }

  private async executeFlowStep(step: any, chatId: number, telegramUserId: number) {
    if (step.type === "message") {
      await this.sendMessage(chatId, step.content, step.buttons);
    } else if (step.type === "api_call") {
      await this.executeAPICall(step.api_config, { chat: { id: chatId }, from: { id: telegramUserId } });
    } else if (step.type === "condition") {
      // Handle conditional logic
      await this.sendMessage(chatId, "Processing...");
    }
  }

  private async clearConversationState(telegramUserId: number) {
    await this.supabase.from("conversation_states").delete()
      .eq("telegram_user_id", telegramUserId)
      .eq("project_id", this.projectId);
  }

  private async executeAPICall(config: any, message: any) {
    const chatId = message.chat.id;
    
    try {
      const { data: integration } = await this.supabase
        .from("api_integrations")
        .select("*")
        .eq("id", config.integration_id)
        .maybeSingle();

      if (!integration) {
        await this.sendMessage(chatId, "API integration not found");
        return;
      }

      // Call API executor edge function
      const response = await fetch(`${supabaseUrl}/functions/v1/api-executor`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${supabaseServiceKey}`,
        },
        body: JSON.stringify({
          integration,
          params: config.params,
          context: message,
        }),
      });

      const result = await response.json();
      await this.sendMessage(chatId, result.message || result.data || "API call executed");
    } catch (error) {
      console.error("API call error:", error);
      await this.sendMessage(chatId, "Failed to execute API call");
    }
  }

  private async generateAIResponse(message: any) {
    const chatId = message.chat.id;
    
    try {
      const response = await fetch(`${supabaseUrl}/functions/v1/intelligent-response`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${supabaseServiceKey}`,
        },
        body: JSON.stringify({
          projectId: this.projectId,
          message: message.text,
          context: this.project,
        }),
      });

      const result = await response.json();
      await this.sendMessage(chatId, result.response);
    } catch (error) {
      console.error("AI response error:", error);
      await this.sendMessage(chatId, "Sorry, I couldn't process that request.");
    }
  }

  private async handleAIFallback(message: any) {
    await this.generateAIResponse(message);
  }

  private async callGenerateResponse(command: string, description: string) {
    try {
      const response = await fetch(`${supabaseUrl}/functions/v1/generate-response`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${supabaseServiceKey}`,
        },
        body: JSON.stringify({
          command,
          commandDescription: description,
          botContext: this.project.context,
        }),
      });

      const result = await response.json();
      return result.response || "Response generated";
    } catch (error) {
      console.error("Generate response error:", error);
      return "Failed to generate response";
    }
  }

  private async handleCallback(callback: any) {
    const chatId = callback.message.chat.id;
    const telegramUserId = callback.from.id;

    await this.logEvent("callback", telegramUserId, { data: callback.data });

    // Answer callback to remove loading state
    await fetch(`https://api.telegram.org/bot${this.botToken}/answerCallbackQuery`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ callback_query_id: callback.id }),
    });

    // Handle payment callbacks
    if (callback.data.startsWith("pay_")) {
      await this.initiatePayment(chatId, callback.data);
    }
  }

  private async handlePreCheckout(query: any) {
    // Verify payment details
    await fetch(`https://api.telegram.org/bot${this.botToken}/answerPreCheckoutQuery`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        pre_checkout_query_id: query.id,
        ok: true,
      }),
    });
  }

  private async initiatePayment(chatId: number, paymentData: string) {
    await this.sendMessage(chatId, "Payment processing coming soon!");
  }

  private async sendMessage(chatId: number, text: string, buttons?: any) {
    const payload: any = {
      chat_id: chatId,
      text,
      parse_mode: "HTML",
    };

    if (buttons && buttons.length > 0) {
      payload.reply_markup = {
        inline_keyboard: buttons.map((btn: any) => [
          {
            text: btn.text,
            callback_data: btn.callback_data || btn.text,
            url: btn.url,
          },
        ]),
      };
    }

    await fetch(`https://api.telegram.org/bot${this.botToken}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
  }

  private async logEvent(eventType: string, telegramUserId: number, data: any) {
    await this.supabase.from("bot_events").insert({
      project_id: this.projectId,
      telegram_user_id: telegramUserId,
      event_type: eventType,
      event_data: data,
    });

    await this.supabase.rpc("increment_bot_metric", {
      p_project_id: this.projectId,
      p_metric_name: "total_messages",
      p_increment: 1,
    });
  }

  private async logError(errorType: string, error: any) {
    await this.supabase.rpc("increment_error_count", {
      p_project_id: this.projectId,
      p_error_type: errorType,
      p_error_message: error instanceof Error ? error.message : String(error),
      p_stack_trace: error instanceof Error ? error.stack : "",
      p_context: {},
    });
  }
}

serve(async (req) => {
  try {
    const url = new URL(req.url);
    const botToken = url.searchParams.get("token") || req.headers.get("x-telegram-bot-api-secret-token") || "";

    if (!botToken) {
      return new Response(JSON.stringify({ error: "Bot token required" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const update = await req.json();
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { data: project } = await supabase
      .from("bot_projects")
      .select("*")
      .eq("telegram_bot_token", botToken)
      .eq("is_active", true)
      .eq("bot_status", "active")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!project) {
      return new Response(JSON.stringify({ error: "Bot not found or inactive" }), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      });
    }

    const runtime = new BotRuntime(supabase, botToken, project.id, project);
    await runtime.handleUpdate(update);

    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Runtime error:", error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : String(error) }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
});
