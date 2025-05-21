
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { initSupabaseClient } from "../_shared/supabase-client.ts";
import { corsHeaders } from "../_shared/cors.ts";
import { createLogger } from "../_shared/logging.ts";
import { extractChapterContent } from "./parser.ts";
import { generateWithOpenAI } from "./openai.ts";

const logger = createLogger("generate-biography-draft");

interface BiographyRequest {
  biographyId: string;
}

interface QuestionAnswer {
  question: string;
  answer: string;
}

interface TOCChapter {
  title: string;
  description: string;
}

serve(async (req) => {
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
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    logger.log(`User authenticated: ${user.id}`);

    // Parse request body
    let requestBody;
    try {
      requestBody = await req.json();
      logger.log("Request body:", JSON.stringify(requestBody));
    } catch (error) {
      logger.error("Error parsing request body:", error);
      return new Response(JSON.stringify({ error: "Invalid request body" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    
    const { biographyId } = requestBody as BiographyRequest;
    if (!biographyId) {
      logger.error("Missing biographyId in request");
      return new Response(JSON.stringify({ error: "Biography ID is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    logger.log(`Processing request for biography: ${biographyId}`);

    // Verify biography exists and belongs to the user
    const { data: biography, error: biographyError } = await supabase
      .from("biographies")
      .select("*")
      .eq("id", biographyId)
      .eq("user_id", user.id)
      .single();

    if (biographyError || !biography) {
      logger.error("Error verifying biography:", biographyError?.message);
      return new Response(
        JSON.stringify({
          error: "Biography not found or you don't have permission to access it",
        }),
        {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    logger.log(`Successfully verified biography exists: ${biographyId}`);

    // Get all answers for the biography
    logger.log(`Fetching answers for biography: ${biographyId}`);
    const { data: answers, error: answersError } = await supabase
      .from("biography_answers")
      .select("*, biography_questions!inner(question_text)")
      .eq("biography_id", biographyId);

    if (answersError) {
      logger.error("Error fetching answers:", answersError.message);
      return new Response(
        JSON.stringify({ error: "Failed to fetch biography answers" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    logger.log(`Successfully fetched ${answers.length} answers`);

    // Get the TOC structure for the biography
    logger.log(`Fetching TOC for biography: ${biographyId}`);
    const { data: tocData, error: tocError } = await supabase
      .from("biography_toc")
      .select("*")
      .eq("biography_id", biographyId)
      .eq("approved", true)
      .single();

    if (tocError) {
      logger.error("Error fetching TOC:", tocError.message);
      return new Response(
        JSON.stringify({
          error: "Failed to fetch approved TOC. Has the TOC been approved?",
        }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const structure = tocData?.structure as TOCChapter[];
    if (!structure || !Array.isArray(structure) || structure.length === 0) {
      logger.error("Invalid TOC structure:", structure);
      return new Response(
        JSON.stringify({
          error: "Invalid or empty TOC structure. Please ensure TOC is generated and approved.",
        }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    logger.log(`Successfully fetched TOC with ${structure.length} chapters`);

    // Get biography settings
    logger.log(`Fetching settings for biography: ${biographyId}`);
    const { data: settings, error: settingsError } = await supabase
      .from("biography_settings")
      .select("*")
      .eq("biography_id", biographyId)
      .maybeSingle();

    if (settingsError) {
      logger.error("Error fetching settings:", settingsError.message);
      // Continue without settings if not found
    }

    const language = settings?.language || "Hebrew";
    const tone = settings?.tone || "neutral";
    const writing_style = settings?.writing_style || "academic";

    logger.log(`Using language: ${language}, tone: ${tone}, style: ${writing_style}`);

    // Format question and answer data
    const qaData: QuestionAnswer[] = answers.map((answer) => ({
      question: answer.biography_questions.question_text,
      answer: answer.answer_text || "",
    }));

    // Filter out empty answers
    const filteredQaData = qaData.filter(
      (qa) => qa.answer && qa.answer.trim() !== ""
    );
    logger.log(`Formatted ${filteredQaData.length} QA pairs with content`);

    // Print a sample of QA data for debugging
    if (filteredQaData.length > 0) {
      logger.log("Sample QA pair:", JSON.stringify(filteredQaData[0]));
    }

    // Check if we have enough QA data to generate a draft
    if (filteredQaData.length < 3) {
      logger.warn(`Only ${filteredQaData.length} QA pairs available - this might result in low-quality draft`);
    }

    // Build the OpenAI prompt
    const messages = [
      {
        role: "system",
        content: `You are a professional biographer specializing in creating compelling life stories. 
        Write a biography in ${language} language using a ${tone} tone and ${writing_style} writing style.
        Structure the biography according to the provided table of contents, with each chapter covering the topics described.
        Use all the information from the provided questions and answers to create a coherent, engaging narrative.
        Return ONLY the biography text, without any additional commentary, notes, or explanations.`,
      },
      {
        role: "system",
        content: `Table of Contents:\n${structure
          .map((chapter, index) => `${index + 1}. ${chapter.title}: ${chapter.description}`)
          .join("\n")}`,
      },
      {
        role: "user",
        content: `Here are the questions and answers to use for creating the biography: ${JSON.stringify(
          filteredQaData
        )}`,
      },
    ];

    const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");
    if (!OPENAI_API_KEY) {
      logger.error("Missing OpenAI API key");
      return new Response(
        JSON.stringify({ error: "OpenAI API key is not configured" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Generate the biography text
    const generatedText = await generateWithOpenAI({
      messages,
      config: {
        apiKey: OPENAI_API_KEY,
        model: "gpt-4o-mini", // Using a modern, cost-effective model
        temperature: 0.7,
        maxTokens: 4000,
        logger
      }
    });

    // Extract chapter content from the generated text
    const chapters = extractChapterContent({
      structure,
      generatedText,
      logger
    });
    
    // Save the draft to the database
    logger.log(`Saving biography draft for biography: ${biographyId}`);
    
    const draftData = {
      biography_id: biographyId,
      full_content: generatedText,
      chapter_content: chapters,
      is_ai_generated: true,
    };
    
    logger.log("Draft data structure:", {
      biography_id: draftData.biography_id,
      full_content_length: draftData.full_content.length,
      chapter_count: Object.keys(draftData.chapter_content).length,
      is_ai_generated: draftData.is_ai_generated
    });
    
    const { data: draft, error: draftError } = await supabase
      .from("biography_drafts")
      .insert(draftData)
      .select("*")
      .single();

    if (draftError) {
      logger.error("Error saving draft:", draftError.message);
      return new Response(
        JSON.stringify({ error: "Failed to save biography draft" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }
    
    logger.log("Draft saved successfully with ID:", draft.id);

    // Update the biography status to indicate draft generation
    logger.log(`Updating biography status to 'DraftGenerated'`);
    const { error: updateError } = await supabase
      .from("biographies")
      .update({ 
        status: "DraftGenerated", 
        updated_at: new Date().toISOString() 
      })
      .eq("id", biographyId);
      
    if (updateError) {
      logger.error("Error updating biography status:", updateError.message);
      // Continue anyway since the draft is saved
    }

    logger.log("Function completed successfully");
    return new Response(
      JSON.stringify({
        message: "Biography draft generated successfully",
        draftId: draft.id,
        chapters: Object.keys(chapters).length,
        full_content_length: generatedText.length,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    logger.error("Unhandled exception:", error);
    return new Response(
      JSON.stringify({ error: "Failed to generate biography draft: " + error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
