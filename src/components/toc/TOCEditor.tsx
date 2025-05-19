
import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useTOC, TOCChapter } from "@/hooks/useTOC";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { PlusCircle, Save, ArrowRight, GripVertical, Trash } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import TOCChapterCard from "./TOCChapterCard";

const TOCEditor = () => {
  const { biographyId } = useParams<{ biographyId: string }>();
  const navigate = useNavigate();
  const { tocData, isLoading, error, updateTOC, chapters } = useTOC(biographyId);
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
      await updateTOC.mutateAsync({
        structure: localChapters,
        approved: true,
      });
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

  const handleDragEnd = (event) => {
    const { active, over } = event;
    
    if (active.id !== over.id) {
      setLocalChapters((items) => {
        const oldIndex = items.findIndex((_, i) => `chapter-${i}` === active.id);
        const newIndex = items.findIndex((_, i) => `chapter-${i}` === over.id);
        
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
