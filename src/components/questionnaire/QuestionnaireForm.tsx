
import { useState } from "react";
import { useForm } from "react-hook-form";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { toast } from "sonner";
import { ChevronLeft, ChevronRight, Save } from "lucide-react";
import { Question, Answer } from "@/types/questionnaire";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

interface QuestionnaireFormProps {
  questions: Question[];
  biographyId: string;
  answers: Record<string, Answer>;
  onSaveAnswer: (answer: Answer) => Promise<void>;
  onComplete: () => void;
}

const QuestionnaireForm = ({
  questions,
  biographyId,
  answers,
  onSaveAnswer,
  onComplete,
}: QuestionnaireFormProps) => {
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [isSaving, setIsSaving] = useState(false);
  const navigate = useNavigate();
  
  const form = useForm({
    defaultValues: {
      answer: answers[questions[currentQuestionIndex]?.id]?.answer_text || "",
    },
  });

  const currentQuestion = questions[currentQuestionIndex];

  // Update form values when current question changes
  useState(() => {
    if (currentQuestion) {
      form.reset({
        answer: answers[currentQuestion.id]?.answer_text || "",
      });
    }
  });

  const handleSaveAnswer = async (data: { answer: string }) => {
    if (!currentQuestion) return;
    
    setIsSaving(true);
    
    try {
      const answer: Answer = {
        biography_id: biographyId,
        question_id: currentQuestion.id,
        answer_text: data.answer,
      };
      
      await onSaveAnswer(answer);
      toast.success("תשובה נשמרה בהצלחה");
    } catch (error) {
      console.error("Error saving answer:", error);
      toast.error("שגיאה בשמירת התשובה");
    } finally {
      setIsSaving(false);
    }
  };

  const handleNext = async () => {
    await form.handleSubmit(handleSaveAnswer)();
    
    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
      form.reset({
        answer: answers[questions[currentQuestionIndex + 1]?.id]?.answer_text || "",
      });
    } else {
      // We're at the last question
      onComplete();
    }
  };

  const handlePrevious = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(currentQuestionIndex - 1);
      form.reset({
        answer: answers[questions[currentQuestionIndex - 1]?.id]?.answer_text || "",
      });
    }
  };

  const handleSaveAndExit = async () => {
    await form.handleSubmit(handleSaveAnswer)();
    navigate(`/dashboard`);
  };

  if (!currentQuestion) {
    return <div>אין שאלות זמינות</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold text-memoir-darkGray">
          שאלה {currentQuestionIndex + 1} מתוך {questions.length}
        </h3>
        <Button variant="outline" onClick={handleSaveAndExit}>
          <Save className="ml-2 h-4 w-4" />
          שמור וצא
        </Button>
      </div>

      <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100">
        <Form {...form}>
          <form className="space-y-4" onSubmit={form.handleSubmit(handleSaveAnswer)}>
            <FormField
              control={form.control}
              name="answer"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xl font-medium text-memoir-darkGray">
                    {currentQuestion.question_text}
                  </FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="הכנס את התשובה שלך כאן..."
                      className="min-h-[200px] text-right"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-between pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={handlePrevious}
                disabled={currentQuestionIndex === 0}
              >
                <ChevronRight className="ml-2 h-4 w-4" />
                שאלה קודמת
              </Button>
              
              <div className="flex space-x-2">
                <Button
                  type="submit"
                  variant="outline"
                  disabled={isSaving}
                  className="ml-2"
                >
                  {isSaving ? "שומר..." : "שמור תשובה"}
                </Button>
                
                <Button
                  type="button"
                  onClick={handleNext}
                  className="bg-[#FFD217] hover:bg-[#f8ca00] text-memoir-darkGray"
                >
                  {currentQuestionIndex < questions.length - 1 ? (
                    <>
                      שאלה הבאה
                      <ChevronLeft className="mr-2 h-4 w-4" />
                    </>
                  ) : (
                    "סיום והמשך ליצירת תוכן העניינים"
                  )}
                </Button>
              </div>
            </div>
          </form>
        </Form>
      </div>

      <div className="flex justify-center">
        <div className="flex space-x-2">
          {questions.map((_, index) => (
            <div
              key={index}
              className={`w-3 h-3 rounded-full ${
                index === currentQuestionIndex
                  ? "bg-[#FFD217]"
                  : "bg-gray-300"
              }`}
            />
          ))}
        </div>
      </div>
    </div>
  );
};

export default QuestionnaireForm;
