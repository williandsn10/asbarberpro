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
    const { 
      appointment_id, 
      client_name, 
      service_name, 
      date, 
      time,
      exclude_user_id // Don't notify the admin who triggered this (they already got toast)
    } = await req.json();

    console.log("Notifying admins of new booking:", { 
      appointment_id, 
      client_name, 
      service_name 
    });

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error("Missing Supabase configuration");
    }

    // Create Supabase client with service role
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get all admin user IDs from user_roles table
    const { data: adminRoles, error: rolesError } = await supabase
      .from("user_roles")
      .select("user_id")
      .eq("role", "admin");

    if (rolesError) {
      console.error("Error fetching admin roles:", rolesError);
      throw rolesError;
    }

    if (!adminRoles || adminRoles.length === 0) {
      console.log("No admins found");
      return new Response(
        JSON.stringify({ message: "No admins found", notified: 0 }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Found ${adminRoles.length} admin(s)`);

    // Get admin profile IDs (we need profile.id, not auth user_id)
    const adminUserIds = adminRoles.map(r => r.user_id);
    
    const { data: adminProfiles, error: profilesError } = await supabase
      .from("profiles")
      .select("id, user_id")
      .in("user_id", adminUserIds);

    if (profilesError) {
      console.error("Error fetching admin profiles:", profilesError);
      throw profilesError;
    }

    if (!adminProfiles || adminProfiles.length === 0) {
      console.log("No admin profiles found");
      return new Response(
        JSON.stringify({ message: "No admin profiles found", notified: 0 }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Filter out the admin who triggered this notification
    const profilesToNotify = exclude_user_id 
      ? adminProfiles.filter(p => p.id !== exclude_user_id)
      : adminProfiles;

    if (profilesToNotify.length === 0) {
      console.log("No other admins to notify");
      return new Response(
        JSON.stringify({ message: "No other admins to notify", notified: 0 }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get push subscriptions for these admins
    const adminProfileIds = profilesToNotify.map(p => p.id);
    
    const { data: subscriptions, error: subsError } = await supabase
      .from("push_subscriptions")
      .select("user_id")
      .in("user_id", adminProfileIds);

    if (subsError) {
      console.error("Error fetching subscriptions:", subsError);
    }

    // Get unique user IDs with push enabled
    const usersWithPush = [...new Set(subscriptions?.map(s => s.user_id) || [])];
    
    console.log(`${usersWithPush.length} admin(s) have push notifications enabled`);

    if (usersWithPush.length === 0) {
      return new Response(
        JSON.stringify({ 
          message: "No admins have push notifications enabled", 
          notified: 0,
          admins_found: adminProfiles.length
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Send push notification to each admin with push enabled
    const notificationResults = [];
    
    for (const userId of usersWithPush) {
      try {
        const { data, error } = await supabase.functions.invoke("send-push-notification", {
          body: {
            user_id: userId,
            title: "📅 Novo Agendamento Pendente",
            body: `${client_name} - ${service_name} em ${date} às ${time}`,
            data: {
              type: "new_appointment",
              appointment_id,
              url: "/admin/agendamentos",
            },
          },
        });

        if (error) {
          console.error(`Error notifying admin ${userId}:`, error);
          notificationResults.push({ userId, success: false, error: error.message });
        } else {
          console.log(`Notified admin ${userId}:`, data);
          notificationResults.push({ userId, success: true, sent: data?.sent || 0 });
        }
      } catch (e) {
        console.error(`Exception notifying admin ${userId}:`, e);
        notificationResults.push({ userId, success: false, error: String(e) });
      }
    }

    const successCount = notificationResults.filter(r => r.success).length;

    return new Response(
      JSON.stringify({
        message: `Notified ${successCount} of ${usersWithPush.length} admins`,
        notified: successCount,
        results: notificationResults,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in notify-admins-new-booking:", error);
    return new Response(
      JSON.stringify({ error: String(error) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
