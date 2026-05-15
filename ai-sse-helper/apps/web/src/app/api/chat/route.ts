import { OpenAIStream, StreamingTextResponse } from "ai"
import OpenAI from "openai"

export const runtime = "edge"

export async function POST(req: Request) {
  const apiKey = process.env.OPENAI_API_KEY || process.env.DASHSCOPE_API_KEY

  if (!apiKey) {
    return new Response(
      JSON.stringify({
        error:
          "API key not configured. Set OPENAI_API_KEY in Vercel environment variables.",
      }),
      { status: 500, headers: { "Content-Type": "application/json" } },
    )
  }

  const { messages } = await req.json()

  const client = new OpenAI({
    baseURL:
      process.env.OPENAI_BASE_URL ||
      "https://dashscope.aliyuncs.com/compatible-mode/v1",
    apiKey,
  })

  const response = await client.chat.completions.create({
    model: process.env.OPENAI_MODEL || "qwen3.6-plus",
    stream: true,
    messages,
  })

  const stream = OpenAIStream(response)
  return new StreamingTextResponse(stream)
}
