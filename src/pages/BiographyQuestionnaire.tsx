
import { useParams } from "react-router-dom";
import NavBar from "@/components/NavBar";
import QuestionnaireForm from "@/components/questionnaire/QuestionnaireForm";
import QuestionnaireProgress from "@/components/questionnaire/QuestionnaireProgress";
import QuestionnaireLoading from "@/components/questionnaire/QuestionnaireLoading";
import QuestionnaireNotFound from "@/components/questionnaire/QuestionnaireNotFound";
import QuestionnaireHeader from "@/components/questionnaire/QuestionnaireHeader";
import { useBiography } from "@/hooks/useBiography";
import { useQuestions } from "@/hooks/useQuestions";
import { useQuestionnaireAnswers } from "@/hooks/useQuestionnaireAnswers";
import { useCompleteBiography } from "@/hooks/useCompleteBiography";
import { Answer } from "@/types/questionnaire";
import { useTOCGenerate } from "@/hooks/useTOCGenerate";
import { Button } from "@/components/ui/button";
import { BookText } from "lucide-react";
import { useState } from "react";
import { toast } from "@/hooks/use-toast";
import { useGeminiApiKey } from "@/hooks/useGeminiApiKey";
import { ErrorDisplay } from "@/components/ui/error-display";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";

const BiographyQuestionnaire = () => {
  const { biographyId } = useParams<{ biographyId: string }>();
  const [isGeneratingTOC, setIsGeneratingTOC] = useState(false);
  const [generationError, setGenerationError] = useState<string | null>(null);
  
  // Custom hooks to fetch and manage data
  const { data: biography, isLoading: biographyLoading } = useBiography(biographyId);
  const { data: questions, isLoading: questionsLoading } = useQuestions();
  const { answers, answeredCount, isLoading: answersLoading, saveAnswer } = useQuestionnaireAnswers(biographyId);
  const { completeBiography } = useCompleteBiography();
  const { generateTOC, isGenerating, error: tocError } = useTOCGenerate();
  const { isKeyConfigured, isChecking, error: keyError } = useGeminiApiKey();

  // Check if data is still loading
  const isLoading = biographyLoading || questionsLoading || answersLoading || isChecking;
  
  // Show loading state while data is being fetched
  if (isLoading) {
    return <QuestionnaireLoading />;
  }

  // Show error state if biography is not found
  if (!biography) {
    return <QuestionnaireNotFound />;
  }

  // Function to handle saving an answer
  const handleSaveAnswer = async (answer: Answer) => {
    await saveAnswer(answer);
  };

  // Function to handle completing the questionnaire
  const handleComplete = async () => {
    if (biographyId) {
      await completeBiography(biographyId);
    }
  };

  // Function to handle generating TOC
  const handleGenerateTOC = async () => {
    if (!biographyId) return;
    
    setGenerationError(null);
    
    if (answeredCount === 0) {
      const errorMsg = "יש לענות על לפחות שאלה אחת לפני יצירת תוכן העניינים";
      setGenerationError(errorMsg);
      toast({
        title: "לא ניתן ליצור תוכן עניינים",
        description: errorMsg,
        variant: "destructive"
      });
      return;
    }
    
    if (!isKeyConfigured) {
      const errorMsg = "מפתח ה-API של Gemini לא מוגדר במערכת. אנא פנה למנהל המערכת.";
      setGenerationError(errorMsg);
      toast({
        title: "מפתח API חסר",
        description: errorMsg,
        variant: "destructive"
      });
      return;
    }
    
    setIsGeneratingTOC(true);
    try {
      await generateTOC(biographyId);
    } catch (error) {
      if (error instanceof Error) {
        setGenerationError(error.message);
      } else {
        setGenerationError("אירעה שגיאה לא צפויה בעת יצירת תוכן העניינים");
      }
    } finally {
      setIsGeneratingTOC(false);
    }
  };

  // Combine all potential errors
  const hasError = keyError || tocError || generationError;

  return (
    <div className="min-h-screen bg-white">
      <NavBar />
      
      <div className="container mx-auto px-4 py-8 pt-24">
        <QuestionnaireHeader title={biography.title} />
        
        {!isKeyConfigured && !isChecking && (
          <Alert variant="destructive" className="mb-6">
            <AlertTitle>אין מפתח API לשירות Gemini</AlertTitle>
            <AlertDescription>
              מפתח ה-API של Gemini אינו מוגדר במערכת. לא ניתן ליצור תוכן עניינים אוטומטי.
              אנא פנה למנהל המערכת כדי להגדיר את המפתח.
            </AlertDescription>
          </Alert>
        )}
        
        {hasError && (
          <div className="mb-6">
            <ErrorDisplay
              title="שגיאה בעת יצירת תוכן העניינים"
              message={hasError}
              variant="card"
            />
          </div>
        )}
        
        {questions && questions.length > 0 && (
          <>
            <QuestionnaireProgress 
              questions={questions} 
              answeredCount={answeredCount} 
            />
            
            <div className="flex justify-end mb-6">
              <Button 
                variant="outline"
                className="flex items-center gap-2" 
                onClick={handleGenerateTOC}
                disabled={isGeneratingTOC || answeredCount === 0 || isGenerating || !isKeyConfigured}
              >
                {isGeneratingTOC || isGenerating ? (
                  <>
                    <span className="animate-spin mr-2">⟳</span>
                    מייצר תוכן עניינים...
                  </>
                ) : (
                  <>
                    <BookText className="h-4 w-4" />
                    צור תוכן עניינים
                  </>
                )}
              </Button>
            </div>
            
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
