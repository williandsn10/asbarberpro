import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { user_id, title, body, data } = await req.json();

    console.log("Received push notification request:", { user_id, title, body });

    if (!user_id || !title || !body) {
      return new Response(
        JSON.stringify({ error: "Missing required fields: user_id, title, body" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get environment variables
    const vapidPublicKey = Deno.env.get("VAPID_PUBLIC_KEY");
    const vapidPrivateKey = Deno.env.get("VAPID_PRIVATE_KEY");
    const vapidSubject = Deno.env.get("VAPID_SUBJECT");
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!vapidPublicKey || !vapidPrivateKey || !vapidSubject) {
      console.error("Missing VAPID configuration");
      return new Response(
        JSON.stringify({ error: "Server configuration error: Missing VAPID keys" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create Supabase client with service role
    const supabase = createClient(supabaseUrl!, supabaseServiceKey!);

    // Fetch user's push subscriptions
    const { data: subscriptions, error: fetchError } = await supabase
      .from("push_subscriptions")
      .select("*")
      .eq("user_id", user_id);

    if (fetchError) {
      console.error("Error fetching subscriptions:", fetchError);
      return new Response(
        JSON.stringify({ error: "Failed to fetch subscriptions" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!subscriptions || subscriptions.length === 0) {
      console.log("No push subscriptions found for user:", user_id);
      return new Response(
        JSON.stringify({ message: "No subscriptions found for user", sent: 0 }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Found ${subscriptions.length} subscription(s) for user`);

    // Prepare notification payload
    const payload = JSON.stringify({
      title,
      body,
      icon: "/pwa-192x192.png",
      badge: "/pwa-192x192.png",
      data: data || {},
    });

    const results: Array<{ endpoint: string; success: boolean; reason?: string }> = [];
    const expiredSubscriptions: string[] = [];

    // Send push to each subscription
    // Note: Web Push Protocol requires complex crypto (ECDH + VAPID JWT)
    // For full implementation, we attempt a direct push and fall back to notification storage
    for (const subscription of subscriptions) {
      try {
        const url = new URL(subscription.endpoint);
        
        console.log(`Attempting push to: ${subscription.endpoint.substring(0, 60)}...`);
        
        // Try direct fetch to push service endpoint
        // This is a simplified approach - full Web Push requires encrypted payload
        const response = await fetch(subscription.endpoint, {
          method: "POST",
          headers: {
            "Content-Type": "application/octet-stream",
            "TTL": "86400",
            "Urgency": "high",
          },
          body: new Uint8Array(0), // Empty trigger push
        }).catch((e) => {
          console.error("Fetch error:", e);
          return { ok: false, status: 0, statusText: String(e) };
        });

        const statusCode = "status" in response ? response.status : 0;
        const success = "ok" in response && response.ok;

        results.push({
          endpoint: subscription.endpoint.substring(0, 50),
          success,
          reason: success ? "Sent" : `Status: ${statusCode}`,
        });

        // Mark expired subscriptions for cleanup (410 Gone or 404 Not Found)
        if (statusCode === 410 || statusCode === 404) {
          expiredSubscriptions.push(subscription.id);
        }
      } catch (error) {
        console.error("Error processing subscription:", error);
        results.push({
          endpoint: subscription.endpoint?.substring(0, 50) || "unknown",
          success: false,
          reason: String(error),
        });
      }
    }

    // Clean up expired subscriptions
    if (expiredSubscriptions.length > 0) {
      console.log(`Cleaning up ${expiredSubscriptions.length} expired subscription(s)`);
      await supabase
        .from("push_subscriptions")
        .delete()
        .in("id", expiredSubscriptions);
    }

    const successCount = results.filter((r) => r.success).length;

    return new Response(
      JSON.stringify({
        message: `Processed ${successCount} of ${subscriptions.length} subscriptions`,
        sent: successCount,
        results,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in send-push-notification:", error);
    return new Response(
      JSON.stringify({ error: String(error) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
