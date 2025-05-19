
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
  return createClient(SUPABASE_URL!, SUPABASE_ANON_KEY!);
}

// Validate request and extract biography ID
async function validateRequest(req: Request): Promise<string> {
  // Check authentication
  const authHeader = req.headers.get("Authorization");
  if (!authHeader) {
    throw new Error("Unauthorized");
  }

  // Get the request body
  const requestData: RequestBody = await req.json();
  const { biographyId } = requestData;

  if (!biographyId) {
    throw new Error("Biography ID is required");
  }
  
  return biographyId;
}

// Fetch answers for a biography
async function fetchAnswers(supabase: any, biographyId: string): Promise<any[]> {
  const { data, error } = await supabase
    .from("biography_answers")
    .select("question_id, answer_text")
    .eq("biography_id", biographyId);

  if (error) {
    console.error("Error fetching answers:", error);
    throw new Error("Failed to fetch answers");
  }

  if (!data || data.length === 0) {
    throw new Error("No answers found for this biography");
  }
  
  return data;
}

// Fetch questions
async function fetchQuestions(supabase: any): Promise<Record<string, string>> {
  const { data, error } = await supabase
    .from("biography_questions")
    .select("id, question_text");

  if (error) {
    console.error("Error fetching questions:", error);
    throw new Error("Failed to fetch questions");
  }

  // Create a map of question IDs to question texts
  return data.reduce((acc: Record<string, string>, q: any) => {
    acc[q.id] = q.question_text;
    return acc;
  }, {});
}

// Format the question-answer pairs
function formatQAPairs(
  answers: any[],
  questionsMap: Record<string, string>
): QuestionAnswer[] {
  return answers
    .map(answer => ({
      question: questionsMap[answer.question_id],
      answer: answer.answer_text || ""
    }))
    .filter(qa => qa.answer.trim() !== "");
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

// Call Gemini API to generate the TOC
async function generateTOCWithGemini(
  formattedQA: QuestionAnswer[]
): Promise<any[]> {
  if (!GEMINI_API_KEY) {
    throw new Error("Gemini API key not configured");
  }

  const systemPrompt = createSystemPrompt();
  const userContext = JSON.stringify(formattedQA);

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
    const errorData = await geminiResponse.json();
    console.error("Gemini API error:", errorData);
    throw new Error("Error from Gemini API");
  }

  const geminiData = await geminiResponse.json();
  return parseTOCResponse(geminiData);
}

// Parse the Gemini API response to extract the TOC
function parseTOCResponse(geminiData: any): any[] {
  try {
    const textContent = geminiData.candidates[0].content.parts[0].text;
    // Extract just the JSON part
    const jsonMatch = textContent.match(/(\[[\s\S]*\])/);
    if (jsonMatch && jsonMatch[0]) {
      return JSON.parse(jsonMatch[0]);
    } else {
      return JSON.parse(textContent);
    }
  } catch (e) {
    console.error("Error parsing Gemini response:", e);
    // Provide a fallback TOC if parsing fails
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
  const { error: tocError } = await supabase
    .from("biography_toc")
    .upsert({
      biography_id: biographyId,
      structure: tocData,
      approved: false,
      updated_at: new Date().toISOString()
    }, {
      onConflict: "biography_id"
    });

  if (tocError) {
    console.error("Error saving TOC:", tocError);
    throw new Error("Failed to save TOC");
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
    const supabase = initSupabaseClient();
    
    // Validate request and get biography ID
    const biographyId = await validateRequest(req);
    console.log("Generating TOC for biography:", biographyId);
    
    // Fetch answers and questions
    const answers = await fetchAnswers(supabase, biographyId);
    const questionsMap = await fetchQuestions(supabase);
    
    // Format question-answer pairs
    const formattedQA = formatQAPairs(answers, questionsMap);
    console.log("Found", formattedQA.length, "question-answer pairs with content");
    
    // Check if we have any non-empty answers
    if (formattedQA.length === 0) {
      return new Response(JSON.stringify({ error: "No non-empty answers found for this biography" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }
    
    // Generate TOC using Gemini API
    console.log("Calling Gemini API to generate TOC");
    const tocData = await generateTOCWithGemini(formattedQA);
    console.log("Successfully parsed TOC data:", tocData.length, "chapters");
    
    // Save TOC to the database
    await saveTOCToDatabase(supabase, biographyId, tocData);
    console.log("TOC generation completed successfully");
    
    return new Response(JSON.stringify({ success: true, toc: tocData }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  } catch (error) {
    console.error("Unexpected error:", error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "An unexpected error occurred" }), {
      status: error instanceof Error && error.message === "Unauthorized" ? 401 : 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }
});
