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
  photoDataUrl: z.string().trim().nullable().optional(),
  name: z.string().trim().nullable().optional(),
  age: z.number().int().min(18).max(99).optional(),

  city: z.string().trim().nullable().optional(),
  state: z.string().trim().nullable().optional(),
  country: z.string().trim().nullable().optional(),

  answers: z.object({
    intent: z.string(),

    thrive: z.string(),
    conversationStyle: z.string(),
    recharge: z.string(),
    planningStyle: z.string(),
    feelMostYourself: z.string(),
  }),
});

/* ----------------------------------------
   2️⃣ Gemini setup
---------------------------------------- */
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");
const MODEL_ID = "models/gemini-2.5-flash";

/* ----------------------------------------
   3️⃣ Helpers
---------------------------------------- */

// Used ONLY for vector embedding
function buildEmbeddingText(a: any) {
  return [
    `Thrives when: ${a.thrive}`,
    `Conversation style: ${a.conversationStyle}`,
    `Recharges by: ${a.recharge}`,
    `Planning style: ${a.planningStyle}`,
    `Feels most themselves when: ${a.feelMostYourself}`,
  ].join("\n");
}

// Short card summary (1–2 sentences)
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

// Long personality summary (used for hangouts + reasoning)
async function generateEnrichedProfile(a: any) {
  if (!process.env.GEMINI_API_KEY) {
    return `
A thoughtful person who values meaningful connection and enjoys engaging conversations.
They recharge intentionally, appreciate emotional depth, and feel most themselves
when they can show up authentically with people they trust.
`.trim();
  }

  const prompt = `
You are writing a natural personality summary for a human connection app.

Write ONE cohesive paragraph that captures:
- personality
- social energy
- conversation style
- how they like to spend time
- emotional values

Rules:
- 60–120 words
- Third person
- Natural, warm, human tone
- NO bullet points
- NO headings
- NO emojis
- NO meta commentary

Inputs:
Thrives when: ${a.thrive}
Conversation style: ${a.conversationStyle}
Recharges by: ${a.recharge}
Planning style: ${a.planningStyle}
Feels most themselves when: ${a.feelMostYourself}

Output ONLY the paragraph.
`;

  const model = genAI.getGenerativeModel({ model: MODEL_ID });
  const result = await model.generateContent(prompt);
  const text = result.response.text()?.trim();

  return text?.length
    ? text
    : `
A grounded and curious individual who values authentic interaction and enjoys
forming meaningful connections through thoughtful conversation.
`.trim();
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
  } catch {
    vibeBio =
      "Thoughtful, grounded, and values meaningful connection over surface-level interaction.";
  }

  /* -------------------------------
     C) Enriched profile
  ------------------------------- */
  let enrichedProfile: string;
  try {
    enrichedProfile = await generateEnrichedProfile(answers);
  } catch {
    enrichedProfile =
      "A thoughtful person who values meaningful connection and authentic conversation.";
  }

  /* -------------------------------
     D) Persist profile (CRITICAL FIX)
  ------------------------------- */
  try {
    await upsertProfile({
      id: userId,
      name: name ?? null,
      age: age ?? null,

      // 🔥 FIX: never store empty strings
      photo_data_url:
        photoDataUrl && photoDataUrl.length > 0
          ? photoDataUrl
          : null,

      answers,
      vibe_bio: vibeBio,
      enriched_profile: enrichedProfile,

      embedding,
      city: city ?? null,
      state: state ?? null,
      country: country ?? null,
    });
  } catch (err) {
    console.error("❌ Onboarding save failed:", err);
    return res.status(500).json({ error: "Profile save failed" });
  }

  /* -------------------------------
     E) Response
  ------------------------------- */
  return res.json({
    userId,
    reflection: "Your vibe has been beautifully captured.",
    vibeBio,
  });
});

export default router;
