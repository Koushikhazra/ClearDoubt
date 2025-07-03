const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

interface ReviewRequest {
  code: string;
  language: string;
}

interface ReviewResult {
  overall_score: number;
  issues: Array<{
    type: 'error' | 'warning' | 'suggestion';
    message: string;
    line?: number;
    severity: 'high' | 'medium' | 'low';
  }>;
  suggestions: string[];
  positive_points: string[];
  summary: string;
}

Deno.serve(async (req: Request) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    if (req.method !== "POST") {
      return new Response("Method not allowed", {
        status: 405,
        headers: corsHeaders,
      });
    }

    const { code, language }: ReviewRequest = await req.json();

    if (!code || !language) {
      return new Response("Missing code or language", {
        status: 400,
        headers: corsHeaders,
      });
    }

    // Try to get API key from environment variable first, fallback to hardcoded for development
    const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY") || "AIzaSyA9zW3MbLdVZn-D_xHy3z2JrsFanP6yDMg";
    
    const prompt = `You are an expert code reviewer. Please analyze the following ${language} code and provide a comprehensive review in JSON format with the following structure:

{
  "overall_score": (number from 1-10),
  "issues": [
    {
      "type": "error" | "warning" | "suggestion",
      "message": "detailed description of the issue",
      "line": number (optional, if you can identify specific line),
      "severity": "high" | "medium" | "low"
    }
  ],
  "suggestions": [
    "improvement suggestion 1",
    "improvement suggestion 2"
  ],
  "positive_points": [
    "what's good about the code",
    "positive aspects"
  ],
  "summary": "overall summary of the code quality and main points"
}

Please focus on:
- Code quality and best practices
- Performance issues
- Security vulnerabilities
- Maintainability
- Readability
- Error handling
- Code structure and organization

Here's the code to review:

\`\`\`${language}
${code}
\`\`\`

Provide only the JSON response, no additional text.`;

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          contents: [{
            parts: [{
              text: prompt
            }]
          }],
          generationConfig: {
            temperature: 0.7,
            topK: 40,
            topP: 0.95,
            maxOutputTokens: 2048,
          }
        }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Gemini API error:", response.status, errorText);
      throw new Error(`Gemini API error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    
    if (!data.candidates || !data.candidates[0] || !data.candidates[0].content) {
      console.error("Invalid Gemini response:", data);
      throw new Error("Invalid response from Gemini API");
    }

    const reviewText = data.candidates[0].content.parts[0].text;
    
    // Extract JSON from the response
    const jsonMatch = reviewText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      console.error("Could not extract JSON from response:", reviewText);
      throw new Error("Could not extract JSON from AI response");
    }

    const reviewResult: ReviewResult = JSON.parse(jsonMatch[0]);

    return new Response(JSON.stringify(reviewResult), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders,
      },
    });

  } catch (error) {
    console.error("Error in review-code function:", error);
    
    return new Response(
      JSON.stringify({
        error: "Failed to review code",
        details: error instanceof Error ? error.message : "Unknown error"
      }),
      {
        status: 500,
        headers: {
          "Content-Type": "application/json",
          ...corsHeaders,
        },
      }
    );
  }
});