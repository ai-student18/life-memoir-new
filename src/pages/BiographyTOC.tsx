
import { useParams } from "react-router-dom";
import NavBar from "@/components/NavBar";
import TOCEditor from "@/components/toc/TOCEditor";
import TOCLoading from "@/components/toc/TOCLoading";
import { useBiography } from "@/hooks/useBiography";
import { useTOCGenerate } from "@/hooks/useTOCGenerate";
import { Button } from "@/components/ui/button";
import { RefreshCw } from "lucide-react";

const BiographyTOC = () => {
  const { biographyId } = useParams<{ biographyId: string }>();
  const { data: biography, isLoading: biographyLoading } = useBiography(biographyId);
  const { generateTOC, isGenerating } = useTOCGenerate();

  const handleRegenerateTOC = async () => {
    if (biographyId) {
      await generateTOC(biographyId);
    }
  };

  if (biographyLoading) {
    return <TOCLoading />;
  }

  return (
    <div className="min-h-screen bg-white">
      <NavBar />
      
      <div className="container mx-auto px-4 py-8 pt-24">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">{biography?.title}</h1>
          <div className="flex justify-between items-center">
            <p className="text-gray-600">Organize the chapters of your biography</p>
            <Button
              variant="outline"
              onClick={handleRegenerateTOC}
              disabled={isGenerating}
            >
              <RefreshCw className={`mr-2 h-4 w-4 ${isGenerating ? "animate-spin" : ""}`} />
              {isGenerating ? "Regenerating..." : "Regenerate TOC"}
            </Button>
          </div>
        </div>
        
        <TOCEditor />
      </div>
    </div>
  );
};

export default BiographyTOC;
