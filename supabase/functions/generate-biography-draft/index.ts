
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { initSupabaseClient } from "../_shared/supabase-client.ts";
import { corsHeaders } from "../_shared/cors.ts";

// OpenAI API configuration
const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");
const OPENAI_API_URL = "https://api.openai.com/v1/chat/completions";

interface BiographyRequest {
  biographyId: string;
}

interface OpenAIMessage {
  role: "system" | "user" | "assistant";
  content: string;
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
  console.log("[MAIN] Starting generate-biography-draft function");

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
      console.error("[AUTH] Missing Authorization header");
      throw new Error("Authorization header is required");
    }

    // Verify user is authenticated
    const token = authHeader.replace("Bearer ", "");
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser(token);

    if (userError || !user) {
      console.error("[AUTH] Error getting user:", userError?.message);
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Parse request body
    let requestBody;
    try {
      requestBody = await req.json();
      console.log("[MAIN] Request body:", JSON.stringify(requestBody));
    } catch (error) {
      console.error("[MAIN] Error parsing request body:", error.message);
      return new Response(JSON.stringify({ error: "Invalid request body" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    
    const { biographyId } = requestBody as BiographyRequest;
    if (!biographyId) {
      console.error("[MAIN] Missing biographyId in request");
      return new Response(JSON.stringify({ error: "Biography ID is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log(`[MAIN] Processing request for biography: ${biographyId}`);

    // Verify biography exists and belongs to the user
    const { data: biography, error: biographyError } = await supabase
      .from("biographies")
      .select("*")
      .eq("id", biographyId)
      .eq("user_id", user.id)
      .single();

    if (biographyError || !biography) {
      console.error("[DB] Error verifying biography:", biographyError?.message);
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

    console.log(`[MAIN] Successfully verified biography exists: ${biographyId}`);

    // Get all answers for the biography
    console.log(`[MAIN] Fetching answers for biography: ${biographyId}`);
    const { data: answers, error: answersError } = await supabase
      .from("biography_answers")
      .select("*, biography_questions!inner(question_text)")
      .eq("biography_id", biographyId);

    if (answersError) {
      console.error("[DB] Error fetching answers:", answersError.message);
      return new Response(
        JSON.stringify({ error: "Failed to fetch biography answers" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    console.log(`[MAIN] Successfully fetched ${answers.length} answers`);

    // Get the TOC structure for the biography
    console.log(`[MAIN] Fetching TOC for biography: ${biographyId}`);
    const { data: tocData, error: tocError } = await supabase
      .from("biography_toc")
      .select("*")
      .eq("biography_id", biographyId)
      .eq("approved", true)
      .single();

    if (tocError) {
      console.error("[DB] Error fetching TOC:", tocError.message);
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
    console.log(`[MAIN] Successfully fetched TOC with ${structure.length} chapters`);

    // Get biography settings
    console.log(`[MAIN] Fetching settings for biography: ${biographyId}`);
    const { data: settings, error: settingsError } = await supabase
      .from("biography_settings")
      .select("*")
      .eq("biography_id", biographyId)
      .maybeSingle();

    if (settingsError) {
      console.error("[DB] Error fetching settings:", settingsError.message);
      // Continue without settings if not found
    }

    const language = settings?.language || "Hebrew";
    const tone = settings?.tone || "neutral";
    const writing_style = settings?.writing_style || "academic";

    console.log(`[MAIN] Using language: ${language}, tone: ${tone}, style: ${writing_style}`);

    // Format question and answer data
    const qaData: QuestionAnswer[] = answers.map((answer) => ({
      question: answer.biography_questions.question_text,
      answer: answer.answer_text || "",
    }));

    // Filter out empty answers
    const filteredQaData = qaData.filter(
      (qa) => qa.answer && qa.answer.trim() !== ""
    );
    console.log(`[MAIN] Formatted ${filteredQaData.length} QA pairs with content`);

    // Print a sample of QA data for debugging
    if (filteredQaData.length > 0) {
      console.log("[MAIN] Sample QA pair:", JSON.stringify(filteredQaData[0]));
    }

    // Build the OpenAI prompt
    const messages: OpenAIMessage[] = [
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

    if (!OPENAI_API_KEY) {
      console.error("[OpenAI] Missing API key");
      return new Response(
        JSON.stringify({ error: "OpenAI API key is not configured" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Call OpenAI API
    console.log("[OpenAI] Calling API to generate biography draft");
    console.log("[OpenAI] Request messages structure:", messages.map(m => ({role: m.role, contentLength: m.content.length})));
    
    const openaiResponse = await fetch(OPENAI_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini", // Using a modern, cost-effective model
        messages,
        temperature: 0.7,
        max_tokens: 4000,
      }),
    });

    if (!openaiResponse.ok) {
      let errorDetail = "";
      try {
        const errorJson = await openaiResponse.json();
        errorDetail = JSON.stringify(errorJson);
      } catch (e) {
        errorDetail = await openaiResponse.text();
      }
      
      console.error("[OpenAI] API error:", errorDetail);
      return new Response(
        JSON.stringify({ error: `Failed to generate biography draft: ${errorDetail}` }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const result = await openaiResponse.json();
    const generatedText = result.choices[0].message.content;
    console.log("[OpenAI] Successfully generated biography text");
    console.log("[OpenAI] First 100 characters of text:", generatedText.substring(0, 100));

    // Process the generated text to separate into chapters
    const chapters: Record<string, string> = {};
    
    try {
      console.log("[Parser] Starting to extract chapters from the generated text");
      structure.forEach((chapter, index) => {
        const chapterIndex = index + 1;
        const chapterTitle = chapter.title.replace(/^Chapter \d+:\s*/, "").trim();
        
        // Create regex patterns to find chapter headings with increased flexibility
        const patterns = [
          new RegExp(`Chapter ${chapterIndex}[.:] ?${chapterTitle}`, "i"),
          new RegExp(`${chapterIndex}\\. ?${chapterTitle}`, "i"),
          new RegExp(`\\b${chapterTitle}\\b`, "i"),
          new RegExp(`Chapter ${chapterIndex}[^a-zA-Z0-9]*`, "i"),
          new RegExp(`^${chapterIndex}[.:]`, "m"),
        ];
        
        console.log(`[Parser] Looking for chapter: "${chapter.title}" using ${patterns.length} patterns`);
        
        // Find where the current chapter starts in the text
        let chapterStartMatch = null;
        let patternUsed = null;
        
        for (let i = 0; i < patterns.length; i++) {
          const pattern = patterns[i];
          const match = generatedText.match(pattern);
          if (match) {
            chapterStartMatch = match;
            patternUsed = i;
            console.log(`[Parser] Found match for chapter ${chapterIndex} using pattern ${i}: "${match[0]}"`);
            break;
          }
        }
        
        if (!chapterStartMatch) {
          console.log(`[Parser] Could not find start of chapter ${chapterIndex}: ${chapterTitle}`);
          // Add fallback content for chapters that couldn't be found
          chapters[chapter.title] = `Chapter ${chapterIndex}: ${chapterTitle}\n\n[Content not available]`; 
          return;
        }
        
        const chapterStart = chapterStartMatch.index;
        let chapterEnd = generatedText.length;
        
        // Check if there's a next chapter to determine the end
        if (index < structure.length - 1) {
          const nextChapter = structure[index + 1];
          const nextChapterIndex = index + 2;
          const nextChapterTitle = nextChapter.title.replace(/^Chapter \d+:\s*/, "").trim();
          
          // Similar patterns for next chapter
          const nextChapterPatterns = [
            new RegExp(`Chapter ${nextChapterIndex}[.:] ?${nextChapterTitle}`, "i"),
            new RegExp(`${nextChapterIndex}\\. ?${nextChapterTitle}`, "i"),
            new RegExp(`\\b${nextChapterTitle}\\b`, "i"),
            new RegExp(`Chapter ${nextChapterIndex}[^a-zA-Z0-9]*`, "i"),
            new RegExp(`^${nextChapterIndex}[.:]`, "m"),
          ];
          
          for (const pattern of nextChapterPatterns) {
            const match = generatedText.match(pattern);
            if (match && match.index > chapterStart) {
              chapterEnd = match.index;
              console.log(`[Parser] Found end of chapter ${chapterIndex} at match: "${match[0]}"`);
              break;
            }
          }
        }
        
        // Extract the chapter content
        const chapterContent = generatedText.substring(chapterStart, chapterEnd).trim();
        console.log(`[Parser] Extracted chapter ${chapterIndex} content (${chapterContent.length} chars)`);
        
        // Add the chapter content to the chapters object
        chapters[chapter.title] = chapterContent;
      });
    } catch (error) {
      console.error("[Parser] Error extracting chapters:", error.message);
      // Even if chapter parsing fails, continue with the full content
    }

    console.log(`[Parser] Successfully extracted ${Object.keys(chapters).length} chapters`);
    
    // Log a sample chapter for debugging
    const sampleChapterTitle = Object.keys(chapters)[0];
    if (sampleChapterTitle) {
      console.log(`[Parser] Sample chapter "${sampleChapterTitle}" (first 100 chars):`, 
        chapters[sampleChapterTitle].substring(0, 100));
    }

    // Ensure chapter_content is not empty - fallback to full content if needed
    if (Object.keys(chapters).length === 0) {
      console.log("[Parser] No chapters could be extracted, creating fallback chapters");
      structure.forEach((chapter, index) => {
        chapters[chapter.title] = `Chapter ${index + 1}: ${chapter.title}\n\n${
          index === 0 ? generatedText : "[Content not available]"
        }`;
      });
    }

    // Save the draft to the database
    console.log(`[DB] Saving biography draft for biography: ${biographyId}`);
    
    const draftData = {
      biography_id: biographyId,
      full_content: generatedText,
      chapter_content: chapters,
      is_ai_generated: true,
    };
    
    console.log("[DB] Draft data structure:", {
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
      console.error("[DB] Error saving draft:", draftError.message);
      return new Response(
        JSON.stringify({ error: "Failed to save biography draft" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }
    
    console.log("[DB] Draft saved successfully with ID:", draft.id);

    // Update the biography status to indicate draft generation
    console.log(`[DB] Updating biography status to 'DraftGenerated'`);
    const { error: updateError } = await supabase
      .from("biographies")
      .update({ 
        status: "DraftGenerated", 
        updated_at: new Date().toISOString() 
      })
      .eq("id", biographyId);
      
    if (updateError) {
      console.error("[DB] Error updating biography status:", updateError.message);
      // Continue anyway since the draft is saved
    }

    console.log("[MAIN] Function completed successfully");
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
    console.error("[ERROR] Unhandled exception:", error.message, error.stack);
    return new Response(
      JSON.stringify({ error: "Failed to generate biography draft: " + error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
