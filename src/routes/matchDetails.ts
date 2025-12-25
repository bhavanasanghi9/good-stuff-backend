import { Router } from "express";
import { supabase } from "../db/client.js";
import { buildWhyMatched } from "../lib/whyMatched.js";
import { GoogleGenerativeAI } from "@google/generative-ai";
import "dotenv/config";

const router = Router();
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
const MODEL_ID = "models/gemini-2.5-pro";

router.get("/match-details", async (req, res) => {
  const { userId, matchId } = req.query as {
    userId?: string;
    matchId?: string;
  };

  if (!userId || !matchId) {
    return res.status(400).json({ error: "userId and matchId required" });
  }

  try {
    // 1️⃣ Fetch both users' answers
    const { data, error } = await supabase
      .from("profiles")
      .select("id, answers")
      .in("id", [userId, matchId]);

    if (error || !data || data.length !== 2) {
      return res.status(404).json({ error: "Profiles not found" });
    }

    const a = data.find((d) => d.id === userId)?.answers;
    const b = data.find((d) => d.id === matchId)?.answers;

    if (!a || !b) {
      return res.status(400).json({ error: "Answers missing" });
    }

    // 2️⃣ Rule-based why matched
    const whyMatched = buildWhyMatched(a, b);

    // 3️⃣ Gemini complementary strength (ONE sentence)
    const prompt = `
Given these two people’s answers, write ONE short sentence (max 15 words)
describing how their personalities complement each other or work well together.

Examples:
- "Your listening + their storytelling = natural flow"
- "You bring calm energy, they bring creative spark - 
   balanced dynamic"
- "Both thoughtful souls who'd rather go deep than 
   stay surface"

User A:
${JSON.stringify(a)}

User B:
${JSON.stringify(b)}
`;

    const model = genAI.getGenerativeModel({ model: MODEL_ID });
    const result = await model.generateContent(prompt);
    const complementaryStrength =
      result.response.text()?.trim() ||
      "Your energies complement each other naturally.";

    return res.json({
      whyMatched,
      complementaryStrength,
    });
  } catch (e: any) {
    console.error("❌ /match-details failed:", e);
    return res.status(500).json({ error: "Internal error" });
  }
});

export default router;
