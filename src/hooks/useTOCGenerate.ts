
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
      if (!session) {
        toast({
          title: "שגיאה",
          description: "לא נמצא מידע על המשתמש, נדרשת התחברות",
          variant: "destructive"
        });
        return;
      }

      // Check if there are any answers for this biography
      const { data: answers, error: answersError } = await supabase
        .from("biography_answers")
        .select("id")
        .eq("biography_id", biographyId)
        .limit(1);
        
      if (answersError) {
        console.error("Error checking for answers:", answersError);
        throw answersError;
      }
      
      if (!answers || answers.length === 0) {
        toast({
          title: "שגיאה",
          description: "לא נמצאו תשובות לביוגרפיה זו. אנא ענה על לפחות שאלה אחת.",
          variant: "destructive"
        });
        return;
      }

      // Generate the TOC using the edge function
      const { data, error } = await supabase.functions.invoke("generate-toc", {
        body: { biographyId }
      });

      if (error) {
        console.error("Edge function error:", error);
        throw error;
      }

      if (data?.error) {
        console.error("TOC generation error:", data.error);
        toast({
          title: "שגיאה",
          description: data.error || "נכשל ביצירת תוכן העניינים",
          variant: "destructive"
        });
        return;
      }

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
        description: error instanceof Error ? error.message : "נכשל ביצירת תוכן העניינים",
        variant: "destructive"
      });
    } finally {
      setIsGenerating(false);
    }
  };

  return { generateTOC, isGenerating };
};
