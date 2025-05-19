
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
        .select("id, answer_text")
        .eq("biography_id", biographyId);
        
      if (answersError) {
        console.error("Error checking for answers:", answersError);
        throw answersError;
      }
      
      // Check if there are any answers with content
      const answersWithContent = answers?.filter(a => a.answer_text?.trim()) || [];
      
      if (!answers || answers.length === 0 || answersWithContent.length === 0) {
        toast({
          title: "שגיאה",
          description: "לא נמצאו תשובות לביוגרפיה זו. אנא ענה על לפחות שאלה אחת.",
          variant: "destructive"
        });
        return;
      }

      console.log(`Invoking generate-toc with biography ID: ${biographyId}`);
      console.log(`Found ${answersWithContent.length} answers with content out of ${answers.length} total answers`);

      // Generate the TOC using the edge function
      const { data, error } = await supabase.functions.invoke("generate-toc", {
        body: { biographyId }
      });

      if (error) {
        console.error("Edge function invocation error:", error);
        throw new Error(`Edge function error: ${error.message}`);
      }

      if (!data) {
        console.error("No data returned from edge function");
        throw new Error("No data returned from edge function");
      }

      if (data?.error) {
        console.error("TOC generation error:", data.error);
        throw new Error(data.error);
      }

      toast({
        title: "הצלחה",
        description: "תוכן העניינים נוצר בהצלחה",
      });

      // Navigate to the TOC page
      window.location.href = `/biography/${biographyId}/toc`;

    } catch (error) {
      console.error("Error generating TOC:", error);
      let errorMessage = "נכשל ביצירת תוכן העניינים";
      
      if (error instanceof Error) {
        errorMessage = `שגיאה: ${error.message}`;
      }
      
      toast({
        title: "שגיאה",
        description: errorMessage,
        variant: "destructive"
      });
    } finally {
      setIsGenerating(false);
    }
  };

  return { generateTOC, isGenerating };
};
