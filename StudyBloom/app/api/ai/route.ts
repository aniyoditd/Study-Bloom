const studyKitSchema = {
  type: "object",
  additionalProperties: false,
  required: ["summary", "guide", "formulas", "flashcards", "questions"],
  properties: {
    summary: { type: "string" },
    guide: { type: "array", items: { type: "string" }, minItems: 5, maxItems: 16 },
    formulas: { type: "array", items: { type: "string" }, maxItems: 12 },
    flashcards: {
      type: "array",
      minItems: 8,
      maxItems: 24,
      items: {
        type: "object",
        additionalProperties: false,
        required: ["term", "definition", "topic"],
        properties: { term: { type: "string" }, definition: { type: "string" }, topic: { type: "string" } },
      },
    },
    questions: {
      type: "array",
      minItems: 9,
      maxItems: 30,
      items: {
        type: "object",
        additionalProperties: false,
        required: ["prompt", "answer", "explanation", "type", "topic", "difficulty", "options"],
        properties: {
          prompt: { type: "string" },
          answer: { type: "string" },
          explanation: { type: "string" },
          type: { type: "string", enum: ["Multiple choice", "True / False", "Open ended"] },
          topic: { type: "string" },
          difficulty: { type: "string", enum: ["Easy", "Medium", "Hard"] },
          options: { type: "array", items: { type: "string" }, maxItems: 5 },
        },
      },
    },
  },
};

const gradeSchema = {
  type: "object",
  additionalProperties: false,
  required: ["score", "feedback"],
  properties: { score: { type: "number", minimum: 0, maximum: 1 }, feedback: { type: "string" } },
};

function outputText(payload: { output?: Array<{ content?: Array<{ type?: string; text?: string }> }> }) {
  return payload.output?.flatMap((item) => item.content ?? []).find((content) => content.type === "output_text")?.text ?? "";
}

async function createResponse(input: string, schema: object, name: string) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error("OPENAI_API_KEY is not configured");
  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: process.env.OPENAI_MODEL || "gpt-5.4",
      store: false,
      input,
      text: { format: { type: "json_schema", name, strict: true, schema } },
    }),
  });
  const payload = await response.json() as { error?: { message?: string }; output?: Array<{ content?: Array<{ type?: string; text?: string }> }> };
  if (!response.ok) throw new Error(payload.error?.message || "OpenAI request failed");
  const text = outputText(payload);
  if (!text) throw new Error("The AI response did not contain usable output");
  return JSON.parse(text);
}

export async function GET() {
  return Response.json({ configured: Boolean(process.env.OPENAI_API_KEY), model: process.env.OPENAI_MODEL || "gpt-5.4" });
}

export async function POST(request: Request) {
  try {
    const body = await request.json() as { action?: string; title?: string; className?: string; text?: string; prompt?: string; expected?: string; answer?: string };
    if (body.action === "grade") {
      const result = await createResponse(
        `Grade the student's answer for factual and conceptual correctness. Award partial credit. Return concise, encouraging feedback.\n\nQuestion: ${body.prompt}\nExpected answer: ${body.expected}\nStudent answer: ${body.answer}`,
        gradeSchema,
        "semantic_grade",
      );
      return Response.json(result);
    }
    if (!body.text?.trim()) return Response.json({ error: "No document text was provided" }, { status: 400 });
    const result = await createResponse(
      `Create a rigorous, accurate study kit using only the supplied class material. Cover the entire source, vary question difficulty, include plausible distractors, and write clear explanations. Use LaTeX strings for formulas when relevant.\n\nClass: ${body.className || "General"}\nDocument: ${body.title || "Class material"}\n\nSOURCE MATERIAL:\n${body.text.slice(0, 120000)}`,
      studyKitSchema,
      "study_kit",
    );
    return Response.json(result);
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "AI request failed" }, { status: 500 });
  }
}
