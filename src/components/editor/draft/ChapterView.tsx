
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Save } from "lucide-react";

interface ChapterViewProps {
  title: string;
  content: string;
  onApplyToEditor?: () => void;
}

export const ChapterView = ({ title, content, onApplyToEditor }: ChapterViewProps) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex justify-between items-center">
          <span>{title}</span>
          {onApplyToEditor && (
            <Button 
              variant="outline" 
              size="sm"
              onClick={onApplyToEditor}
            >
              <Save className="h-4 w-4 mr-2" />
              Use in Editor
            </Button>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="prose max-w-none">
        <div className="whitespace-pre-wrap">
          {content}
        </div>
      </CardContent>
    </Card>
  );
};
