import { Router } from "express";
import axios from "axios";

const router = Router();

/**
 * POST /api/express-interest
 *
 * Body:
 * {
 *   userId: string,
 *   matchId: string,
 *   city: string
 * }
 */
router.post("/express-interest", async (req, res) => {
  const { userId, matchId, city } = req.body as {
    userId?: string;
    matchId?: string;
    city?: string;
  };

  if (!userId || !matchId || !city) {
    return res.status(400).json({
      error: "userId, matchId, and city are required",
    });
  }

  try {
    // -----------------------------------------
    // 1️⃣ Call Hangout Planner (existing route)
    // -----------------------------------------
    const hangoutRes = await axios.get(
      "http://localhost:3000/api/hangout-planner",
      {
        params: { userId, matchId, city },
      }
    );

    const hangoutIdeas = hangoutRes.data?.hangoutIdeas;

    if (!hangoutIdeas || !Array.isArray(hangoutIdeas)) {
      throw new Error("Invalid hangout planner response");
    }

    // -----------------------------------------
    // 2️⃣ Call Location Mapper (existing route)
    // -----------------------------------------
    const locationRes = await axios.post(
      "http://localhost:3000/api/location-mapper",
      {
        city,
        ideas: hangoutIdeas.map((h: any) => ({
          title: h["place name"] || h.placeName || h.title,
          description: h.description,
        })),
      }
    );

    // -----------------------------------------
    // 3️⃣ Return enriched plans
    // -----------------------------------------
    return res.json({
      success: true,
      hangoutPlans: locationRes.data.ideas,
    });
  } catch (err: any) {
    console.error("❌ Express Interest failed:", err.message || err);
    return res.status(500).json({
      error: err.message || "internal error",
    });
  }
});

export default router;
