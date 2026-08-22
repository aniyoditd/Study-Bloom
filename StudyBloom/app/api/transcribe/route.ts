export async function POST(request: Request) {
  try {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) return Response.json({ error: "OPENAI_API_KEY is not configured" }, { status: 503 });
    const incoming = await request.formData();
    const file = incoming.get("file");
    if (!(file instanceof File)) return Response.json({ error: "No audio file was provided" }, { status: 400 });
    if (file.size > 25 * 1024 * 1024) return Response.json({ error: "Audio files must be 25 MB or smaller" }, { status: 400 });
    const form = new FormData();
    form.append("file", file, file.name);
    form.append("model", process.env.OPENAI_TRANSCRIBE_MODEL || "gpt-4o-mini-transcribe");
    form.append("response_format", "json");
    const response = await fetch("https://api.openai.com/v1/audio/transcriptions", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}` },
      body: form,
    });
    const payload = await response.json() as { text?: string; error?: { message?: string } };
    if (!response.ok) return Response.json({ error: payload.error?.message || "Transcription failed" }, { status: response.status });
    return Response.json({ text: payload.text || "" });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Transcription failed" }, { status: 500 });
  }
}
