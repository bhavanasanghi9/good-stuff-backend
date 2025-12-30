import { Router } from "express";
import fetch from "node-fetch";
import "dotenv/config";

const router = Router();

// ✅ MUST match the key used everywhere else
const GOOGLE_MAPS_API_KEY = process.env.GOOGLE_MAPS_API_KEY!;

/**
 * GET /api/place-photo?ref=PHOTO_REFERENCE
 *
 * Streams Google Places photo without exposing API key
 */
router.get("/place-photo", async (req, res) => {
  const { ref } = req.query as { ref?: string };

  if (!ref) {
    return res.status(400).json({ error: "photo reference required" });
  }

  try {
    const googleUrl =
      "https://maps.googleapis.com/maps/api/place/photo" +
      `?maxwidth=800&photo_reference=${encodeURIComponent(ref)}` +
      `&key=${GOOGLE_MAPS_API_KEY}`;

    const response = await fetch(googleUrl);

    if (!response.ok || !response.body) {
      console.error("❌ Google photo fetch failed:", response.status);
      return res.status(404).json({ error: "photo not found" });
    }

    // ✅ Important: tell browser this is an image
    res.setHeader(
      "Content-Type",
      response.headers.get("content-type") || "image/jpeg"
    );

    // ✅ Stream image bytes directly
    response.body.pipe(res);
  } catch (err: any) {
    console.error("❌ Photo proxy failed:", err?.message || err);
    return res.status(500).json({ error: "failed to fetch photo" });
  }
});

export default router;
