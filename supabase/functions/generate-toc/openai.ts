
import { QuestionAnswer } from "./types.ts";

// Create the system prompt for TOC generation
export function createSystemPrompt(): string {
  return `You are a professional biographer specializing in creating structured table of contents. 
  Create a clear, organized table of contents for a biography based on the provided Q&A session.
  Return ONLY a JSON array of chapters, with each chapter having a 'title' and 'description' field.
  Follow these guidelines:
  - Create 5-10 chapters that flow chronologically or thematically
  - Make chapter titles descriptive and engaging
  - Include brief descriptions that summarize what each chapter will cover
  - Ensure chapters collectively tell a cohesive life story
  - Structure must be valid JSON with no additional text or explanations
  - Format as: [{"title": "Chapter Title", "description": "Brief description"}]`;
}

// Format the question-answer pairs - improved filtering logic
export function formatQAPairs(
  answers: any[],
  questionsMap: Record<string, string>
): QuestionAnswer[] {
  try {
    console.log(`Formatting ${answers.length} answers with questions map`);
    
    // Filter answers that have content first
    const answersWithContent = answers.filter(answer => 
      answer.answer_text && answer.answer_text.trim() !== ""
    );
    
    console.log(`After filtering, ${answersWithContent.length} answers have content`);
    
    // Map to question-answer format
    const formatted = answersWithContent.map(answer => {
      const questionText = questionsMap[answer.question_id] || "Unknown question";
      console.log(`Mapping question ID ${answer.question_id} to "${questionText.substring(0, 30)}..."`);
      return {
        question: questionText,
        answer: answer.answer_text || ""
      };
    });
    
    console.log(`Formatted ${formatted.length} QA pairs with content`);
    return formatted;
  } catch (error) {
    console.error(`Error in formatQAPairs: ${error.message}`);
    throw error;
  }
}

// Call OpenAI API with retry logic
export async function generateTOCWithOpenAI(formattedQA: QuestionAnswer[]): Promise<any[]> {
  const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");
  
  if (!OPENAI_API_KEY) {
    console.error("OpenAI API key not configured");
    throw new Error("OpenAI API key not configured");
  }

  // Maximum number of retries
  const MAX_RETRIES = 2;
  let retries = 0;
  let lastError: Error | null = null;

  while (retries <= MAX_RETRIES) {
    try {
      const systemPrompt = createSystemPrompt();
      const userContext = JSON.stringify(formattedQA);

      console.log(`Calling OpenAI API (attempt ${retries + 1}/${MAX_RETRIES + 1})...`);
      console.log(`Using ${formattedQA.length} QA pairs as context`);
      console.log(`Sample QA: ${JSON.stringify(formattedQA[0])}`);

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
                content: userContext
              }
            ],
            temperature: 0.2,
            max_tokens: 1024,
          })
        }
      );

      if (!openAIResponse.ok) {
        const errorText = await openAIResponse.text();
        console.error(`OpenAI API error (${openAIResponse.status}): ${errorText}`);
        
        // If we're not at max retries, try again
        if (retries < MAX_RETRIES) {
          retries++;
          lastError = new Error(`OpenAI API returned status ${openAIResponse.status}: ${errorText}`);
          // Exponential backoff
          const delay = Math.pow(2, retries) * 500;
          console.log(`Retrying in ${delay}ms...`);
          await new Promise(resolve => setTimeout(resolve, delay));
          continue;
        }
        
        throw new Error(`OpenAI API returned status ${openAIResponse.status}: ${errorText}`);
      }

      const openAIData = await openAIResponse.json();
      console.log("Successfully received response from OpenAI API");
      return parseTOCResponse(openAIData);
    } catch (error) {
      console.error(`Error calling OpenAI API (attempt ${retries + 1}/${MAX_RETRIES + 1}):`, error);
      
      // If we're not at max retries, try again
      if (retries < MAX_RETRIES) {
        retries++;
        lastError = error instanceof Error ? error : new Error(String(error));
        // Exponential backoff
        const delay = Math.pow(2, retries) * 500;
        console.log(`Retrying in ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
        continue;
      }
      
      // We've exhausted retries, throw the last error
      throw lastError || error;
    }
  }

  // This should never be reached due to the throw in the last iteration,
  // but TypeScript needs it for type safety
  throw lastError || new Error("Failed to generate TOC after retries");
}

// Parse the OpenAI API response to extract the TOC
export function parseTOCResponse(openAIData: any): any[] {
  try {
    if (!openAIData.choices || 
        !openAIData.choices[0] || 
        !openAIData.choices[0].message || 
        !openAIData.choices[0].message.content) {
      console.error("Invalid response format from OpenAI API:", JSON.stringify(openAIData, null, 2));
      throw new Error("Invalid response format from OpenAI API");
    }

    const textContent = openAIData.choices[0].message.content.trim();
    if (!textContent) {
      console.error("Empty text content from OpenAI API");
      throw new Error("Empty text content from OpenAI API");
    }

    console.log("Raw text response from OpenAI:", textContent.substring(0, 100) + "...");
    
    // Extract just the JSON part
    const jsonMatch = textContent.match(/(\[[\s\S]*\])/);
    if (jsonMatch && jsonMatch[0]) {
      try {
        const parsedData = JSON.parse(jsonMatch[0]);
        console.log(`Successfully parsed TOC with ${parsedData.length} chapters`);
        return parsedData;
      } catch (e) {
        console.error("Failed to parse JSON match from OpenAI response:", e);
        throw new Error("Failed to parse JSON from OpenAI response");
      }
    } else {
      // Try parsing the entire text as JSON
      try {
        const parsedData = JSON.parse(textContent);
        console.log(`Successfully parsed TOC with ${parsedData.length} chapters`);
        return parsedData;
      } catch (e) {
        console.error("Failed to parse JSON from OpenAI response:", e);
        throw new Error("Failed to parse JSON from OpenAI response");
      }
    }
  } catch (e) {
    console.error("Error parsing OpenAI response:", e);
    // Provide a fallback TOC if parsing fails
    console.log("Using fallback TOC due to parsing failure");
    return [
      {
        title: "Chapter 1: Introduction",
        description: "An introduction to the subject's life and background"
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
        description: "The lasting impact and legacy of the subject"
      }
    ];
  }
}
