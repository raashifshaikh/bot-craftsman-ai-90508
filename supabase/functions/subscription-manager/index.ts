import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { action, userId, subscriptionId, planId } = await req.json();

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    if (action === "check_renewals") {
      // Check for expiring subscriptions
      const { data: expiring } = await supabaseClient
        .from("user_subscriptions")
        .select("*")
        .eq("status", "active")
        .eq("auto_renew", true)
        .lt("current_period_end", new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString());

      for (const sub of expiring || []) {
        // Renew subscription
        await supabaseClient.from("user_subscriptions").update({
          current_period_start: sub.current_period_end,
          current_period_end: new Date(new Date(sub.current_period_end).getTime() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        }).eq("id", sub.id);

        // Create transaction
        const { data: plan } = await supabaseClient
          .from("subscription_plans")
          .select("*")
          .eq("id", sub.plan_id)
          .single();

        await supabaseClient.from("transactions").insert({
          user_id: sub.user_id,
          transaction_type: "subscription",
          amount: plan.price_monthly,
          currency: "USD",
          payment_provider: "stripe",
          status: "completed",
          metadata: { subscription_id: sub.id, renewal: true },
        });
      }

      return new Response(JSON.stringify({ 
        success: true, 
        renewed: expiring?.length || 0 
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "cancel") {
      await supabaseClient.from("user_subscriptions").update({
        status: "cancelled",
        auto_renew: false,
      }).eq("id", subscriptionId).eq("user_id", userId);

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "upgrade") {
      const { data: currentSub } = await supabaseClient
        .from("user_subscriptions")
        .select("*")
        .eq("user_id", userId)
        .eq("status", "active")
        .single();

      if (currentSub) {
        await supabaseClient.from("user_subscriptions").update({
          status: "cancelled",
        }).eq("id", currentSub.id);
      }

      await supabaseClient.from("user_subscriptions").insert({
        user_id: userId,
        plan_id: planId,
        status: "active",
        current_period_start: new Date().toISOString(),
        current_period_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      });

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    throw new Error("Invalid action");
  } catch (error) {
    console.error("Subscription management error:", error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : String(error) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
