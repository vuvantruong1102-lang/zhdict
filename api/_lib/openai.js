// Helper dùng chung cho các serverless function (Vercel ignore folder _lib).
import OpenAI from "openai";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
export const MODEL = process.env.OPENAI_MODEL || "gpt-4o-mini";

export function isChinese(s) {
  return /[\u4e00-\u9fff]/.test(s || "");
}

// Gọi OpenAI và parse JSON. Luôn yêu cầu model trả JSON object.
export async function chatJSON({ system, user, temperature = 0.4 }) {
  const c = await openai.chat.completions.create({
    model: MODEL,
    temperature,
    response_format: { type: "json_object" },
    messages: [
      { role: "system", content: system },
      { role: "user", content: user },
    ],
  });
  return JSON.parse(c.choices[0].message.content);
}

export { openai };
