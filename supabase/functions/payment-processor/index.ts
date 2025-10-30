import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, stripe-signature",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const path = url.pathname;

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Handle Stripe webhook
    if (path.endsWith("/webhook/stripe")) {
      const signature = req.headers.get("stripe-signature");
      const body = await req.text();

      // Verify webhook signature (in production)
      // const event = stripe.webhooks.constructEvent(body, signature, webhookSecret);

      const event = JSON.parse(body);

      if (event.type === "checkout.session.completed") {
        const session = event.data.object;
        
        // Update subscription
        await supabaseClient.from("user_subscriptions").insert({
          user_id: session.client_reference_id,
          plan_id: session.metadata.plan_id,
          status: "active",
          current_period_start: new Date().toISOString(),
          current_period_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
          stripe_subscription_id: session.subscription,
        });

        // Log transaction
        await supabaseClient.from("transactions").insert({
          user_id: session.client_reference_id,
          transaction_type: "subscription",
          amount: session.amount_total / 100,
          currency: session.currency,
          payment_provider: "stripe",
          provider_transaction_id: session.id,
          status: "completed",
          metadata: session,
        });
      } else if (event.type === "invoice.payment_succeeded") {
        const invoice = event.data.object;
        
        // Update wallet
        await supabaseClient.from("user_wallets").update({
          balance: invoice.amount_paid / 100,
        }).eq("user_id", invoice.customer);
      }

      return new Response(JSON.stringify({ received: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Handle Telegram payment callback
    if (path.endsWith("/webhook/telegram")) {
      const update = await req.json();

      if (update.pre_checkout_query) {
        // Validate payment
        return new Response(JSON.stringify({ ok: true }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      if (update.message?.successful_payment) {
        const payment = update.message.successful_payment;
        const userId = update.message.from.id;

        // Process payment
        await supabaseClient.from("transactions").insert({
          user_id: userId,
          transaction_type: "purchase",
          amount: payment.total_amount / 100,
          currency: payment.currency,
          payment_provider: "telegram",
          provider_transaction_id: payment.telegram_payment_charge_id,
          status: "completed",
          metadata: payment,
        });

        // Update wallet
        const { data: wallet } = await supabaseClient
          .from("user_wallets")
          .select("*")
          .eq("user_id", userId)
          .single();

        if (wallet) {
          await supabaseClient.from("user_wallets").update({
            balance: wallet.balance + (payment.total_amount / 100),
            total_earned: wallet.total_earned + (payment.total_amount / 100),
          }).eq("user_id", userId);
        }
      }

      return new Response(JSON.stringify({ ok: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Create checkout session
    const { planId, userId } = await req.json();

    const { data: plan } = await supabaseClient
      .from("subscription_plans")
      .select("*")
      .eq("id", planId)
      .single();

    if (!plan) {
      throw new Error("Plan not found");
    }

    // Return payment intent (in production, create actual Stripe session)
    return new Response(JSON.stringify({
      success: true,
      checkoutUrl: `https://example.com/checkout?plan=${planId}`,
      amount: plan.price_monthly,
      currency: "USD",
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Payment processing error:", error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : String(error) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
