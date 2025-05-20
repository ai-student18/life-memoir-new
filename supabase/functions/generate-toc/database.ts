
import { initSupabaseClient } from "../_shared/supabase-client.ts";

// Fetch answers for a biography with better error handling
export async function fetchAnswers(biographyId: string): Promise<any[]> {
  const supabase = initSupabaseClient();
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

    // Check if we have at least one non-empty answer
    const answersWithContent = data.filter(answer => answer.answer_text && answer.answer_text.trim() !== "");
    
    if (answersWithContent.length === 0) {
      console.error("No answers with content found for this biography");
      throw new Error("No answers with content found for this biography");
    }
    
    console.log(`Found ${answersWithContent.length} answers with content for biography ${biographyId} out of ${data.length} total answers`);
    return data;
  } catch (error) {
    console.error(`Error in fetchAnswers: ${error.message}`);
    throw error;
  }
}

// Fetch questions with better error handling
export async function fetchQuestions(): Promise<Record<string, string>> {
  const supabase = initSupabaseClient();
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

// Save the TOC to the database
export async function saveTOCToDatabase(
  biographyId: string,
  tocData: any[]
): Promise<void> {
  const supabase = initSupabaseClient();
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
