
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

export const useCompleteBiography = () => {
  const navigate = useNavigate();

  const completeBiography = async (biographyId: string) => {
    try {
      // Update biography status to indicate questionnaire completion
      const { error } = await supabase
        .from("biographies")
        .update({ status: "QuestionnaireCompleted" })
        .eq("id", biographyId);
        
      if (error) {
        throw error;
      }
      
      // Show success message
      toast.success("השאלון הושלם בהצלחה!");
      
      // Navigate to dashboard after successful update
      navigate(`/dashboard`);
      
    } catch (error) {
      console.error("Error updating biography status:", error);
      toast.error("שגיאה בעדכון סטטוס הביוגרפיה");
    }
  };

  return { completeBiography };
};
