
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.7";
import { corsHeaders } from "../_shared/cors.ts";

const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY") || 
                       Deno.env.get("GEMINI-API-KEY");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY");

Deno.serve(async (req) => {
  // Handle CORS for preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log("Checking Gemini API key configuration");
    
    // Check if API key is present
    if (!GEMINI_API_KEY) {
      console.log("Gemini API key is not configured");
      return new Response(JSON.stringify({
        isConfigured: false,
        message: "Gemini API key is not configured in the environment"
      }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    // Validate Gemini API key with a lightweight call
    try {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models?key=${GEMINI_API_KEY}`,
        {
          method: "GET",
          headers: {
            "Content-Type": "application/json"
          }
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        console.error("Gemini API key validation failed:", errorData);
        return new Response(JSON.stringify({
          isConfigured: false,
          message: `Invalid Gemini API key: ${errorData?.error?.message || response.statusText}`,
          statusCode: response.status
        }), {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
      }

      console.log("Gemini API key is valid");
      return new Response(JSON.stringify({
        isConfigured: true,
        message: "Gemini API key is valid"
      }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
      
    } catch (error) {
      console.error("Error validating Gemini API key:", error);
      return new Response(JSON.stringify({
        isConfigured: false,
        message: `Error validating Gemini API key: ${error.message}`
      }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }
    
  } catch (error) {
    console.error("Unexpected error:", error);
    return new Response(JSON.stringify({
      error: error instanceof Error ? error.message : "An unexpected error occurred"
    }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }
});
