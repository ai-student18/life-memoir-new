
import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import NavBar from "@/components/NavBar";
import { useBiography } from "@/hooks/useBiography";
import { useChapters } from "@/hooks/useChapters";
import { Card, CardContent } from "@/components/ui/card";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import ChapterEditor from "@/components/editor/ChapterEditor";
import ChapterSelector from "@/components/editor/ChapterSelector";
import { ErrorDisplay } from "@/components/ui/error-display";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { BiographyStatus } from "@/types/biography";
import { toast } from "@/hooks/use-toast";
import { ArrowLeft } from "lucide-react";

const BiographyEditor = () => {
  const { biographyId } = useParams<{ biographyId: string }>();
  const navigate = useNavigate();
  const { data: biography, isLoading: biographyLoading, error: biographyError, refetch: refetchBiography } = useBiography(biographyId);
  const { 
    chapters, 
    isLoading: chaptersLoading, 
    error: chaptersError,
    saveChapter,
    refetch: refetchChapters
  } = useChapters(biographyId);
  
  const [activeChapterId, setActiveChapterId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);

  // Set the biography status to InProgress when editor is opened
  useEffect(() => {
    const updateBiographyStatus = async () => {
      if (biographyId && biography && biography.status !== BiographyStatus.InProgress) {
        setIsSaving(true);
        try {
          await supabase
            .from("biographies")
            .update({
              status: BiographyStatus.InProgress,
              updated_at: new Date().toISOString()
            })
            .eq("id", biographyId);
          
          // Refetch biography to get updated status
          refetchBiography();
        } catch (error) {
          console.error("Error updating biography status:", error);
        } finally {
          setIsSaving(false);
        }
      }
    };

    if (biography) {
      updateBiographyStatus();
    }
  }, [biography, biographyId, refetchBiography]);

  useEffect(() => {
    // Set the first chapter as active by default when chapters are loaded
    if (chapters && chapters.length > 0 && !activeChapterId) {
      setActiveChapterId(chapters[0].id);
    }
  }, [chapters, activeChapterId]);

  const activeChapter = chapters?.find(chapter => chapter.id === activeChapterId);
  
  const isLoading = biographyLoading || chaptersLoading;
  const error = biographyError || chaptersError;

  const handleSaveAndExit = async () => {
    setIsSaving(true);
    try {
      if (biographyId) {
        if (activeChapter) {
          await saveChapter(activeChapter);
        }
        toast({
          title: "Success",
          description: "Progress saved successfully",
        });
        navigate("/dashboard");
      }
    } catch (error) {
      console.error("Error saving progress:", error);
      toast({
        title: "Error",
        description: "Failed to save progress",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveSuccess = () => {
    setLastSaved(new Date());
  };

  const handleNavigateTOC = () => {
    // Save current chapter before navigating
    if (activeChapter) {
      saveChapter(activeChapter).then(() => {
        navigate(`/biography/${biographyId}/toc`);
      }).catch(error => {
        console.error("Error saving chapter before navigation:", error);
        toast({
          title: "Warning",
          description: "Chapter might not be fully saved before navigating",
          variant: "destructive",
        });
      });
    } else {
      navigate(`/biography/${biographyId}/toc`);
    }
  };

  const handleNavigateDraft = () => {
    // Save current chapter before navigating
    if (activeChapter) {
      saveChapter(activeChapter).then(() => {
        navigate(`/biography/${biographyId}/draft`);
      }).catch(error => {
        console.error("Error saving chapter before navigation:", error);
        toast({
          title: "Warning",
          description: "Chapter might not be fully saved before navigating",
          variant: "destructive",
        });
      });
    } else {
      navigate(`/biography/${biographyId}/draft`);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-white">
        <NavBar />
        <div className="container mx-auto px-4 py-8 pt-24 flex justify-center items-center">
          <LoadingSpinner size="lg" text="Loading biography..." />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-white">
        <NavBar />
        <div className="container mx-auto px-4 py-8 pt-24">
          <ErrorDisplay 
            title="Error Loading Biography" 
            message={error.message}
            onRetry={() => {
              if (biographyError) {
                window.location.reload();
              } else if (chaptersError) {
                refetchChapters();
              }
            }}
          />
        </div>
      </div>
    );
  }

  if (!biography) {
    return (
      <div className="min-h-screen bg-white">
        <NavBar />
        <div className="container mx-auto px-4 py-8 pt-24">
          <ErrorDisplay
            title="Biography not found"
            message="The biography you're looking for doesn't exist or you don't have access to it."
            onRetry={() => navigate("/dashboard")}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      <NavBar />
      
      <div className="container mx-auto px-4 py-8 pt-24">
        <div className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center">
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => navigate("/dashboard")}
                className="mr-4"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Dashboard
              </Button>
              
              {lastSaved && (
                <span className="text-sm text-muted-foreground">
                  Last saved: {lastSaved.toLocaleTimeString()}
                </span>
              )}
            </div>
            
            <div className="flex space-x-2">
              <Button 
                variant="outline"
                onClick={handleNavigateTOC}
              >
                Edit TOC
              </Button>
              
              <Button 
                variant="outline"
                onClick={handleNavigateDraft}
              >
                View Draft
              </Button>
              
              <Button 
                onClick={handleSaveAndExit}
                disabled={isSaving}
                className="bg-[#5B9AA0] hover:bg-[#4a8a90] text-white"
              >
                {isSaving ? "Saving..." : "Save & Exit"}
              </Button>
            </div>
          </div>
          
          <h1 className="text-3xl font-bold mb-2">{biography.title}</h1>
          <p className="text-gray-600">Write your biography chapter by chapter</p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="md:col-span-1">
            <ChapterSelector 
              chapters={chapters || []}
              activeChapterId={activeChapterId}
              setActiveChapterId={setActiveChapterId}
            />
          </div>
          
          <div className="md:col-span-3">
            {activeChapter ? (
              <ChapterEditor 
                chapter={activeChapter} 
                onSave={saveChapter}
                onSaveSuccess={handleSaveSuccess}
              />
            ) : (
              <Card className="p-6 text-center">
                <CardContent>
                  <p className="text-gray-500">Select a chapter to start writing</p>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default BiographyEditor;
