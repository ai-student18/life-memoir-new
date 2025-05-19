import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import NavBar from "@/components/NavBar";
import { useBiography } from "@/hooks/useBiography";
import { useTOC } from "@/hooks/useTOC";
import { useChapters } from "@/hooks/useChapters";
import { Card, CardContent } from "@/components/ui/card";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import ChapterEditor from "@/components/editor/ChapterEditor";
import ChapterSelector from "@/components/editor/ChapterSelector";

const BiographyEditor = () => {
  const { biographyId } = useParams<{ biographyId: string }>();
  const { data: biography, isLoading: biographyLoading } = useBiography(biographyId);
  const { tocData, isLoading: tocLoading } = useTOC(biographyId);
  const { chapters, isLoading: chaptersLoading, saveChapter } = useChapters(biographyId);
  const [activeChapterId, setActiveChapterId] = useState<string | null>(null);

  useEffect(() => {
    // Set the first chapter as active by default when chapters are loaded
    if (chapters && chapters.length > 0 && !activeChapterId) {
      setActiveChapterId(chapters[0].id);
    }
  }, [chapters, activeChapterId]);

  const activeChapter = chapters?.find(chapter => chapter.id === activeChapterId);

  if (biographyLoading || tocLoading || chaptersLoading) {
    return (
      <div className="min-h-screen bg-white">
        <NavBar />
        <div className="container mx-auto px-4 py-8 pt-24 flex justify-center items-center">
          <LoadingSpinner size="lg" text="Loading biography..." />
        </div>
      </div>
    );
  }

  if (!biography) {
    return (
      <div className="min-h-screen bg-white">
        <NavBar />
        <div className="container mx-auto px-4 py-8 pt-24">
          <Card className="p-8 text-center">
            <CardContent>
              <h2 className="text-2xl font-bold text-red-500">Biography not found</h2>
              <p className="mt-2 text-gray-600">The biography you're looking for doesn't exist or you don't have access to it.</p>
            </CardContent>
          </Card>
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
                <p className="text-gray-500">Select a chapter to start writing</p>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default BiographyEditor;
