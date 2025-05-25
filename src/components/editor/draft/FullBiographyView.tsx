
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FileText } from "lucide-react";
import { toast } from "@/hooks/use-toast";

interface FullBiographyViewProps {
  content: string;
}

export const FullBiographyView = ({ content }: FullBiographyViewProps) => {
  const handleExport = () => {
    toast({
      title: "Export Started",
      description: "Your complete biography draft is being prepared for download.",
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex justify-between items-center">
          <span>Full Biography Draft</span>
          <Button onClick={handleExport} variant="outline" size="sm">
            <FileText className="h-4 w-4 mr-2" />
            Export
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent className="prose max-w-none">
        <div className="whitespace-pre-wrap">{content}</div>
      </CardContent>
    </Card>
  );
};
