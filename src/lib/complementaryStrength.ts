import { GoogleGenerativeAI } from "@google/generative-ai";
import "dotenv/config";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

type Answers = Record<string, any>;

export async function generateComplementaryStrength(
  a: Answers,
  b: Answers
): Promise<string> {
  const prompt = `
Two people answered the same multiple-choice questions.

Person A answers:
${JSON.stringify(a, null, 2)}

Person B answers:
${JSON.stringify(b, null, 2)}

Write ONE short sentence (max 15 words) describing how
their personalities complement each other.

Rules:
- Be warm and human
- Be specific
- If they are very similar, say they have very similar vibes
- No emojis
- No quotes
- No explanations
- Just the sentence
`;

  const model = genAI.getGenerativeModel({
    model: "gemini-2.5-flash",
  });

  const result = await model.generateContent(prompt);
  const text = result.response.text().trim();

  // Safety fallback
  if (!text || text.length > 120) {
    return "You complement each other naturally with an easy, balanced dynamic.";
  }

  return text;
}
