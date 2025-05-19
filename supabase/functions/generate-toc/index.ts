
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.7";
import { corsHeaders } from "../_shared/cors.ts";

// Note: Make sure the key in Supabase secrets uses the correct name format
const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY") || Deno.env.get("GEMINI-API-KEY");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY");

interface RequestBody {
  biographyId: string;
}

interface QuestionAnswer {
  question: string;
  answer: string;
}

// Initialize Supabase client
function initSupabaseClient() {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    throw new Error("Missing Supabase environment variables");
  }
  return createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
}

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

// Fetch answers for a biography with better error handling
async function fetchAnswers(supabase: any, biographyId: string): Promise<any[]> {
  try {
    console.log(`Fetching answers for biography: ${biographyId}`);
    const { data, error, status } = await supabase
      .from("biography_answers")
      .select("question_id, answer_text")
      .eq("biography_id", biographyId);

    if (error) {
      console.error(`Database error fetching answers (status ${status}):`, error);
      throw new Error(`Database error: ${error.message}`);
    }

    if (!data) {
      console.error("No data returned when fetching answers");
      throw new Error("No data returned when fetching answers");
    }

    if (data.length === 0) {
      console.error("No answers found for this biography");
      throw new Error("No answers found for this biography");
    }
    
    console.log(`Found ${data.length} answers for biography ${biographyId}`);
    return data;
  } catch (error) {
    console.error(`Error in fetchAnswers: ${error.message}`);
    throw error;
  }
}

// Fetch questions with better error handling
async function fetchQuestions(supabase: any): Promise<Record<string, string>> {
  try {
    console.log("Fetching questions");
    const { data, error, status } = await supabase
      .from("biography_questions")
      .select("id, question_text");

    if (error) {
      console.error(`Database error fetching questions (status ${status}):`, error);
      throw new Error(`Database error: ${error.message}`);
    }

    if (!data || data.length === 0) {
      console.error("No questions found in database");
      throw new Error("No questions found in database");
    }

    console.log(`Found ${data.length} questions`);

    // Create a map of question IDs to question texts
    return data.reduce((acc: Record<string, string>, q: any) => {
      acc[q.id] = q.question_text;
      return acc;
    }, {});
  } catch (error) {
    console.error(`Error in fetchQuestions: ${error.message}`);
    throw error;
  }
}

// Format the question-answer pairs
function formatQAPairs(
  answers: any[],
  questionsMap: Record<string, string>
): QuestionAnswer[] {
  try {
    const formatted = answers
      .map(answer => ({
        question: questionsMap[answer.question_id] || "Unknown question",
        answer: answer.answer_text || ""
      }))
      .filter(qa => qa.answer.trim() !== "");
    
    console.log(`Formatted ${formatted.length} QA pairs with content`);
    return formatted;
  } catch (error) {
    console.error(`Error in formatQAPairs: ${error.message}`);
    throw error;
  }
}

// Create the system prompt for TOC generation
function createSystemPrompt(): string {
  return `You are a professional biographer specializing in creating structured table of contents. 
  Create a clear, organized table of contents for a biography based on the provided Q&A session.
  Return ONLY a JSON array of chapters, with each chapter having a 'title' and 'description' field.
  Follow these guidelines:
  - Create 5-10 chapters that flow chronologically or thematically
  - Make chapter titles descriptive and engaging
  - Include brief descriptions that summarize what each chapter will cover
  - Ensure chapters collectively tell a cohesive life story
  - Structure must be valid JSON with no additional text or explanations
  - Format as: [{"title": "Chapter Title", "description": "Brief description"}]`;
}

