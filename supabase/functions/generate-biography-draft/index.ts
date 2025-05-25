
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { initSupabaseClient } from "../_shared/supabase-client.ts";
import { corsHeaders } from "../_shared/cors.ts";
import { createLogger } from "../_shared/logging.ts";
import { handleGenerateBiographyDraft } from "./handlers.ts";
import { ErrorResponse, GeneratedDraftResult } from "./types.ts";

const logger = createLogger("generate-biography-draft");

serve(async (req: Request) => {
  logger.log("Starting function");

  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: corsHeaders,
    });
  }

  try {
    // Initialize Supabase client with service role to bypass RLS
    const supabase = initSupabaseClient(true);

    // Get JWT token from authorization header
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      logger.error("Missing Authorization header");
      throw new Error("Authorization header is required");
    }

    // Verify user is authenticated
    const token = authHeader.replace("Bearer ", "");
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser(token);

    if (userError || !user) {
      logger.error("Error getting user:", userError?.message);
      return new Response(
        JSON.stringify({ error: "Unauthorized" } as ErrorResponse), 
        {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    logger.log(`User authenticated: ${user.id}`);

    // Process the request
    const result = await handleGenerateBiographyDraft(req, supabase, user.id, logger);
    
    return new Response(
      JSON.stringify(result as GeneratedDraftResult),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    logger.error("Unhandled exception:", error);
    return new Response(
      JSON.stringify({ error: `Failed to generate biography draft: ${error.message}` } as ErrorResponse),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});

