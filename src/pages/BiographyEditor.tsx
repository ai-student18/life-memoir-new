
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

const BiographyEditor = () => {
  const { biographyId } = useParams<{ biographyId: string }>();
  const navigate = useNavigate();
  const { data: biography, isLoading: biographyLoading, error: biographyError } = useBiography(biographyId);
  const { 
    chapters, 
    isLoading: chaptersLoading, 
    error: chaptersError,
    saveChapter,
    refetch: refetchChapters
  } = useChapters(biographyId);
  
  const [activeChapterId, setActiveChapterId] = useState<string | null>(null);

  useEffect(() => {
    // Set the first chapter as active by default when chapters are loaded
    if (chapters && chapters.length > 0 && !activeChapterId) {
      setActiveChapterId(chapters[0].id);
    }
  }, [chapters, activeChapterId]);

  const activeChapter = chapters?.find(chapter => chapter.id === activeChapterId);
  
  const isLoading = biographyLoading || chaptersLoading;
  const error = biographyError || chaptersError;

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