// Call Gemini API with retry logic
async function generateTOCWithGemini(
  formattedQA: QuestionAnswer[]
): Promise<any[]> {
  if (!GEMINI_API_KEY) {
    console.error("Gemini API key not configured");
    throw new Error("Gemini API key not configured");
  }

  // Maximum number of retries
  const MAX_RETRIES = 2;
  let retries = 0;
  let lastError: Error | null = null;

  while (retries <= MAX_RETRIES) {
    try {
      const systemPrompt = createSystemPrompt();
      const userContext = JSON.stringify(formattedQA);

      console.log(`Calling Gemini API (attempt ${retries + 1}/${MAX_RETRIES + 1})...`);
      console.log(`Using ${formattedQA.length} QA pairs as context`);

      const geminiResponse = await fetch(
        "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-goog-api-key": GEMINI_API_KEY,
          },
          body: JSON.stringify({
            contents: [
              {
                role: "model",
                parts: [{ text: systemPrompt }]
              },
              {
                role: "user",
                parts: [{ text: userContext }]
              }
            ],
            generationConfig: {
              temperature: 0.2,
              topK: 40,
              topP: 0.95,
              maxOutputTokens: 1024,
            }
          })
        }
      );

      if (!geminiResponse.ok) {
        const errorText = await geminiResponse.text();
        console.error(`Gemini API error (${geminiResponse.status}): ${errorText}`);
        
        // If we're not at max retries, try again
        if (retries < MAX_RETRIES) {
          retries++;
          lastError = new Error(`Gemini API returned status ${geminiResponse.status}: ${errorText}`);
          // Exponential backoff
          const delay = Math.pow(2, retries) * 500;
          console.log(`Retrying in ${delay}ms...`);
          await new Promise(resolve => setTimeout(resolve, delay));
          continue;
        }
        
        throw new Error(`Gemini API returned status ${geminiResponse.status}: ${errorText}`);
      }

      const geminiData = await geminiResponse.json();
      console.log("Successfully received response from Gemini API");
      return parseTOCResponse(geminiData);
    } catch (error) {
      console.error(`Error calling Gemini API (attempt ${retries + 1}/${MAX_RETRIES + 1}):`, error);
      
      // If we're not at max retries, try again
      if (retries < MAX_RETRIES) {
        retries++;
        lastError = error instanceof Error ? error : new Error(String(error));
        // Exponential backoff
        const delay = Math.pow(2, retries) * 500;
        console.log(`Retrying in ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
        continue;
      }
      
      // We've exhausted retries, throw the last error
      throw lastError || error;
    }
  }

  // This should never be reached due to the throw in the last iteration,
  // but TypeScript needs it for type safety
  throw lastError || new Error("Failed to generate TOC after retries");
}

// Parse the Gemini API response to extract the TOC
function parseTOCResponse(geminiData: any): any[] {
  try {
    if (!geminiData.candidates || 
        !geminiData.candidates[0] || 
        !geminiData.candidates[0].content || 
        !geminiData.candidates[0].content.parts || 
        !geminiData.candidates[0].content.parts[0]) {
      console.error("Invalid response format from Gemini API:", JSON.stringify(geminiData, null, 2));
      throw new Error("Invalid response format from Gemini API");
    }

    const textContent = geminiData.candidates[0].content.parts[0].text;
    if (!textContent) {
      console.error("Empty text content from Gemini API");
      throw new Error("Empty text content from Gemini API");
    }

    console.log("Raw text response from Gemini:", textContent.substring(0, 100) + "...");
    
    // Extract just the JSON part
    const jsonMatch = textContent.match(/(\[[\s\S]*\])/);
    if (jsonMatch && jsonMatch[0]) {
      try {
        const parsedData = JSON.parse(jsonMatch[0]);
        console.log(`Successfully parsed TOC with ${parsedData.length} chapters`);
        return parsedData;
      } catch (e) {
        console.error("Failed to parse JSON match from Gemini response:", e);
        throw new Error("Failed to parse JSON from Gemini response");
      }
    } else {
      // Try parsing the entire text as JSON
      try {
        const parsedData = JSON.parse(textContent);
        console.log(`Successfully parsed TOC with ${parsedData.length} chapters`);
        return parsedData;
      } catch (e) {
        console.error("Failed to parse JSON from Gemini response:", e);
        throw new Error("Failed to parse JSON from Gemini response");
      }
    }
  } catch (e) {
    console.error("Error parsing Gemini response:", e);
    // Provide a fallback TOC if parsing fails
    console.log("Using fallback TOC due to parsing failure");
    return [
      {
        title: "Chapter 1: Introduction",
        description: "An introduction to the subject's life and background"
      },
      {
        title: "Chapter 2: Early Years",
        description: "The early years and formative experiences"
      },
      {
        title: "Chapter 3: Adult Life",
        description: "Major life events and achievements"
      },
      {
        title: "Chapter 4: Career and Accomplishments",
        description: "Professional achievements and contributions"
      },
      {
        title: "Chapter 5: Legacy and Impact",
        description: "The lasting impact and legacy of the subject"
      }
    ];
  }
}

// Save the TOC to the database
async function saveTOCToDatabase(
  supabase: any,
  biographyId: string,
  tocData: any[]
): Promise<void> {
  try {
    console.log(`Saving TOC data (${tocData.length} chapters) for biography ${biographyId}`);

    // Check if TOC already exists
    const { data: existingTOC, error: checkError } = await supabase
      .from("biography_toc")
      .select("id")
      .eq("biography_id", biographyId)
      .single();
    
    let saveOperation;
    
    if (checkError && checkError.code === 'PGRST116') {
      // TOC doesn't exist, insert new one
      saveOperation = supabase
        .from("biography_toc")
        .insert({
          biography_id: biographyId,
          structure: tocData,
          approved: false,
          updated_at: new Date().toISOString()
        });
    } else {
      // TOC exists, update it
      saveOperation = supabase
        .from("biography_toc")
        .update({
          structure: tocData,
          approved: false,
          updated_at: new Date().toISOString()
        })
        .eq("biography_id", biographyId);
    }
    
    const { error: tocError } = await saveOperation;

    if (tocError) {
      console.error("Error saving TOC:", tocError);
      throw new Error(`Failed to save TOC: ${tocError.message}`);
    }

    // Update the biography progress to 'toc'
    const { error: progressError } = await supabase
      .from("biographies")
      .update({
        progress: "toc",
        status: "TOCGenerated",
        updated_at: new Date().toISOString()
      })
      .eq("id", biographyId);

    if (progressError) {
      console.error("Error updating biography progress:", progressError);
      // Don't throw here, as the TOC is already saved
      console.warn(`Warning: Failed to update biography progress: ${progressError.message}`);
    }
    
    console.log("TOC saved successfully and biography progress updated");
  } catch (error) {
    console.error(`Error in saveTOCToDatabase: ${error.message}`);
    throw error;
  }
}

// Main handler for the edge function
Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Initialize Supabase client
    console.log("Initializing Supabase client");
    const supabase = initSupabaseClient();
    
    // Extract biography ID
    const biographyId = await extractBiographyId(req);
    console.log(`Starting TOC generation for biography: ${biographyId}`);
    
    // Check API key first
    if (!GEMINI_API_KEY) {
      const errorMessage = "Gemini API key is not configured";
      console.error(errorMessage);
      return new Response(JSON.stringify({ error: errorMessage, code: "MISSING_API_KEY" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }
    
    // Fetch answers
    let answers;
    try {
      answers = await fetchAnswers(supabase, biographyId);
    } catch (error) {
      const isNoAnswers = error.message.includes("No answers found");
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
      questionsMap = await fetchQuestions(supabase);
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
    
    // Generate TOC using Gemini API
    let tocData;
    try {
      console.log("Calling Gemini API to generate TOC");
      tocData = await generateTOCWithGemini(formattedQA);
      console.log(`Successfully generated TOC with ${tocData.length} chapters`);
    } catch (error) {
      console.error("Error generating TOC with Gemini:", error);
      return new Response(JSON.stringify({ 
        error: error.message,
        code: "GEMINI_API_ERROR",
        details: error instanceof Error ? error.stack : undefined
      }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }
    
    // Save TOC to the database
    try {
      await saveTOCToDatabase(supabase, biographyId, tocData);
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
