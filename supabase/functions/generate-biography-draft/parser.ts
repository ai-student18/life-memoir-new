
import { Logger } from "../_shared/logging.ts";

export interface TOCChapter {
  title: string;
  description: string;
}

export interface ChapterExtractorOptions {
  structure: TOCChapter[];
  generatedText: string;
  logger: Logger;
}

/**
 * Extracts chapter content from generated text based on TOC structure
 */
export function extractChapterContent(options: ChapterExtractorOptions): Record<string, string> {
  const { structure, generatedText, logger } = options;
  const chapters: Record<string, string> = {};
  
  try {
    logger.log("Starting to extract chapters from generated text");
    
    structure.forEach((chapter, index) => {
      const chapterIndex = index + 1;
      const chapterTitle = chapter.title;
      const cleanTitle = chapterTitle.replace(/^Chapter \d+:\s*/, "").trim();
      
      logger.log(`Processing chapter ${chapterIndex}: "${chapterTitle}"`);
      
      // Create regex patterns to find chapter headings with increased flexibility
      const patterns = [
        new RegExp(`Chapter ${chapterIndex}[.:] ?${cleanTitle}`, "i"),
        new RegExp(`${chapterIndex}\\. ?${cleanTitle}`, "i"),
        new RegExp(`\\b${cleanTitle}\\b`, "i"),
        new RegExp(`Chapter ${chapterIndex}[^a-zA-Z0-9]*`, "i"),
        new RegExp(`^${chapterIndex}[.:]`, "m"),
      ];
      
      // Find where the current chapter starts in the text
      let chapterStartMatch = null;
      let patternUsed = null;
      
      for (let i = 0; i < patterns.length; i++) {
        const pattern = patterns[i];
        const match = generatedText.match(pattern);
        if (match) {
          chapterStartMatch = match;
          patternUsed = i;
          logger.log(`Found match for chapter ${chapterIndex} using pattern ${i}: "${match[0]}"`);
          break;
        }
      }
      
      if (!chapterStartMatch) {
        logger.warn(`Could not find start of chapter ${chapterIndex}: ${cleanTitle}`);
        // Add fallback content for chapters that couldn't be found
        chapters[chapterTitle] = `Chapter ${chapterIndex}: ${cleanTitle}\n\n[Content not available]`; 
        return;
      }
      
      const chapterStart = chapterStartMatch.index;
      let chapterEnd = generatedText.length;
      
      // Check if there's a next chapter to determine the end
      if (index < structure.length - 1) {
        const nextChapter = structure[index + 1];
        const nextChapterIndex = index + 2;
        const nextChapterTitle = nextChapter.title.replace(/^Chapter \d+:\s*/, "").trim();
        
        // Similar patterns for next chapter
        const nextChapterPatterns = [
          new RegExp(`Chapter ${nextChapterIndex}[.:] ?${nextChapterTitle}`, "i"),
          new RegExp(`${nextChapterIndex}\\. ?${nextChapterTitle}`, "i"),
          new RegExp(`\\b${nextChapterTitle}\\b`, "i"),
          new RegExp(`Chapter ${nextChapterIndex}[^a-zA-Z0-9]*`, "i"),
          new RegExp(`^${nextChapterIndex}[.:]`, "m"),
        ];
        
        for (const pattern of nextChapterPatterns) {
          const match = generatedText.match(pattern);
          if (match && match.index > chapterStart) {
            chapterEnd = match.index;
            logger.log(`Found end of chapter ${chapterIndex} at match: "${match[0]}"`);
            break;
          }
        }
      }
      
      // Extract the chapter content
      const chapterContent = generatedText.substring(chapterStart, chapterEnd).trim();
      logger.log(`Extracted chapter ${chapterIndex} content (${chapterContent.length} chars)`);
      
      // Add the chapter content to the chapters object
      chapters[chapterTitle] = chapterContent;
    });

    logger.log(`Successfully extracted ${Object.keys(chapters).length} chapters`);

    // Ensure chapter_content is not empty - fallback to full content if needed
    if (Object.keys(chapters).length === 0) {
      logger.warn("No chapters could be extracted, creating fallback chapters");
      structure.forEach((chapter, index) => {
        chapters[chapter.title] = `Chapter ${index + 1}: ${chapter.title}\n\n${
          index === 0 ? generatedText : "[Content not available]"
        }`;
      });
    }

    return chapters;
  } catch (error) {
    logger.error("Error extracting chapters:", error);
    
    // Create fallback chapters
    structure.forEach((chapter, index) => {
      chapters[chapter.title] = `Chapter ${index + 1}: ${chapter.title}\n\n[Error extracting content]`;
    });
    
    return chapters;
  }
}
