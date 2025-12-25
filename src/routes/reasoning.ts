import { Router } from "express";
import { supabase } from "../db/client.js";
import { GoogleGenerativeAI } from "@google/generative-ai";
import "dotenv/config";

const router = Router();
const MODEL_ID = "gemini-2.5-flash";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

router.get("/match-reasoning", async (req, res) => {
  const { userId, matchId } = req.query as { userId?: string; matchId?: string };

  if (!userId || !matchId) {
    return res.status(400).json({ error: "userId and matchId required" });
  }

  try {
    // ----------------------------------
    // 1️⃣ Fetch both enriched profiles
    // ----------------------------------
    const { data, error } = await supabase
      .from("profiles")
      .select("id,enriched_profile,answers")
      .in("id", [userId, matchId]);

    if (error) throw new Error(error.message);
    if (!data || data.length < 2)
      return res.status(404).json({ error: "profiles not found for both users" });

    const user = data.find((d) => d.id === userId);
    const match = data.find((d) => d.id === matchId);

    // ----------------------------------
    // 2️⃣ Build reasoning prompt
    // ----------------------------------
    const prompt = ` 
    Two people have matched based on their profiles in a vibe-based matching app.
Compare the following two people based on their vibe, personality, and energy as described.
Write a short, warm explanation of *why* they might connect well, and 3 short descriptive "vibe tags"
stating what similarities they could vibe on. 
Return the response strictly as JSON.

{
  "whyTheyVibe": "One sentence describing their shared connection vibe",
  "sharedVibeTags": ["tag1", "tag2", "tag3"]
}

User A:
${user?.enriched_profile}

User B:
${match?.enriched_profile}
`;

    // ----------------------------------
    // 3️⃣ Call Gemini
    // ----------------------------------
    const model = genAI.getGenerativeModel({ model: MODEL_ID });
    const result = await model.generateContent(prompt);
    let text = result.response.text();

    // ----------------------------------
    // 4️⃣ Clean up Markdown-style output
    // ----------------------------------
    if (text.startsWith("```")) {
      text = text.replace(/```json|```/g, "").trim();
    }

    let parsed;
    try {
      parsed = JSON.parse(text);
    } catch (e) {
      console.warn("⚠️ Failed to parse clean JSON, returning raw text");
      parsed = { whyTheyVibe: text, sharedVibeTags: [] };
    }

    return res.json(parsed);
  } catch (err: any) {
    console.error("❌ Reasoning agent failed:", err.message || err);
    return res.status(500).json({ error: err.message || "internal error" });
  }
});

export default router;
