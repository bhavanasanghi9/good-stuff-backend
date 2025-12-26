import { Router } from "express";
import fetch from "node-fetch";
import "dotenv/config";

const router = Router();

const GOOGLE_API_KEY = process.env.GOOGLE_API_KEY!;

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
    const url = `https://maps.googleapis.com/maps/api/place/photo?maxwidth=800&photo_reference=${encodeURIComponent(
      ref
    )}&key=${GOOGLE_API_KEY}`;

    const response = await fetch(url);

    if (!response.ok) {
      return res.status(404).json({ error: "photo not found" });
    }

    // Pass content-type through
    const contentType = response.headers.get("content-type");
    if (contentType) {
      res.setHeader("Content-Type", contentType);
    }

    // Stream image directly
    response.body.pipe(res);
  } catch (err: any) {
    console.error("❌ Photo proxy failed:", err.message || err);
    return res.status(500).json({ error: "failed to fetch photo" });
  }
});

export default router;
