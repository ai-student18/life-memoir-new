
import { corsHeaders } from "../_shared/cors.ts";

const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY") || 
                       Deno.env.get("GEMINI-API-KEY");

Deno.serve(async (req) => {
  // Handle CORS for preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log("Checking Gemini API key configuration");
    
    // Check if API key is present
    if (!GEMINI_API_KEY) {
      console.log("No Gemini API key found in environment variables");
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
      console.log("Attempting to validate Gemini API key");
      const response = await fetch(
        "https://generativelanguage.googleapis.com/v1beta/models",
        {
          method: "GET",
          headers: {
            "Authorization": `Bearer ${GEMINI_API_KEY}`,
            "Content-Type": "application/json"
          }
        }
      );

      const responseData = await response.json();
      
      if (!response.ok) {
        console.error("Gemini API key validation failed:", responseData);
        let errorMessage = "Invalid Gemini API key";
        
        if (responseData.error && responseData.error.message) {
          errorMessage = `Invalid Gemini API key: ${responseData.error.message}`;
        }
        
        return new Response(JSON.stringify({
          isConfigured: false,
          message: errorMessage,
          statusCode: response.status,
          details: responseData
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
