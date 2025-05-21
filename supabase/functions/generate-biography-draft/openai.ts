
import { Logger } from "../_shared/logging.ts";

export interface OpenAIMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface OpenAIConfig {
  apiKey: string;
  model: string;
  temperature?: number;
  maxTokens?: number;
  logger: Logger;
}

export interface GenerationOptions {
  messages: OpenAIMessage[];
  config: OpenAIConfig;
}

/**
 * Call OpenAI API to generate text based on messages
 */
export async function generateWithOpenAI(options: GenerationOptions): Promise<string> {
  const { messages, config } = options;
  const { apiKey, model, temperature = 0.7, maxTokens = 4000, logger } = config;
  
  if (!apiKey) {
    logger.error("Missing OpenAI API key");
    throw new Error("OpenAI API key is not configured");
  }
  
  logger.log("Calling OpenAI API to generate content");
  logger.log("Request messages structure:", messages.map(m => ({
    role: m.role,
    contentLength: m.content?.length || 0
  })));
  
  try {
    const openaiResponse = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages,
        temperature,
        max_tokens: maxTokens,
      }),
    });
    
    if (!openaiResponse.ok) {
      let errorDetail = "";
      try {
        const errorJson = await openaiResponse.json();
        errorDetail = JSON.stringify(errorJson);
      } catch (e) {
        errorDetail = await openaiResponse.text();
      }
      
      logger.error(`API error (${openaiResponse.status}):`, errorDetail);
      throw new Error(`Failed to generate content: ${errorDetail}`);
    }
    
    const result = await openaiResponse.json();
    const generatedText = result.choices[0].message.content;
    
    logger.log("Successfully generated text");
    logger.log("First 100 characters:", generatedText.substring(0, 100));
    
    return generatedText;
  } catch (error) {
    logger.error("Error calling OpenAI API:", error);
    throw error;
  }
}
