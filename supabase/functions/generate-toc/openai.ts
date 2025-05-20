
import { QuestionAnswer, TOCChapter } from "./types.ts";

/**
 * Creates the system prompt for TOC generation
 */
export function createSystemPrompt(): string {
  return `You are a professional biographer specializing in creating structured table of contents.
  
Your task is to create a clear, organized table of contents for a biography based on the provided Q&A responses.

The person has answered questions about their life, and you need to organize these into a coherent table of contents.

Return ONLY a JSON array of chapters, with each chapter having a 'title' and 'description' field.

Follow these guidelines:
- Create 5-10 chapters that flow chronologically or thematically
- Make chapter titles descriptive and engaging
- Include brief descriptions (1-2 sentences) that summarize what each chapter will cover
- Ensure chapters collectively tell a cohesive life story
- Structure must be valid JSON with no additional text or explanations

Format as: [{"title": "Chapter Title", "description": "Brief description"}]`;
}

/**
 * Formats question-answer pairs for OpenAI, filtering out empty answers
 */
export function formatQAPairs(
  answers: any[],
  questionsMap: Record<string, string>
): QuestionAnswer[] {
  try {
    console.log(`[OpenAI] Formatting ${answers.length} answers with questions map`);
    
    // Filter only answers that have content
    const answersWithContent = answers.filter(answer => 
      answer.answer_text && answer.answer_text.trim().length > 0
    );
    
    console.log(`[OpenAI] After filtering, found ${answersWithContent.length} answers with content`);
    
    // If no answers with content, return empty array
    if (answersWithContent.length === 0) {
      console.log("[OpenAI] No answers with content found");
      return [];
    }
    
    // Map to proper format for OpenAI
    const formatted = answersWithContent.map(answer => {
      const questionText = questionsMap[answer.question_id] || "Unknown question";
      return {
        question: questionText,
        answer: answer.answer_text.trim()
      };
    });
    
    // Log sample for debugging
    if (formatted.length > 0) {
      console.log(`[OpenAI] Sample QA pair: ${JSON.stringify(formatted[0])}`);
    }
    
    return formatted;
  } catch (error) {
    console.error(`[OpenAI ERROR] formatQAPairs: ${error.message}`);
    throw error;
  }
}

/**
 * Calls OpenAI API to generate TOC with retry logic
 */
export async function generateTOCWithOpenAI(formattedQA: QuestionAnswer[]): Promise<TOCChapter[]> {
  const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");
  
  if (!OPENAI_API_KEY) {
    console.error("[OpenAI ERROR] API key not configured");
    throw new Error("OpenAI API key not configured");
  }

  if (formattedQA.length === 0) {
    console.error("[OpenAI ERROR] No content to generate TOC from");
    throw new Error("No content available to generate TOC");
  }

  const MAX_RETRIES = 2;
  let retries = 0;
  let lastError: Error | null = null;

  while (retries <= MAX_RETRIES) {
    try {
      const systemPrompt = createSystemPrompt();
      console.log(`[OpenAI] Calling API (attempt ${retries + 1}/${MAX_RETRIES + 1})`);
      console.log(`[OpenAI] Using ${formattedQA.length} QA pairs as context`);

      const openAIResponse = await fetch(
        "https://api.openai.com/v1/chat/completions",
        {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${OPENAI_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "gpt-4o",
            messages: [
              {
                role: "system",
                content: systemPrompt
              },
              {
                role: "user",
                content: JSON.stringify(formattedQA)
              }
            ],
            temperature: 0.2,
            max_tokens: 1024,
          })
        }
      );

      if (!openAIResponse.ok) {
        const errorText = await openAIResponse.text();
        console.error(`[OpenAI ERROR] API returned ${openAIResponse.status}: ${errorText}`);
        
        if (retries < MAX_RETRIES) {
          retries++;
          lastError = new Error(`OpenAI API returned status ${openAIResponse.status}: ${errorText}`);
          const delay = Math.pow(2, retries) * 500; // Exponential backoff
          console.log(`[OpenAI] Retrying in ${delay}ms...`);
          await new Promise(resolve => setTimeout(resolve, delay));
          continue;
        }
        
        throw new Error(`OpenAI API returned status ${openAIResponse.status}: ${errorText}`);
      }

      const openAIData = await openAIResponse.json();
      console.log("[OpenAI] Successfully received response");
      
      // Parse the response into TOC chapters
      const tocData = parseOpenAIResponse(openAIData);
      console.log(`[OpenAI] Successfully parsed TOC with ${tocData.length} chapters`);
      
      return tocData;
    } catch (error) {
      console.error(`[OpenAI ERROR] API call failed (attempt ${retries + 1}/${MAX_RETRIES + 1}): ${error.message}`);
      
      if (retries < MAX_RETRIES) {
        retries++;
        lastError = error instanceof Error ? error : new Error(String(error));
        const delay = Math.pow(2, retries) * 500; // Exponential backoff
        console.log(`[OpenAI] Retrying in ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
        continue;
      }
      
      throw lastError || error;
    }
  }

  throw lastError || new Error("Failed to generate TOC after retries");
}

/**
 * Parses the OpenAI response to extract the TOC structure
 */
function parseOpenAIResponse(openAIData: any): TOCChapter[] {
  try {
    if (!openAIData.choices || 
        !openAIData.choices[0] || 
        !openAIData.choices[0].message || 
        !openAIData.choices[0].message.content) {
      console.error("[OpenAI ERROR] Invalid response format");
      throw new Error("Invalid response format from OpenAI API");
    }

    const textContent = openAIData.choices[0].message.content.trim();
    if (!textContent) {
      console.error("[OpenAI ERROR] Empty response content");
      throw new Error("Empty text content from OpenAI API");
    }

    console.log(`[OpenAI] Raw response: ${textContent.substring(0, 100)}...`);
    
    // Try to extract JSON from the response
    try {
      // First try: See if it's directly a JSON array
      const parsedData = JSON.parse(textContent);
      if (Array.isArray(parsedData) && parsedData.length > 0) {
        return parsedData;
      } else {
        throw new Error("Response is not an array");
      }
    } catch (jsonError) {
      console.log("[OpenAI] Direct JSON parse failed, trying to extract JSON from text");
      
      // Second try: Extract JSON array from text using regex
      const jsonMatch = textContent.match(/(\[[\s\S]*\])/);
      if (jsonMatch && jsonMatch[0]) {
        try {
          const parsedData = JSON.parse(jsonMatch[0]);
          if (Array.isArray(parsedData) && parsedData.length > 0) {
            return parsedData;
          }
        } catch (e) {
          console.error("[OpenAI ERROR] Failed to parse extracted JSON:", e);
        }
      }
      
      console.error("[OpenAI ERROR] Could not parse response as JSON");
      throw new Error("Failed to parse JSON from OpenAI response");
    }
  } catch (error) {
    console.error(`[OpenAI ERROR] parseOpenAIResponse: ${error.message}`);
    
    // Return fallback TOC if parsing fails
    console.log("[OpenAI] Using fallback TOC structure due to parsing error");
    return [
      {
        title: "Chapter 1: Introduction",
        description: "An introduction to the person's life and background"
      },
      {
        title: "Chapter 2: Early Years",
        description: "The early years and formative experiences"
      },
      {
        title: "Chapter 3: Adult Life",
        description: "Major life events and achievements"
      },
      {
        title: "Chapter 4: Career and Accomplishments",
        description: "Professional achievements and contributions"
      },
      {
        title: "Chapter 5: Legacy and Impact",
        description: "The lasting impact and legacy"
      }
    ];
  }
}
