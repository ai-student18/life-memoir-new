
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import "https://deno.land/x/xhr@0.1.0/mod.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Using the Gemini API key stored in Supabase secrets
const API_KEY = Deno.env.get("GEMINI_API_KEY");

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { text, systemInstruction = 'Enhance this life story with improved narrative flow, correct any grammar or spelling errors, and make it more engaging to read.' } = await req.json();
    
    if (!text) {
      return new Response(
        JSON.stringify({ error: "No text provided" }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log("Enhancing story with system instruction:", systemInstruction);

    // Call the Gemini API
    const response = await fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': API_KEY,
      },
      body: JSON.stringify({
        contents: [
          {
            role: 'user',
            parts: [
              {
                text: `${systemInstruction}\n\nOriginal text:\n${text}`
              }
            ]
          }
        ],
        generationConfig: {
          temperature: 0.7,
          topK: 40,
          topP: 0.95,
          maxOutputTokens: 8192,
        },
      })
    });

    const data = await response.json();
    
    if (!response.ok) {
      console.error("Error response from Gemini API:", data);
      return new Response(
        JSON.stringify({ error: "Failed to enhance story", details: data }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    let enhancedText = "";
    if (data.candidates && data.candidates.length > 0 && 
        data.candidates[0].content && data.candidates[0].content.parts) {
      enhancedText = data.candidates[0].content.parts[0].text;
    } else {
      console.error("Unexpected response structure:", JSON.stringify(data));
      return new Response(
        JSON.stringify({ error: "Invalid response from Gemini API" }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ enhancedText }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error("Error processing request:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Unknown error occurred" }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
