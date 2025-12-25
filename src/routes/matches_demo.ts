
import { Router } from "express";
import type { MatchCard } from "../types.js";

const router = Router();

const demo: MatchCard[] = [
  { id: "m1", name: "Kai",  photo: "https://images.unsplash.com/photo-1517849845537-4d257902454a?q=80&w=1600&auto=format&fit=crop",  social: { handle: "@kai.moves",  url: "https://example.com/kai" },  tags: ["chill", "outdoorsy"], quote: "Golden-hour walks, coffee after." },
  { id: "m2", name: "Rhea", photo: "https://images.unsplash.com/photo-1523859597145-2d2a5d4df7f2?q=80&w=1600&auto=format&fit=crop", social: { handle: "@rhea.wave", url: "https://example.com/rhea" }, tags: ["artsy", "gentle"],   quote: "Museums on rainy days." },
  { id: "m3", name: "Noah", photo: "https://images.unsplash.com/photo-1519340241574-2cec6aef0c01?q=80&w=1600&auto=format&fit=crop", social: { handle: "@noah.wanders", url: "https://example.com/noah" }, tags: ["social", "playful"], quote: "Laugh first, think later." },
  { id: "m4", name: "Mira", photo: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?q=80&w=1600&auto=format&fit=crop", social: { handle: "@mira.draws", url: "https://example.com/mira" }, tags: ["quiet", "kind"],     quote: "Soft places, deep talks." },
  { id: "m5", name: "Jae",  photo: "https://images.unsplash.com/photo-1517841905240-472988babdf9?q=80&w=1600&auto=format&fit=crop",  social: { handle: "@jae.moves",  url: "https://example.com/jae" },  tags: ["adventurous", "sunny"], quote: "Catch me at golden hour." }
];

router.get("/matches", async (req, res) => {
  const { userId } = req.query;
  if (!userId) return res.status(400).json({ error: "userId required" });
  return res.json({ matches: demo });
});

export default router;
