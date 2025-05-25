
import { Card, CardContent } from "@/components/ui/card";

export const EmptyDraftCard = () => {
  return (
    <Card>
      <CardContent className="p-8 text-center">
        <p className="text-gray-500 mb-4">
          No draft has been generated yet. Click the "Generate Draft" button to create a complete draft of your biography.
        </p>
        <p className="text-sm text-gray-400">
          This will use your questionnaire answers and approved table of contents to create a comprehensive draft.
        </p>
      </CardContent>
    </Card>
  );
};
