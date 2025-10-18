
import { Idea } from "../types.js";

let client: any = null;
function getClient() {
  if (client) return client;
  const key = process.env.GEMINI_API_KEY;
  if (!key) return null;
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { GoogleGenerativeAI } = require("@google/generative-ai");
  client = new GoogleGenerativeAI(key);
  return client;
}

export async function polishWithGemini(ideas: Idea[], context: { city: string; hangouts: string[]; peace: string }): Promise<Idea[]> {
  const c = getClient();
  if (!c) return ideas;

  const modelName = process.env.GEMINI_MODEL || "gemini-1.5-flash";
  const model = c.getGenerativeModel({ model: modelName });
  const prompt = `You are helping a vibe-based matching app. Given a city, preferred hangout types, and three place-based date ideas, polish each idea with a 1–2 sentence warm summary and a tiny 3-step itinerary. Keep it light, inclusive, and practical. Return strict JSON with fields: ideas: [{title, summary, itinerary:[{time, activity, notes}]}]. Avoid flowery language and keep under 60 words per idea.`;

  try {
    const payload = {
      city: context.city,
      hangouts: context.hangouts,
      peace: context.peace,
      ideas: ideas.map(({ title, desc, time, mapUrl }) => ({ title, desc, time, mapUrl })),
    };
    const result = await model.generateContent([{ text: prompt }, { text: JSON.stringify(payload) }]);
    const text = result.response.text();
    const json = JSON.parse(text.replace(/^```json\n?|```$/g, ""));
    const byTitle = new Map<string, any>(json.ideas?.map((i: any) => [i.title, i]));
    return ideas.map((i) => {
      const g = byTitle.get(i.title);
      if (!g) return i;
      return { ...i, summary: g.summary, itinerary: Array.isArray(g.itinerary) ? g.itinerary.slice(0,3) : undefined };
    });
  } catch (e) {
    console.warn("Gemini polish failed, using raw ideas", e);
    return ideas;
  }
}
