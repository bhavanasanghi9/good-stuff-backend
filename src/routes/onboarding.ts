// import { Router } from "express";
// import { z } from "zod";
// import { embedText } from "../db/embeddings.js";
// import { upsertProfile } from "../db/profiles.js";
// import { GoogleGenerativeAI } from "@google/generative-ai";
// import "dotenv/config";

// const router = Router();

// // ----------------------
// // 1️⃣ Define schema
// // ----------------------
// const schema = z.object({
//   photoDataUrl: z.string().nullable().optional(),
//   answers: z.object({
//     alive: z.string(),          // When do you feel most alive?
//     peace: z.string(),          // Where do you feel most at peace?
//     connection: z.string(),     // What kind of connection are you hoping to find? (filter)
//     soundtrack: z.string(),     // Ideal evening soundtrack
//     atmosphere: z.string(),     // What kind of atmosphere helps you open up?
//     recharge: z.string(),       // How do you recharge after a long week?
//     understood: z.string(),     // What’s one thing you wish people understood about you?
//   }),
//   city: z.string().optional(),
//   lat: z.number().optional(),
//   lon: z.number().optional(),
// });

// // ----------------------
// // 2️⃣ Initialize Gemini (2.5-Pro model)
// // ----------------------
// const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
// const MODEL_ID = "models/gemini-2.5-flash";

// // ----------------------
// // 3️⃣ Route handler
// // ----------------------
// router.post("/onboarding", async (req, res) => {
//   const parse = schema.safeParse(req.body);
//   if (!parse.success) {
//     return res
//       .status(400)
//       .json({ error: "Invalid payload", details: parse.error.issues });
//   }

//   const { answers, photoDataUrl, city, lat, lon } = parse.data;

//   // -----------------------------------------
//   // Step 1: Combine all answers into one text
//   // -----------------------------------------
//   const combinedAnswers = Object.entries(answers)
//     .map(([key, value]) => `${key}: ${value}`)
//     .join("\n");

//   // -----------------------------------------
//   // Step 2: Ask Gemini to enrich the user profile
//   // -----------------------------------------
//   const prompt = `
// You are analyzing a user's answers from a vibe-based matching app.
// Summarize what these answers reveal about this person's vibe, personality, energy level,
// social preferences, and emotional values in 2–3 short, natural paragraphs.
// Keep the tone warm, descriptive, and human — like you're introducing a person with intuition and empathy.

// Answers:
// ${combinedAnswers}
// `;

//   let enrichedProfile = combinedAnswers;
//   try {
//     const model = genAI.getGenerativeModel({ model: MODEL_ID });
//     const result = await model.generateContent(prompt);
//     const text = result.response.text();
//     enrichedProfile = text?.trim() || combinedAnswers;

//     console.log("✨ Gemini enriched text:", enrichedProfile);
//   } catch (e: any) {
//     console.error("❌ Gemini enrichment failed:", e.message || e);
//   }

//   // -----------------------------------------
//   // Step 3: Create embedding from enriched text
//   // -----------------------------------------
//   let embedding: number[] = [];
//   try {
//     embedding = await embedText(enrichedProfile);
//   } catch (e: any) {
//     console.error("❌ Embedding generation failed:", e.message || e);
//   }

//   // -----------------------------------------
//   // Step 4: Generate user ID + upsert to Supabase
//   // -----------------------------------------
//   const userId = "u_" + Math.random().toString(36).slice(2, 10);
//   console.log("🧠 Saving enriched_profile length:", enrichedProfile.length);
  
//   try {
//     await upsertProfile({
//       id: userId,
//       name: null,
//       photo_data_url: photoDataUrl || null,
//       answers,
//       enriched_profile: enrichedProfile,
//       embedding,
//       city,
//       lat,
//       lon,
//     });
//     console.log(`✅ Stored enriched profile for ${userId}`);
//   } catch (err: any) {
//     console.error("❌ Onboarding save failed:", err.message || err);
//   }

//   // -----------------------------------------
//   // Step 5: Send reflection back
//   // -----------------------------------------
//   return res.json({
//     userId,
//     reflection: "Your vibe has been beautifully captured ✨",
//     enrichedProfile,
//   });
// });

// export default router;

import { Router } from "express";
import { z } from "zod";
import { embedText } from "../db/embeddings.js";
import { upsertProfile } from "../db/profiles.js";
import { GoogleGenerativeAI } from "@google/generative-ai";
import "dotenv/config";

const router = Router();

