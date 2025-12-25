import { Router } from "express";
import { buildWhyMatched } from "../lib/whyMatched.js";

const router = Router();

router.get("/test-why-matched", (_req, res) => {
  const userA = {
    thriveWhen: "real conversation",
    recharge: "alone time",
    planningStyle: "scheduled",
    mostYourself: "deep conversation",
  };

  const userB = {
    thriveWhen: "real conversation",
    recharge: "alone time",
    planningStyle: "scheduled",
    mostYourself: "deep conversation",
  };

  const whyMatched = buildWhyMatched(userA, userB);

  res.json({ whyMatched });
});

export default router;
