
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { useState } from "react";
import { showErrorToast, showSuccessToast } from "@/utils/errorHandling";

/**
 * Custom hook to handle biography completion logic
 * @returns Object containing complete biography function and loading state
 */
export const useCompleteBiography = () => {
  const navigate = useNavigate();
  const [isCompleting, setIsCompleting] = useState(false);

  /**
   * Updates the biography status to indicate questionnaire completion
   * @param biographyId The ID of the biography to complete
   */
  const completeBiography = async (biographyId: string): Promise<void> => {
    if (!biographyId) {
      showErrorToast("מזהה ביוגרפיה חסר");
      return;
    }
    
    setIsCompleting(true);
    
    try {
      // Update biography status to indicate questionnaire completion
      const { error } = await supabase
        .from("biographies")
        .update({ status: "QuestionnaireCompleted", updated_at: new Date().toISOString() })
        .eq("id", biographyId);
        
      if (error) {
        throw error;
      }
      
      // Show success message
      showSuccessToast("השאלון הושלם בהצלחה!");
      
      // Navigate to dashboard after successful update
      navigate(`/dashboard`);
      
    } catch (error) {
      console.error("Error updating biography status:", error);
      showErrorToast(error, "שגיאה בעדכון סטטוס הביוגרפיה");
    } finally {
      setIsCompleting(false);
    }
  };

  return { completeBiography, isCompleting };
};
