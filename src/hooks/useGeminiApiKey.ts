
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

/**
 * Hook to check if the Gemini API key is configured
 */
export const useGeminiApiKey = () => {
  const [isKeyConfigured, setIsKeyConfigured] = useState<boolean | null>(null);
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    const checkApiKey = async () => {
      try {
        const { error } = await supabase.functions.invoke("check-gemini-key", {
          body: {}
        });
        
        setIsKeyConfigured(!error);
      } catch (error) {
        console.error("Error checking Gemini API key:", error);
        setIsKeyConfigured(false);
      } finally {
        setIsChecking(false);
      }
    };
    
    checkApiKey();
  }, []);

  return { isKeyConfigured, isChecking };
};
