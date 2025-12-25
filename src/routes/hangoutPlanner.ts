import { Router } from "express";
import { supabase } from "../db/client.js";
import { GoogleGenerativeAI } from "@google/generative-ai";
import "dotenv/config";

const router = Router();
const MODEL_ID = "models/gemini-2.5-flash";
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

router.get("/hangout-planner", async (req, res) => {
  const { userId, matchId, city } = req.query as {
    userId?: string;
    matchId?: string;
    city?: string;
  };

  if (!userId || !matchId) {
    return res.status(400).json({ error: "userId and matchId required" });
  }

  try {
    // -------------------------------
    // 1️⃣ Fetch both enriched profiles
    // -------------------------------
    const { data, error } = await supabase
      .from("profiles")
      .select("id,enriched_profile,answers,city")
      .in("id", [userId, matchId]);

    if (error) throw new Error(error.message);
    if (!data || data.length < 2)
      return res.status(404).json({ error: "profiles not found for both users" });

    const user = data.find((d) => d.id === userId);
    const match = data.find((d) => d.id === matchId);

    // -------------------------------
    // 2️⃣ Build prompt for Gemini
    // -------------------------------
    const prompt = `
You are a creative planner for a vibe-based matching app.
Given the personality descriptions of two people, suggest **3 creative hangout ideas**
that fit both of their energies, emotional preferences, and shared vibe.

Each idea must be:
- Short (1–2 sentences)
- Specific and real-world location that we can find on google maps(no fantasy or “AI art galleries”)
- Descriptive of the *vibe* (mood/energy)
- Adaptable to ${city || "their city"}

Return JSON only in this format:

{
  "hangoutIdeas": [
    { "title": "Idea title", "description": "1–2 sentence explanation", "place name": "name of the place/places suggested by you in the description that can be found on google maps" },
    { "title": "...", "description": "..." },
    { "title": "...", "description": "..." }
  ]
}

User A:
${user?.enriched_profile}

User B:
${match?.enriched_profile}
`;

    // -------------------------------
    // 3️⃣ Call Gemini
    // -------------------------------
    const model = genAI.getGenerativeModel({ model: MODEL_ID });
    const result = await model.generateContent(prompt);
    let text = result.response.text();

    if (text.startsWith("```")) {
      text = text.replace(/```json|```/g, "").trim();
    }

    let parsed;
    try {
      parsed = JSON.parse(text);
    } catch (e) {
      console.warn("⚠️ Could not parse JSON, returning raw text");
      parsed = { hangoutIdeas: [{ title: "Free-form suggestion", description: text }] };
    }

    return res.json(parsed);
  } catch (err: any) {
    console.error("❌ Hangout Planner failed:", err.message || err);
    return res.status(500).json({ error: err.message || "internal error" });
  }
});

export default router;
