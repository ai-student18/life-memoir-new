
import { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.39.7";
import { Logger } from "../_shared/logging.ts";
import { generateWithOpenAI } from "./openai.ts";
import { extractChapterContent } from "./parser.ts";
import { BiographyRequest, QuestionAnswer, TOCChapter, BiographySettings, GeneratedDraftResult } from "./types.ts";
import { 
  verifyBiographyOwnership, 
  fetchBiographyAnswers, 
  fetchApprovedTOC, 
  fetchBiographySettings,
  saveBiographyDraft,
  updateBiographyStatus
} from "./database.ts";

/**
 * Main handler for the generate-biography-draft function
 */
export async function handleGenerateBiographyDraft(
  req: Request,
  supabase: SupabaseClient,
  userId: string,
  logger: Logger
): Promise<GeneratedDraftResult> {
  // Parse request body
  let requestBody;
  try {
    requestBody = await req.json();
    logger.log("Request body:", JSON.stringify(requestBody));
  } catch (error) {
    logger.error("Error parsing request body:", error);
    throw new Error("Invalid request body");
  }
  
  const { biographyId } = requestBody as BiographyRequest;
  if (!biographyId) {
    logger.error("Missing biographyId in request");
    throw new Error("Biography ID is required");
  }

  logger.log(`Processing request for biography: ${biographyId}`);

  // Verify biography exists and belongs to the user
  await verifyBiographyOwnership(supabase, biographyId, userId, logger);

  // Get all answers for the biography
  const filteredQaData = await fetchBiographyAnswers(supabase, biographyId, logger);

  // Get the TOC structure for the biography
  const structure = await fetchApprovedTOC(supabase, biographyId, logger);

  // Get biography settings
  const settings = await fetchBiographySettings(supabase, biographyId, logger);

  // Generate the biography text
  const generatedText = await generateBiographyText(
    filteredQaData,
    structure,
    settings,
    logger
  );

  // Extract chapter content from the generated text
  const chapters = extractChapterContent({
    structure,
    generatedText,
    logger
  });
  
  // Save the draft to the database
  const draft = await saveBiographyDraft(
    supabase,
    biographyId,
    generatedText,
    chapters,
    logger
  );

  // Update the biography status to indicate draft generation
  await updateBiographyStatus(supabase, biographyId, logger);

  logger.log("Function completed successfully");
  
  return {
    message: "Biography draft generated successfully",
    draftId: draft.id,
    chapters: Object.keys(chapters).length,
    full_content_length: generatedText.length,
  };
}

/**
 * Generate biography text using OpenAI
 */
async function generateBiographyText(
  qaData: QuestionAnswer[],
  structure: TOCChapter[],
  settings: BiographySettings,
  logger: Logger
): Promise<string> {
  const { language, tone, writing_style } = settings;
  
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
        qaData
      )}`,
    },
  ];

  const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");
  if (!OPENAI_API_KEY) {
    logger.error("Missing OpenAI API key");
    throw new Error("OpenAI API key is not configured");
  }

  // Generate the biography text
  return await generateWithOpenAI({
    messages,
    config: {
      apiKey: OPENAI_API_KEY,
      model: "gpt-4o-mini", // Using a modern, cost-effective model
      temperature: 0.7,
      maxTokens: 4000,
      logger
    }
  });
}

