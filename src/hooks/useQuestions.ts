
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Question } from "@/types/questionnaire";

export const useQuestions = () => {
  return useQuery({
    queryKey: ["biography_questions"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("biography_questions")
        .select("*")
        .order("question_order", { ascending: true });

      if (error) throw error;
      return data as Question[];
    },
  });
};
