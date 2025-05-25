
import { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.39.7";
import { Logger } from "../_shared/logging.ts";
import { QuestionAnswer, TOCChapter, BiographySettings } from "./types.ts";

/**
 * Database operations for the generate-biography-draft function
 */
export async function verifyBiographyOwnership(
  supabase: SupabaseClient,
  biographyId: string,
  userId: string,
  logger: Logger
) {
  logger.log(`Verifying biography ownership for ID: ${biographyId}`);
  
  const { data: biography, error: biographyError } = await supabase
    .from("biographies")
    .select("*")
    .eq("id", biographyId)
    .eq("user_id", userId)
    .single();

  if (biographyError || !biography) {
    logger.error("Error verifying biography ownership:", biographyError?.message);
    throw new Error("Biography not found or you don't have permission to access it");
  }

  logger.log(`Successfully verified biography exists: ${biographyId}`);
  return biography;
}

export async function fetchBiographyAnswers(
  supabase: SupabaseClient,
  biographyId: string,
  logger: Logger
): Promise<QuestionAnswer[]> {
  logger.log(`Fetching answers for biography: ${biographyId}`);
  
  const { data: answers, error: answersError } = await supabase
    .from("biography_answers")
    .select("*, biography_questions!inner(question_text)")
    .eq("biography_id", biographyId);

  if (answersError) {
    logger.error("Error fetching answers:", answersError.message);
    throw new Error("Failed to fetch biography answers");
  }

  logger.log(`Successfully fetched ${answers.length} answers`);

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

  return filteredQaData;
}

export async function fetchApprovedTOC(
  supabase: SupabaseClient,
  biographyId: string,
  logger: Logger
): Promise<TOCChapter[]> {
  logger.log(`Fetching TOC for biography: ${biographyId}`);
  
  const { data: tocData, error: tocError } = await supabase
    .from("biography_toc")
    .select("*")
    .eq("biography_id", biographyId)
    .eq("approved", true)
    .single();

  if (tocError) {
    logger.error("Error fetching TOC:", tocError.message);
    throw new Error("Failed to fetch approved TOC. Has the TOC been approved?");
  }

  const structure = tocData?.structure as TOCChapter[];
  if (!structure || !Array.isArray(structure) || structure.length === 0) {
    logger.error("Invalid TOC structure:", structure);
    throw new Error("Invalid or empty TOC structure. Please ensure TOC is generated and approved.");
  }

  logger.log(`Successfully fetched TOC with ${structure.length} chapters`);
  return structure;
}

export async function fetchBiographySettings(
  supabase: SupabaseClient,
  biographyId: string,
  logger: Logger
): Promise<BiographySettings> {
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
  
  return { language, tone, writing_style };
}

export async function saveBiographyDraft(
  supabase: SupabaseClient,
  biographyId: string,
  generatedText: string,
  chapters: Record<string, string>,
  logger: Logger
) {
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
    throw new Error("Failed to save biography draft");
  }
  
  logger.log("Draft saved successfully with ID:", draft.id);
  return draft;
}

export async function updateBiographyStatus(
  supabase: SupabaseClient,
  biographyId: string,
  logger: Logger
) {
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
}

