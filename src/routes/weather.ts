
import { Router } from "express";
import { z } from "zod";
import { get7Day, suggestBestDay } from "../lib/weather.js";

const router = Router();

const q = z.object({ lat: z.coerce.number(), lon: z.coerce.number() });

router.get("/weather", async (req, res) => {
  const parse = q.safeParse(req.query);
  if (!parse.success) return res.status(400).json({ error: "lat & lon required" });
  const { lat, lon } = parse.data;
  try {
    const days = await get7Day(lat, lon);
    const { best, indoorRecommended } = suggestBestDay(days);
    return res.json({ days, suggested: { best, indoorRecommended } });
  } catch (e:any) {
    return res.status(500).json({ error: e.message || "weather error" });
  }
});

export default router;
