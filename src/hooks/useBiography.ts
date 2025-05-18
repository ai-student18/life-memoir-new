
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export const useBiography = (biographyId: string | undefined) => {
  return useQuery({
    queryKey: ["biography", biographyId],
    queryFn: async () => {
      if (!biographyId) throw new Error("No biography ID provided");
      
      const { data, error } = await supabase
        .from("biographies")
        .select("*")
        .eq("id", biographyId)
        .single();

      if (error) throw error;
      return data;
    },
    enabled: !!biographyId,
  });
};