// ----------------------------------------
// STEP 1A: MCQ schema (strings only)
// ----------------------------------------
const schema = z.object({
  photoDataUrl: z.string().nullable().optional(),

  // Optional for later UI (not required yet)
  name: z.string().nullable().optional(),
  age: z.number().int().min(18).max(99).optional(),

  // Location (keep simple like you wanted)
  city: z.string().nullable().optional(),
  state: z.string().nullable().optional(),
  country: z.string().nullable().optional(),

  answers: z.object({
    // Q1: FILTER (do not embed)
    intent: z.string(),

    // Q2–Q6: used for embedding + match logic
    thrive: z.string(),
    conversationStyle: z.string(),
    recharge: z.string(),
    planningStyle: z.string(),
    feelMostYourself: z.string(),
  }),
});

// ----------------------------------------
// STEP 1B: Gemini for short “vibe bio”
// ----------------------------------------
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");
const MODEL_ID = "models/gemini-2.5-flash";

// Build the text that will be embedded.
// IMPORTANT: We exclude intent (filter-only).
function buildEmbeddingText(answers: any) {
  return [
    `Thrives when: ${answers.thrive}`,
    `Conversation style: ${answers.conversationStyle}`,
    `Recharges by: ${answers.recharge}`,
    `Planning style: ${answers.planningStyle}`,
    `Feels most themselves when: ${answers.feelMostYourself}`,
  ].join("\n");
}

async function generateVibeSummary(answers: any) {
  // If no API key, fallback safely
  if (!process.env.GEMINI_API_KEY) {
    return "A thoughtful presence with a clear vibe and a genuine way of connecting.";
  }

  const prompt = `
You are writing a SHORT vibe bio for a dating/friendship matching app.

Write EXACTLY 1–2 sentences (max 35 words total).
Tone: warm, human, specific, not cringe.
No emojis.
No quotes.
No JSON.
No bullet points.
Do NOT mention “the user” or “this person”.

Use these MCQ answers:

Thrives when: ${answers.thrive}
Conversation style: ${answers.conversationStyle}
Recharges by: ${answers.recharge}
Planning style: ${answers.planningStyle}
Feels most themselves when: ${answers.feelMostYourself}

Output only the vibe bio sentence(s).
`;

  const model = genAI.getGenerativeModel({ model: MODEL_ID });
  const result = await model.generateContent(prompt);
  const text = result.response.text()?.trim() || "";
  return text.length ? text : "A thoughtful presence with a clear vibe and a genuine way of connecting.";
}

router.post("/onboarding", async (req, res) => {
  const parse = schema.safeParse(req.body);
  if (!parse.success) {
    return res.status(400).json({
      error: "Invalid payload",
      details: parse.error.issues,
    });
  }

  const { answers, photoDataUrl, name, age, city, state, country } = parse.data;

  const userId = "u_" + Math.random().toString(36).slice(2, 10);

  // -------------------------------
  // 1) Create embedding from answers only
  // -------------------------------
  const embeddingText = buildEmbeddingText(answers);

  let embedding: number[] = [];
  try {
    embedding = await embedText(embeddingText);
  } catch (e: any) {
    console.error("❌ Embedding generation failed:", e?.message || e);
    return res.status(500).json({ error: "Embedding generation failed" });
  }

  // -------------------------------
  // 2) Gemini short vibe bio (NOT used for matching)
  // -------------------------------
  let vibeBio = "";
  try {
    vibeBio = await generateVibeSummary(answers);
  } catch (e: any) {
    console.error("❌ Gemini vibe bio failed:", e?.message || e);
    // fallback
    vibeBio = "A thoughtful presence with a clear vibe and a genuine way of connecting.";
  }

  // -------------------------------
  // 3) Save to Supabase
  // -------------------------------
  try {
    await upsertProfile({
      id: userId,
      name: name ?? null,
      age: age ?? null,
      photo_data_url: photoDataUrl ?? null,

      answers, // keep raw MCQ answers
      enriched_profile: vibeBio, // reuse this column as “vibe bio”

      embedding, // computed from answers only
      city: city ?? null,
      state: state ?? null,
      country: country ?? null,
    });
  } catch (e: any) {
    console.error("❌ Onboarding save failed:", e?.message || e);
    return res.status(500).json({ error: e?.message || "Onboarding save failed" });
  }

  return res.json({
    userId,
    reflection: "Your vibe has been beautifully captured ✨",
    vibeBio, // show this to frontend for the card
  });
});

export default router;
