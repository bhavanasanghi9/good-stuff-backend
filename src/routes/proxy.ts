
import { Router } from "express";
import fetch from "node-fetch";
import { assertEnv } from "../lib/util.js";

const router = Router();

router.get("/proxy/photo", async (req, res) => {
  const API_KEY = assertEnv("GOOGLE_MAPS_API_KEY");
  const ref = String(req.query.ref || "");
  const maxwidth = Number(req.query.maxwidth || 800);
  if (!ref) return res.status(400).send("Missing ref");
  const url = `https://maps.googleapis.com/maps/api/place/photo?maxwidth=${maxwidth}&photo_reference=${encodeURIComponent(ref)}&key=${API_KEY}`;
  const upstream = await fetch(url);
  res.setHeader("Content-Type", upstream.headers.get("content-type") || "image/jpeg");
  res.setHeader("Cache-Control", "public, max-age=86400");
  // @ts-ignore
  upstream.body?.pipe(res);
});

export default router;
