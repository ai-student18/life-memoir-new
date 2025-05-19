
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

/**
 * Hook to check if the Gemini API key is configured
 */
export const useGeminiApiKey = () => {
  const [isKeyConfigured, setIsKeyConfigured] = useState<boolean | null>(null);
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    const checkApiKey = async () => {
      try {
        const { data, error } = await supabase.functions.invoke("check-gemini-key", {
          body: {}
        });
        
        if (error) {
          console.error("Error checking Gemini API key:", error);
          setIsKeyConfigured(false);
        } else {
          setIsKeyConfigured(data?.isConfigured === true);
        }
      } catch (error) {
        console.error("Error checking Gemini API key:", error);
        setIsKeyConfigured(false);
        toast({
          title: "שגיאה בבדיקת מפתח API",
          description: "לא ניתן לבדוק האם מפתח ה-API של Gemini מוגדר במערכת",
          variant: "destructive"
        });
      } finally {
        setIsChecking(false);
      }
    };
    
    checkApiKey();
  }, []);

  return { isKeyConfigured, isChecking };
};
