
import { corsHeaders } from "../_shared/cors.ts";
import { RequestBody } from "./types.ts";
import { fetchAnswers, fetchQuestions, saveTOCToDatabase } from "./database.ts";
import { formatQAPairs, generateTOCWithOpenAI } from "./openai.ts";

// Extract the biography ID from the request
async function extractBiographyId(req: Request): Promise<string> {
  try {
    const requestData: RequestBody = await req.json();
    const { biographyId } = requestData;

    if (!biographyId) {
      throw new Error("Biography ID is required");
    }
    
    return biographyId;
  } catch (error) {
    console.error("Error extracting biography ID:", error);
    throw new Error(`Failed to extract biography ID: ${error.message}`);
  }
}

// Main handler for the edge function
Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Extract biography ID
    const biographyId = await extractBiographyId(req);
    console.log(`Starting TOC generation for biography: ${biographyId}`);
    
    // Check API key first
    const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");
    if (!OPENAI_API_KEY) {
      const errorMessage = "OpenAI API key is not configured";
      console.error(errorMessage);
      return new Response(JSON.stringify({ error: errorMessage, code: "MISSING_API_KEY" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }
    
    // Fetch answers
    let answers;
    try {
      answers = await fetchAnswers(biographyId);
    } catch (error) {
      const isNoAnswers = error.message.includes("No answers") || error.message.includes("No answers with content");
      return new Response(JSON.stringify({ 
        error: error.message,
        code: isNoAnswers ? "NO_ANSWERS" : "ANSWERS_ERROR"
      }), {
        status: isNoAnswers ? 400 : 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }
    
    // Fetch questions
    let questionsMap;
    try {
      questionsMap = await fetchQuestions();
    } catch (error) {
      return new Response(JSON.stringify({ 
        error: error.message,
        code: "QUESTIONS_ERROR" 
      }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }
    
    // Format question-answer pairs
    const formattedQA = formatQAPairs(answers, questionsMap);
    console.log(`Found ${formattedQA.length} question-answer pairs with content`);
    
    // Check if we have any non-empty answers
    if (formattedQA.length === 0) {
      const errorMessage = "No non-empty answers found for this biography";
      console.error(errorMessage);
      return new Response(JSON.stringify({ error: errorMessage, code: "EMPTY_ANSWERS" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }
    
    // Generate TOC using OpenAI API
    let tocData;
    try {
      console.log("Calling OpenAI API to generate TOC");
      tocData = await generateTOCWithOpenAI(formattedQA);
      console.log(`Successfully generated TOC with ${tocData.length} chapters`);
    } catch (error) {
      console.error("Error generating TOC with OpenAI:", error);
      return new Response(JSON.stringify({ 
        error: error.message,
        code: "OPENAI_API_ERROR",
        details: error instanceof Error ? error.stack : undefined
      }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }
    
    // Save TOC to the database
    try {
      await saveTOCToDatabase(biographyId, tocData);
      console.log("TOC generation completed successfully");
    } catch (error) {
      console.error("Error saving TOC to database:", error);
      return new Response(JSON.stringify({ 
        error: error.message,
        code: "DATABASE_ERROR",
        details: error instanceof Error ? error.stack : undefined
      }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }
    
    return new Response(JSON.stringify({ success: true, toc: tocData }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
    
  } catch (error) {
    // Log the detailed error
    console.error("Error in generate-toc function:", error);
    
    // Determine appropriate status code and error code
    const isClientError = error.message.includes("No answers found") || 
                        error.message.includes("Biography ID is required");
    const statusCode = isClientError ? 400 : 500;
    const errorCode = error.message.includes("No answers found") ? "NO_ANSWERS" : 
                      error.message.includes("Biography ID") ? "INVALID_ID" : "UNKNOWN_ERROR";
    
    // Return a more informative error response
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : "An unexpected error occurred",
      code: errorCode,
      details: error instanceof Error ? error.stack : undefined
    }), {
      status: statusCode,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }
});
