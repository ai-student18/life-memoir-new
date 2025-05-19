
import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useTOC, TOCChapter } from "@/hooks/useTOC";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { PlusCircle, Save, ArrowRight } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  verticalListSortingStrategy,
  sortableKeyboardCoordinates
} from "@dnd-kit/sortable";
import TOCChapterCard from "./TOCChapterCard";

const TOCEditor = () => {
  const { biographyId } = useParams<{ biographyId: string }>();
  const navigate = useNavigate();
  const { isLoading, error, updateTOC, chapters } = useTOC(biographyId);
  const [localChapters, setLocalChapters] = useState<TOCChapter[]>([]);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (chapters) {
      setLocalChapters([...chapters]);
    }
  }, [chapters]);

  const handleAddChapter = () => {
    setLocalChapters([
      ...localChapters,
      { title: "New Chapter", description: "Description for this chapter" },
    ]);
  };

  const handleUpdateChapter = (index: number, field: keyof TOCChapter, value: string) => {
    const updatedChapters = [...localChapters];
    updatedChapters[index] = {
      ...updatedChapters[index],
      [field]: value,
    };
    setLocalChapters(updatedChapters);
  };

  const handleDeleteChapter = (index: number) => {
    setLocalChapters(localChapters.filter((_, i) => i !== index));
  };

  const handleSaveTOC = async () => {
    if (localChapters.some(chapter => !chapter.title.trim())) {
      toast({
        title: "Validation Error",
        description: "All chapters must have a title",
        variant: "destructive",
      });
      return;
    }

    setIsSaving(true);
    try {
      await updateTOC.mutateAsync({ structure: localChapters });
    } finally {
      setIsSaving(false);
    }
  };

  const handleApproveAndContinue = async () => {
    if (localChapters.length === 0) {
      toast({
        title: "Validation Error",
        description: "Please add at least one chapter before continuing",
        variant: "destructive",
      });
      return;
    }

    setIsSaving(true);
    try {
      // First update and approve the TOC
      await updateTOC.mutateAsync({
        structure: localChapters,
        approved: true,
      });

      // Then create chapter records for each TOC entry
      if (biographyId) {
        try {
          // First, check if chapters already exist to avoid duplicates
          const { data: existingChapters } = await supabase
            .from("biography_chapters")
            .select("id")
            .eq("biography_id", biographyId);

          // Only create chapters if none exist yet
          if (!existingChapters || existingChapters.length === 0) {
            // Create chapters based on the TOC structure
            const chaptersToInsert = localChapters.map((chapter, index) => ({
              biography_id: biographyId,
              title: chapter.title,
              content: chapter.description,
              chapter_order: index,
            }));

            const { error: chaptersError } = await supabase
              .from("biography_chapters")
              .insert(chaptersToInsert);

            if (chaptersError) {
              console.error("Error creating chapters:", chaptersError);
              toast({
                title: "Warning",
                description: "Table of contents approved, but there was an error creating chapters",
                variant: "destructive",
              });
            }
          }
        } catch (error) {
          console.error("Error managing chapters:", error);
        }
      }

      // Navigate to the editor
      navigate(`/biography/${biographyId}/editor`);
    } finally {
      setIsSaving(false);
    }
  };

  // DnD functionality
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    
    if (active.id !== over?.id) {
      setLocalChapters((items) => {
        const oldIndex = items.findIndex((_, i) => `chapter-${i}` === active.id);
        const newIndex = items.findIndex((_, i) => `chapter-${i}` === over?.id);
        
        return arrayMove(items, oldIndex, newIndex);
      });
    }
  };

  if (isLoading) {
    return <div className="flex justify-center p-8">Loading TOC...</div>;
  }

  if (error) {
    return <div className="text-red-500 p-4">Error loading table of contents</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Table of Contents</h2>
          <p className="text-muted-foreground">
            Review and edit the suggested chapters for your biography
          </p>
        </div>

        <div className="flex space-x-2">
          <Button
            variant="outline"
            onClick={handleSaveTOC}
            disabled={isSaving}
          >
            <Save className="mr-2 h-4 w-4" />
            Save
          </Button>
          <Button
            onClick={handleApproveAndContinue}
            disabled={isSaving}
          >
            Approve & Continue
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Chapters</CardTitle>
          <CardDescription>
            Drag to reorder, or edit chapter titles and descriptions
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={localChapters.map((_, index) => `chapter-${index}`)}
              strategy={verticalListSortingStrategy}
            >
              {localChapters.map((chapter, index) => (
                <TOCChapterCard
                  key={`chapter-${index}`}
                  id={`chapter-${index}`}
                  index={index}
                  chapter={chapter}
                  onUpdate={handleUpdateChapter}
                  onDelete={handleDeleteChapter}
                />
              ))}
            </SortableContext>
          </DndContext>
        </CardContent>
        <CardFooter>
          <Button
            variant="outline"
            onClick={handleAddChapter}
            className="w-full"
          >
            <PlusCircle className="mr-2 h-4 w-4" />
            Add Chapter
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
};

export default TOCEditor;
