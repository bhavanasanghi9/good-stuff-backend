import { Router } from "express";
import { supabase } from "../db/client.js";
import { GoogleGenerativeAI } from "@google/generative-ai";
import fetch from "node-fetch";
import "dotenv/config";

const router = Router();
const MODEL_ID = "models/gemini-2.5-flash";
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
const GOOGLE_API_KEY = process.env.GOOGLE_MAPS_API_KEY!;

/**
 * Shared internal implementation
 */
async function generateFullMatchPlan({
  userId,
  matchId,
  city,
}: {
  userId: string;
  matchId: string;
  city?: string;
}) {
  // --------------------------------------------------
  // 1️⃣ Fetch enriched profiles
  // --------------------------------------------------
  const { data, error } = await supabase
    .from("profiles")
    .select("id, enriched_profile, city")
    .in("id", [userId, matchId]);

  if (error) throw new Error(error.message);
  if (!data || data.length < 2) {
    throw new Error("profiles not found for both users");
  }

  const user = data.find((d) => d.id === userId);
  const match = data.find((d) => d.id === matchId);

  // --------------------------------------------------
  // 2️⃣ Reasoning agent
  // --------------------------------------------------
  const reasoningPrompt = `
You are analyzing two people's vibe profiles.
Write ONE short, warm sentence (max 25 words) explaining why they would naturally connect.
Also list 2-3 short shared vibe tags (each 1–3 words).

Return JSON only:
{
  "whyTheyVibe": "...",
  "sharedVibeTags": ["tag1", "tag2", "tag3"]
}

Person A:
${user?.enriched_profile}

Person B:
${match?.enriched_profile}
`;

  const reasoningModel = genAI.getGenerativeModel({ model: MODEL_ID });
  const reasoningResult = await reasoningModel.generateContent(reasoningPrompt);
  let reasoningText = reasoningResult.response.text().trim();

  if (reasoningText.startsWith("```")) {
    reasoningText = reasoningText.replace(/```json|```/g, "").trim();
  }

  let reasoningParsed: any;
  try {
    reasoningParsed = JSON.parse(reasoningText);
  } catch {
    reasoningParsed = {
      whyTheyVibe: reasoningText,
      sharedVibeTags: [],
    };
  }

  // --------------------------------------------------
  // 3️⃣ Hangout planner
  // --------------------------------------------------
  const hangoutPrompt = `
You are a creative planner for a vibe-based matching app.
Given the personalities below, suggest 3 short, real-world hangout ideas that fit both of their shared energy and mood.
Each idea must include:
- a descriptive title
- a 1–2 sentence description
- a specific place name or combination that exists in ${city || user?.city || "their city"}.

Return JSON only:
{
  "hangoutIdeas": [
    {"title": "...", "description": "...", "placeName": "..."},
    {"title": "...", "description": "...", "placeName": "..."},
    {"title": "...", "description": "...", "placeName": "..."}
  ]
}

User A:
${user?.enriched_profile}

User B:
${match?.enriched_profile}
`;

  const hangoutModel = genAI.getGenerativeModel({ model: MODEL_ID });
  const hangoutResult = await hangoutModel.generateContent(hangoutPrompt);
  let hangoutText = hangoutResult.response.text();

  if (hangoutText.startsWith("```")) {
    hangoutText = hangoutText.replace(/```json|```/g, "").trim();
  }

  let hangoutsParsed: any;
  try {
    hangoutsParsed = JSON.parse(hangoutText);
  } catch {
    hangoutsParsed = { hangoutIdeas: [] };
  }

  // --------------------------------------------------
  // 4️⃣ Location mapper
  // --------------------------------------------------
  const ideas = hangoutsParsed.hangoutIdeas || [];
  const mappedIdeas = [];

  for (const idea of ideas) {
    const query = `${idea.placeName || idea.title} ${
      city || user?.city || ""
    }`.trim();

    const url = `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${encodeURIComponent(
      query
    )}&key=${GOOGLE_API_KEY}`;

    const resp = await fetch(url);
    const json = await resp.json();

    if (!json.results || json.results.length === 0) {
      mappedIdeas.push({ ...idea, photo: null, mapsUrl: null });
      continue;
    }

    const best = json.results[0];
    let photoUrl = null;

    if (best.photos?.length > 0) {
      const ref = best.photos[0].photo_reference;
      photoUrl = `/api/place-photo?ref=${ref}`;
    }

    const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
      best.name
    )}&query_place_id=${best.place_id}`;

    mappedIdeas.push({
      ...idea,
      placeName: best.name,
      address: best.formatted_address,
      photo: photoUrl,
      mapsUrl,
    });
  }

  return {
    ...reasoningParsed,
    hangoutIdeas: mappedIdeas,
  };
}

/**
 * GET /api/full-match-plan
 */
router.get("/full-match-plan", async (req, res) => {
  const { userId, matchId, city } = req.query as {
    userId?: string;
    matchId?: string;
    city?: string;
  };

  if (!userId || !matchId) {
    return res.status(400).json({ error: "userId and matchId required" });
  }

  try {
    const result = await generateFullMatchPlan({ userId, matchId, city });
    return res.json(result);
  } catch (err: any) {
    console.error("❌ full-match-plan GET failed:", err.message || err);
    return res.status(500).json({ error: err.message || "internal error" });
  }
});

/**
 * POST /api/full-match-plan
 */
router.post("/full-match-plan", async (req, res) => {
  const { userId, matchId, city } = req.body as {
    userId?: string;
    matchId?: string;
    city?: string;
  };

  if (!userId || !matchId) {
    return res.status(400).json({ error: "userId and matchId required" });
  }

  try {
    const result = await generateFullMatchPlan({ userId, matchId, city });
    return res.json(result);
  } catch (err: any) {
    console.error("❌ full-match-plan POST failed:", err.message || err);
    return res.status(500).json({ error: err.message || "internal error" });
  }
});

export default router;
