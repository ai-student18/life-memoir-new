
import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import NavBar from "@/components/NavBar";
import QuestionnaireForm from "@/components/questionnaire/QuestionnaireForm";
import QuestionnaireProgress from "@/components/questionnaire/QuestionnaireProgress";
import { Question, Answer } from "@/types/questionnaire";
import { Loader2, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

const BiographyQuestionnaire = () => {
  const { biographyId } = useParams<{ biographyId: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [answers, setAnswers] = useState<Record<string, Answer>>({});
  
  // Fetch the biography details
  const { data: biography, isLoading: biographyLoading } = useQuery({
    queryKey: ["biography", biographyId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("biographies")
        .select("*")
        .eq("id", biographyId)
        .single();

      if (error) throw error;
      return data;
    },
  });

  // Fetch all questions
  const { data: questions, isLoading: questionsLoading } = useQuery({
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

  // Fetch existing answers for this biography
  const { data: existingAnswers, isLoading: answersLoading } = useQuery({
    queryKey: ["biography_answers", biographyId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("biography_answers")
        .select("*")
        .eq("biography_id", biographyId);

      if (error) throw error;
      return data as Answer[];
    },
    enabled: !!biographyId,
  });

  // Update an answer
  const saveAnswerMutation = useMutation({
    mutationFn: async (answer: Answer) => {
      const { data, error } = await supabase
        .from("biography_answers")
        .upsert({ ...answer }, { onConflict: "biography_id,question_id" })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      // Update local state with new answer
      setAnswers((prev) => ({
        ...prev,
        [data.question_id]: data,
      }));
      
      // Invalidate related queries to refetch the data
      queryClient.invalidateQueries({ queryKey: ["biography_answers", biographyId] });
    },
  });

  // Process existing answers into a map for easy access
  useEffect(() => {
    if (existingAnswers) {
      const answersMap = existingAnswers.reduce((acc, answer) => {
        acc[answer.question_id] = answer;
        return acc;
      }, {} as Record<string, Answer>);
      
      setAnswers(answersMap);
    }
  }, [existingAnswers]);

  // Function to handle saving an answer
  const handleSaveAnswer = async (answer: Answer) => {
    await saveAnswerMutation.mutateAsync(answer);
  };

  // Function to handle completing the questionnaire - refactored to use async/await
  const handleComplete = async () => {
    toast.success("השאלון הושלם בהצלחה!");
    
    try {
      // Update biography status to indicate questionnaire completion
      const { error } = await supabase
        .from("biographies")
        .update({ status: "QuestionnaireCompleted" })
        .eq("id", biographyId);
        
      if (error) {
        throw error;
      }
      
      // Navigate to dashboard after successful update
      navigate(`/dashboard`);
      
    } catch (error) {
      console.error("Error updating biography status:", error);
      toast.error("שגיאה בעדכון סטטוס הביוגרפיה");
    }
  };

  const isLoading = biographyLoading || questionsLoading || answersLoading;
  
  // Count answered questions
  const answeredCount = existingAnswers?.filter(a => a.answer_text?.trim())?.length || 0;

  if (isLoading) {
    return (
      <div className="min-h-screen bg-white">
        <NavBar />
        <div className="container mx-auto px-4 py-8 pt-24">
          <div className="flex justify-center items-center h-64">
            <Loader2 className="h-8 w-8 animate-spin text-[#5B9AA0]" />
          </div>
        </div>
      </div>
    );
  }

  if (!biography) {
    return (
      <div className="min-h-screen bg-white">
        <NavBar />
        <div className="container mx-auto px-4 py-8 pt-24">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-memoir-darkGray mb-4">הביוגרפיה לא נמצאה</h2>
            <Button 
              onClick={() => navigate("/dashboard")} 
              className="bg-[#5B9AA0] hover:bg-[#4a8288] text-white"
            >
              <ArrowLeft className="ml-2 h-4 w-4" />
              חזרה ללוח הבקרה
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      <NavBar />
      
      <div className="container mx-auto px-4 py-8 pt-24">
        <div className="mb-8">
          <Button 
            variant="outline" 
            onClick={() => navigate("/dashboard")}
            className="mb-6"
          >
            <ArrowLeft className="ml-2 h-4 w-4" />
            חזרה ללוח הבקרה
          </Button>
          
          <h1 className="text-3xl font-bold text-memoir-darkGray mb-2">
            {biography.title} - שאלון
          </h1>
          <p className="text-gray-600">
            ענה על השאלות הבאות כדי לבנות את סיפור החיים שלך
          </p>
        </div>
        
        {questions && questions.length > 0 && (
          <>
            <QuestionnaireProgress 
              questions={questions} 
              answeredCount={answeredCount} 
            />
            
            <QuestionnaireForm
              questions={questions}
              biographyId={biographyId || ''}
              answers={answers}
              onSaveAnswer={handleSaveAnswer}
              onComplete={handleComplete}
            />
          </>
        )}
      </div>
    </div>
  );
};

export default BiographyQuestionnaire;
