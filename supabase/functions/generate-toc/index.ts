
import { corsHeaders } from "../_shared/cors.ts";
import { RequestBody, QuestionAnswer, TOCChapter, APIResponse } from "./types.ts";
import { fetchAnswers, fetchQuestions, saveTOCToDatabase } from "./database.ts";
import { formatQAPairs, generateTOCWithOpenAI } from "./openai.ts";

/**
 * Main handler for the generate-toc edge function
 */
Deno.serve(async (req: Request) => {
  console.log("[MAIN] Starting generate-toc function");
  
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Extract biographyId from request
    const { biographyId } = await extractBiographyId(req);
    console.log(`[MAIN] Processing request for biography: ${biographyId}`);
    
    // Validate OpenAI API key
    const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");
    if (!OPENAI_API_KEY) {
      console.error("[MAIN ERROR] OpenAI API key not configured");
      return createErrorResponse("OpenAI API key is not configured", "MISSING_API_KEY", 400);
    }
    
    // Step 1: Fetch all answers
    let answers;
    try {
      answers = await fetchAnswers(biographyId);
      console.log(`[MAIN] Successfully fetched ${answers.length} answers`);
    } catch (error) {
      console.error(`[MAIN ERROR] Failed to fetch answers: ${error.message}`);
      return createErrorResponse(
        error.message,
        error.message.includes("No answers found") ? "NO_ANSWERS" : "ANSWERS_ERROR",
        error.message.includes("No answers found") ? 400 : 500
      );
    }
    
    // Step 2: Fetch questions
    let questionsMap;
    try {
      questionsMap = await fetchQuestions();
      console.log(`[MAIN] Successfully fetched questions map with ${Object.keys(questionsMap).length} questions`);
    } catch (error) {
      console.error(`[MAIN ERROR] Failed to fetch questions: ${error.message}`);
      return createErrorResponse(error.message, "QUESTIONS_ERROR", 500);
    }
    
    // Step 3: Format QA pairs (filter out empty answers)
    const formattedQA = formatQAPairs(answers, questionsMap);
    console.log(`[MAIN] Formatted ${formattedQA.length} QA pairs with content`);
    
    // Step 4: Check if we have any valid answers
    if (formattedQA.length === 0) {
      console.error("[MAIN ERROR] No answers with content found");
      return createErrorResponse(
        "No answers with content found for this biography",
        "EMPTY_ANSWERS",
        400
      );
    }
    
    // Step 5: Generate TOC using OpenAI
    let tocData: TOCChapter[];
    try {
      console.log("[MAIN] Calling OpenAI to generate TOC");
      tocData = await generateTOCWithOpenAI(formattedQA);
      console.log(`[MAIN] Successfully generated TOC with ${tocData.length} chapters`);
    } catch (error) {
      console.error(`[MAIN ERROR] Failed to generate TOC: ${error.message}`);
      return createErrorResponse(
        `Error generating TOC: ${error.message}`,
        "OPENAI_API_ERROR",
        500
      );
    }
    
    // Step 6: Save TOC to database
    try {
      await saveTOCToDatabase(biographyId, tocData);
      console.log("[MAIN] Successfully saved TOC to database");
    } catch (error) {
      console.error(`[MAIN ERROR] Failed to save TOC: ${error.message}`);
      return createErrorResponse(
        `Error saving TOC: ${error.message}`,
        "DATABASE_ERROR",
        500
      );
    }
    
    // Step 7: Return success response
    console.log("[MAIN] Function completed successfully");
    return createSuccessResponse(tocData);
    
  } catch (error) {
    // Handle any uncaught errors
    console.error(`[MAIN ERROR] Unexpected error: ${error.message}`);
    return createErrorResponse(
      `Unexpected error: ${error.message}`,
      "UNKNOWN_ERROR",
      500
    );
  }
});

/**
 * Extract biographyId from request body
 */
async function extractBiographyId(req: Request): Promise<string> {
  try {
    const body = await req.json();
    
    if (!body || !body.biographyId) {
      console.error("[MAIN ERROR] Missing biographyId in request");
      throw new Error("Biography ID is required");
    }
    
    return body.biographyId;
  } catch (error) {
    console.error(`[MAIN ERROR] Failed to extract biographyId: ${error.message}`);
    throw new Error(`Failed to extract biography ID: ${error.message}`);
  }
}

/**
 * Create standardized error response
 */
function createErrorResponse(message: string, code: string, status: number): Response {
  const response: APIResponse = {
    success: false,
    error: message,
    code: code
  };
  
  return new Response(JSON.stringify(response), {
    status: status,
    headers: { ...corsHeaders, "Content-Type": "application/json" }
  });
}

/**
 * Create standardized success response
 */
function createSuccessResponse(tocData: TOCChapter[]): Response {
  const response: APIResponse = {
    success: true,
    toc: tocData
  };
  
  return new Response(JSON.stringify(response), {
    status: 200,
    headers: { ...corsHeaders, "Content-Type": "application/json" }
  });
}
