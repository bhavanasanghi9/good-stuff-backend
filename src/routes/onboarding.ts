
import { Router } from "express";
import { z } from "zod";
import type { OnboardingInput } from "../types.js";

const router = Router();

const schema = z.object({
  photoDataUrl: z.string().optional(),
  answers: z.object({
    alive: z.string(),
    intent: z.string(),
    soundtrack: z.string(),
    hangout: z.array(z.string()),
    peace: z.string(),
    aboutYou: z.string(),
  }),
  city: z.string().optional(),
  lat: z.number().optional(),
  lon: z.number().optional(),
});

router.post("/onboarding", async (req, res) => {
  const parse = schema.safeParse(req.body as OnboardingInput);
  if (!parse.success) {
    return res.status(400).json({ error: "Invalid payload", details: parse.error.issues });
  }
  const { answers } = parse.data;

  const a = answers.alive.toLowerCase();
  const i = answers.intent.toLowerCase();
  const mood = a.includes("night") || a.includes("late") ? "late‑night energy" : a.includes("sunrise") || a.includes("morning") ? "morning light" : "golden‑hour glow";
  const tone = i.includes("real") ? "grounded and open" : i.includes("friend") ? "warm and curious" : "playful and present" ;
  const reflection = `You carry ${mood} — ${tone}. We love that.`;

  const userId = "u_" + Math.random().toString(36).slice(2, 10);
  return res.json({ userId, reflection });
});

export default router;
