
import { Router } from "express";
import { z } from "zod";
import { buildIdeas } from "../lib/ideas.js";

const router = Router();

const schema = z.object({
  matchId: z.string(),
  city: z.string().optional(),
  lat: z.number().optional(),
  lon: z.number().optional(),
  hangout: z.array(z.string()).optional().default([]),
  peace: z.string().optional().default("")
});

router.post("/reveal", async (req, res) => {
  const parse = schema.safeParse(req.body);
  if (!parse.success) return res.status(400).json({ error: "Invalid payload", details: parse.error.issues });
  const { matchId, city, lat, lon, hangout, peace } = parse.data;

  const fallbackCity = process.env.DEFAULT_CITY || "Chicago, IL";
  const bias = (lat && lon) ? { lat, lon } : (process.env.DEFAULT_LAT && process.env.DEFAULT_LON ? { lat: Number(process.env.DEFAULT_LAT), lon: Number(process.env.DEFAULT_LON) } : undefined);

  try {
    const ideas = await buildIdeas(city || fallbackCity, hangout, peace, bias);
    return res.json({ matchId, ideas, llm: Boolean(process.env.GEMINI_API_KEY) });
  } catch (e:any) {
    return res.status(500).json({ error: e.message || "Failed to build ideas" });
  }
});

export default router;
