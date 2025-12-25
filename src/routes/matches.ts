// import { Router } from "express";
// import { supabase } from "../db/client.js";
// import { findSimilar } from "../db/profiles.js";
// import { buildWhyMatched } from "../lib/whyMatched.js";
// import { generateComplementaryStrength } from "../lib/complementaryStrength.js";

// const router = Router();

// router.get("/matches", async (req, res) => {
//   const { userId, global } = req.query as {
//     userId?: string;
//     global?: string;
//   };

//   if (!userId) {
//     return res.status(400).json({ error: "userId required" });
//   }

//   try {
//     // -----------------------------------
//     // 1️⃣ Fetch user embedding + answers
//     // -----------------------------------
//     const { data: rows, error: fetchErr } = await supabase
//       .from("profiles")
//       .select("id, embedding, answers")
//       .eq("id", userId);

//     if (fetchErr) {
//       throw new Error("Failed to fetch embedding: " + fetchErr.message);
//     }

//     if (!rows || rows.length === 0) {
//       return res.status(404).json({ error: "no profile found for that userId" });
//     }

//     const user = rows[0];

//     // -----------------------------------
//     // 2️⃣ Parse embedding safely
//     // -----------------------------------
//     let userEmbedding: number[] = [];
//     const emb = user.embedding;

//     if (Array.isArray(emb)) {
//       userEmbedding = emb;
//     } else if (typeof emb === "string") {
//       userEmbedding = emb
//         .replace(/[\[\]\(\)]/g, "")
//         .split(",")
//         .map((v: string) => parseFloat(v.trim()))
//         .filter((v) => Number.isFinite(v));
//     } else if (emb && typeof emb === "object") {
//       userEmbedding = Object.values(emb).map((v: any) => Number(v));
//     }

//     userEmbedding = userEmbedding.map((v) =>
//       Number.isFinite(v) ? v : 0
//     );

//     if (!userEmbedding.length) {
//       return res
//         .status(404)
//         .json({ error: "user embedding not found or invalid" });
//     }

//     // -----------------------------------
//     // 3️⃣ Fetch metadata for filtering
//     // -----------------------------------
//     const { data: userMeta } = await supabase
//       .from("profiles")
//       .select("answers, city, state, country")
//       .eq("id", userId)
//       .maybeSingle();

//     const filters = {
//       connection: userMeta?.answers?.connection,
//       city: userMeta?.city,
//       state: userMeta?.state,
//       country: userMeta?.country,
//     };

//     // -----------------------------------
//     // 4️⃣ Find similar users
//     // -----------------------------------
//     const matches = await findSimilar(
//       userEmbedding,
//       5,
//       userId,
//       filters,
//       global === "true"
//     );

//     // -----------------------------------
//     // 5️⃣ Shape match cards (FINAL)
//     // -----------------------------------

//     const formatted = [];

// for (const m of matches) {
//   const matchPercent = Math.round((m.similarity || 0) * 100);

//   let complementaryStrength = null;

//   try {
//     complementaryStrength = await generateComplementaryStrength(
//       userMeta?.answers || {},
//       m.answers || {}
//     );
//   } catch (e) {
//     console.warn("⚠️ Gemini complementary strength failed");
//   }

//   formatted.push({
//     id: m.id,
//     name: m.name || "Match",
//     similarity: matchPercent,
//     photo:
//       m.photo_data_url ||
//       "https://images.unsplash.com/photo-1517841905240-472988babdf9?q=80&w=1600&auto=format&fit=crop",

//     whyMatched: buildWhyMatched(userMeta?.answers || {}, m.answers || {}),
//     complementaryStrength,
//   });
// }


//     return res.json({ matches: formatted });
//   } catch (e: any) {
//     console.error("❌ /matches failed:", e.message || e);
//     return res.status(500).json({ error: "internal error" });
//   }
// });

// export default router;


import { Router } from "express";
import { supabase } from "../db/client.js";
import { findSimilar } from "../db/profiles.js";

const router = Router();

router.get("/matches", async (req, res) => {
  const { userId, global } = req.query as {
    userId?: string;
    global?: string;
  };

  if (!userId) {
    return res.status(400).json({ error: "userId required" });
  }

  try {
    // 1️⃣ Fetch user embedding
    const { data: rows, error } = await supabase
      .from("profiles")
      .select("id, embedding")
      .eq("id", userId);

    if (error || !rows?.length) {
      return res.status(404).json({ error: "User profile not found" });
    }

    const row = rows[0];

    // 2️⃣ Parse embedding safely
    let userEmbedding: number[] = [];

    if (Array.isArray(row.embedding)) {
      userEmbedding = row.embedding;
    } else if (typeof row.embedding === "string") {
      userEmbedding = row.embedding
        .replace(/[\[\]\(\)]/g, "")
        .split(",")
        .map((v: string) => parseFloat(v.trim()))
        .filter((v) => Number.isFinite(v));
    }

    if (!userEmbedding.length) {
      return res.status(500).json({ error: "Invalid embedding" });
    }

    // 3️⃣ Fetch filters
    const { data: meta } = await supabase
      .from("profiles")
      .select("answers, city, state, country")
      .eq("id", userId)
      .maybeSingle();

    const filters = {
      connection: meta?.answers?.connection,
      city: meta?.city,
      state: meta?.state,
      country: meta?.country,
    };

    // 4️⃣ Find similar profiles (LIMIT = 3)
    const matches = await findSimilar(
      userEmbedding,
      3,
      userId,
      filters,
      global === "true"
    );

    // 5️⃣ Shape for match cards
    const formatted = matches.map((m: any) => ({
      id: m.id,
      name: m.name,
      age: m.age,
      photo:
        m.photo_data_url ||
        "https://images.unsplash.com/photo-1517841905240-472988babdf9",
      matchPercentage: Math.round((m.similarity || 0) * 100),
      vibeBio: m.vibe_bio, // your short persona line
    }));

    return res.json({ matches: formatted });
  } catch (e: any) {
    console.error("❌ /matches failed:", e);
    return res.status(500).json({ error: "Internal error" });
  }
});

export default router;
