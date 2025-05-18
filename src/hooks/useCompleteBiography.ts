import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { useState } from "react";
import { showErrorToast, showSuccessToast } from "@/utils/errorHandling";
import { safeAsync } from "@/utils/errorHandler";
import { PostgrestError } from "@supabase/supabase-js";

export const useCompleteBiography = () => {
  const navigate = useNavigate();
  const [isCompleting, setIsCompleting] = useState(false);

  const completeBiography = async (biographyId: string | undefined) => {
    if (!biographyId) {
      showErrorToast("Biography ID is missing. Cannot complete.", "Error");
      return;
    }
    
    setIsCompleting(true);
    
    const [data, error] = await safeAsync(
      supabase
        .from("biographies")
        .update({ status: "QuestionnaireCompleted", updated_at: new Date().toISOString() })
        .eq("id", biographyId)
        .select()
        .single() // Assuming you want to get the updated record back
        .then(({ data, error }) => {
          if (error) throw error;
          if (!data) throw new Error("Failed to update biography, no data returned.");
          return data;
        }),
      {
        errorMessage: "Failed to mark biography as complete",
        showToast: false // Custom handling in then/catch or here
      }
    );

    setIsCompleting(false);

    if (error) {
      // safeAsync would have already logged the error to console
      // Show a specific toast for this operation's failure
      showErrorToast(error, "Error Updating Biography Status");
    } else {
      showSuccessToast("Questionnaire completed successfully!");
      navigate(`/dashboard`);
    }
    // Return data or error if needed by the caller
    return { data, error }; 
  };

  return { completeBiography, isCompleting };
};
