
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.7";
import { corsHeaders } from "../_shared/cors.ts";

const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY");

interface RequestBody {
  biographyId: string;
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Initialize Supabase client
    const supabase = createClient(SUPABASE_URL!, SUPABASE_ANON_KEY!);

    // Get the user from the request
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    // Get the request body
    const requestData: RequestBody = await req.json();
    const { biographyId } = requestData;

    if (!biographyId) {
      return new Response(JSON.stringify({ error: "Biography ID is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    console.log("Generating TOC for biography:", biographyId);
    
    // Get the biography answers
    const { data: answers, error: answersError } = await supabase
      .from("biography_answers")
      .select("question_id, answer_text")
      .eq("biography_id", biographyId);

    if (answersError) {
      console.error("Error fetching answers:", answersError);
      return new Response(JSON.stringify({ error: "Failed to fetch answers" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    // Get the questions to associate with the answers
    const { data: questions, error: questionsError } = await supabase
      .from("biography_questions")
      .select("id, question_text");

    if (questionsError) {
      console.error("Error fetching questions:", questionsError);
      return new Response(JSON.stringify({ error: "Failed to fetch questions" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    // Match questions with answers and format for the API
    const questionsMap = questions.reduce((acc, q) => {
      acc[q.id] = q.question_text;
      return acc;
    }, {});

    const formattedQA = answers.map(answer => ({
      question: questionsMap[answer.question_id],
      answer: answer.answer_text || ""
    }));

    console.log("Found", formattedQA.length, "question-answer pairs");
    
    // Call Gemini API to generate TOC
    if (!GEMINI_API_KEY) {
      return new Response(JSON.stringify({ error: "Gemini API key not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    console.log("Calling Gemini API to generate TOC");
    
    const geminiResponse = await fetch("https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": GEMINI_API_KEY,
      },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              {
                text: `Create a structured table of contents for a biography based on these answers to questions. 
                Return ONLY a JSON array of chapters, with each chapter having a 'title' and 'description' field. 
                Each chapter should cover a period or theme from the person's life based on these answers:
                ${JSON.stringify(formattedQA)}
                
                Format your response as a valid JSON array like this:
                [
                  {
                    "title": "Chapter title",
                    "description": "Brief description of what this chapter will cover"
                  },
                  ...
                ]
                Only return the JSON, nothing else.`
              }
            ]
          }
        ],
        generationConfig: {
          temperature: 0.2,
          topK: 40,
          topP: 0.95,
          maxOutputTokens: 1024,
        }
      })
    });

    const geminiData = await geminiResponse.json();
    console.log("Received response from Gemini API");
    
    // Extract the TOC from Gemini response
    let tocData = [];
    try {
      const textContent = geminiData.candidates[0].content.parts[0].text;
      // Extract just the JSON part
      const jsonMatch = textContent.match(/(\[[\s\S]*\])/);
      if (jsonMatch && jsonMatch[0]) {
        tocData = JSON.parse(jsonMatch[0]);
      } else {
        tocData = JSON.parse(textContent);
      }
      
      console.log("Successfully parsed TOC data:", tocData.length, "chapters");
    } catch (e) {
      console.error("Error parsing Gemini response:", e);
      // Provide a fallback TOC if parsing fails
      tocData = [
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
        }
      ];
      console.log("Using fallback TOC data");
    }

    // Save the TOC data to the database
    const { error: tocError } = await supabase
      .from("biography_toc")
      .upsert({
        biography_id: biographyId,
        structure: tocData,
        approved: false,
        updated_at: new Date().toISOString()
      }, {
        onConflict: "biography_id"
      });

    if (tocError) {
      console.error("Error saving TOC:", tocError);
      return new Response(JSON.stringify({ error: "Failed to save TOC" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    // Update the biography progress to 'toc'
    const { error: progressError } = await supabase
      .from("biographies")
      .update({
        progress: "toc",
        status: "TOCGenerated",
        updated_at: new Date().toISOString()
      })
      .eq("id", biographyId);

    if (progressError) {
      console.error("Error updating biography progress:", progressError);
    }

    console.log("TOC generation completed successfully");
    
    return new Response(JSON.stringify({ success: true, toc: tocData }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  } catch (error) {
    console.error("Unexpected error:", error);
    return new Response(JSON.stringify({ error: "An unexpected error occurred" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }
});
