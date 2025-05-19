
import { corsHeaders } from "../_shared/cors.ts";

// Note: Make sure the key in Supabase secrets uses the correct name format
const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY") || Deno.env.get("GEMINI-API-KEY");

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    if (!GEMINI_API_KEY) {
      return new Response(JSON.stringify({ 
        error: "Gemini API key not configured",
        isConfigured: false 
      }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    // Test if the API key works by making a simple request
    try {
      const testResponse = await fetch("https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-goog-api-key": GEMINI_API_KEY,
        },
        body: JSON.stringify({
          contents: [{ parts: [{ text: "hello" }] }],
          generationConfig: { maxOutputTokens: 1 }
        })
      });
      
      if (!testResponse.ok) {
        const errorData = await testResponse.json();
        console.error("Gemini API test failed:", errorData);
        return new Response(JSON.stringify({ 
          error: "Gemini API key is invalid or has issues",
          details: errorData,
          isConfigured: false 
        }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
      }
    } catch (testError) {
      console.error("Error testing Gemini API key:", testError);
      return new Response(JSON.stringify({ 
        error: "Error validating Gemini API key",
        isConfigured: false 
      }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    return new Response(JSON.stringify({ 
      isConfigured: true 
    }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  } catch (error) {
    console.error("Unexpected error checking Gemini API key:", error);
    return new Response(JSON.stringify({ 
      error: "Unexpected error checking Gemini API key",
      isConfigured: false
    }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }
});
