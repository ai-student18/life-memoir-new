
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

/**
 * Custom hook to generate TOC for a biography
 * @returns Object containing generate function and loading state
 */
export const useTOCGenerate = () => {
  const [isGenerating, setIsGenerating] = useState(false);

  const generateTOC = async (biographyId: string): Promise<void> => {
    if (!biographyId) {
      toast({
        title: "שגיאה",
        description: "נדרש מזהה ביוגרפיה",
        variant: "destructive"
      });
      return;
    }

    setIsGenerating(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("לא נמצא מידע על המשתמש");

      // Check if there are any answers for this biography
      const { data: answers, error: answersError } = await supabase
        .from("biography_answers")
        .select("id")
        .eq("biography_id", biographyId)
        .limit(1);
        
      if (answersError) throw answersError;
      
      if (!answers || answers.length === 0) {
        toast({
          title: "שגיאה",
          description: "לא נמצאו תשובות לביוגרפיה זו. אנא ענה על לפחות שאלה אחת.",
          variant: "destructive"
        });
        return;
      }

      // Generate the TOC using the edge function
      const { error } = await supabase.functions.invoke("generate-toc", {
        body: { biographyId }
      });

      if (error) throw error;

      toast({
        title: "הצלחה",
        description: "תוכן העניינים נוצר בהצלחה",
      });

      // Navigate to the TOC page
      window.location.href = `/biography/${biographyId}/toc`;

    } catch (error) {
      console.error("Error generating TOC:", error);
      toast({
        title: "שגיאה",
        description: "נכשל ביצירת תוכן העניינים",
        variant: "destructive"
      });
    } finally {
      setIsGenerating(false);
    }
  };

  return { generateTOC, isGenerating };
};
