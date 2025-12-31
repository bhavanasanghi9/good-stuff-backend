import { Router } from "express";
import { z } from "zod";
import { embedText } from "../db/embeddings.js";
import { upsertProfile } from "../db/profiles.js";
import { GoogleGenerativeAI } from "@google/generative-ai";
import "dotenv/config";

const router = Router();

/* ----------------------------------------
   1️⃣ Schema
---------------------------------------- */
const schema = z.object({
  photoDataUrl: z.string().nullable().optional(),
  name: z.string().nullable().optional(),
  age: z.number().int().min(18).max(99).optional(),

  city: z.string().nullable().optional(),
  state: z.string().nullable().optional(),
  country: z.string().nullable().optional(),

  answers: z.object({
    // filter-only
    intent: z.string(),

    // embedded + summarized
    thrive: z.string(),
    conversationStyle: z.string(),
    recharge: z.string(),
    planningStyle: z.string(),
    feelMostYourself: z.string(),
  }),
});

/* ----------------------------------------
   2️⃣ Gemini (vibe bio only)
---------------------------------------- */
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");
const MODEL_ID = "models/gemini-2.5-flash";

/* ----------------------------------------
   3️⃣ Helpers
---------------------------------------- */

// used ONLY for vector embedding
function buildEmbeddingText(a: any) {
  return [
    `Thrives when: ${a.thrive}`,
    `Conversation style: ${a.conversationStyle}`,
    `Recharges by: ${a.recharge}`,
    `Planning style: ${a.planningStyle}`,
    `Feels most themselves when: ${a.feelMostYourself}`,
  ].join("\n");
}

// used ONLY for card display
async function generateVibeBio(a: any) {
  if (!process.env.GEMINI_API_KEY) {
    return "Thoughtful, grounded, and values meaningful connection over surface-level interaction.";
  }

  const prompt = `
Write a SHORT vibe bio for a matching app.

Rules:
- 1–2 sentences
- Max 35 words
- Warm, human, specific
- No emojis
- No quotes
- No meta commentary

Inputs:
Thrives when: ${a.thrive}
Conversation style: ${a.conversationStyle}
Recharges by: ${a.recharge}
Planning style: ${a.planningStyle}
Feels most themselves when: ${a.feelMostYourself}

Output ONLY the vibe bio text.
`;

  const model = genAI.getGenerativeModel({ model: MODEL_ID });
  const result = await model.generateContent(prompt);
  const text = result.response.text()?.trim();

  return text?.length
    ? text
    : "Thoughtful, grounded, and values meaningful connection over surface-level interaction.";
}

/* ----------------------------------------
   4️⃣ Route
---------------------------------------- */
router.post("/onboarding", async (req, res) => {
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({
      error: "Invalid payload",
      details: parsed.error.issues,
    });
  }

  const {
    answers,
    photoDataUrl,
    name,
    age,
    city,
    state,
    country,
  } = parsed.data;

  const userId = "u_" + Math.random().toString(36).slice(2, 10);

  /* -------------------------------
     A) Embedding
  ------------------------------- */
  let embedding: number[];
  try {
    embedding = await embedText(buildEmbeddingText(answers));
  } catch (err) {
    console.error("❌ Embedding failed:", err);
    return res.status(500).json({ error: "Embedding failed" });
  }

  /* -------------------------------
     B) Vibe bio
  ------------------------------- */
  let vibeBio: string;
  try {
    vibeBio = await generateVibeBio(answers);
  } catch (err) {
    console.error("❌ Vibe bio failed:", err);
    vibeBio =
      "Thoughtful, grounded, and values meaningful connection over surface-level interaction.";
  }

  /* -------------------------------
     C) Persist profile (FIXED)
  ------------------------------- */
  try {
    await upsertProfile({
      id: userId,
      name: name ?? null,
      age: age ?? null,                     // ✅ NOW SAVED
      photo_data_url: photoDataUrl ?? null,

      answers,
      vibe_bio: vibeBio,                    // ✅ NOW SAVED CORRECTLY
      enriched_profile: null,               // optional, not reused

      embedding,
      city: city ?? null,
      state: state ?? null,
      country: country ?? null,
    });
  } catch (err: any) {
    console.error("❌ Onboarding save failed:", err);
    return res.status(500).json({ error: "Profile save failed" });
  }

  /* -------------------------------
     D) Response
  ------------------------------- */
  return res.json({
    userId,
    reflection: "Your vibe has been beautifully captured.",
    vibeBio,
  });
});

export default router;
