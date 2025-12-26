import "dotenv/config";
import express from "express";
import cors from "cors";
import { supabase } from "./db/client.js";
import hangoutPlanner from "./routes/hangoutPlanner.js";
import locationMapper from "./routes/locationMapper.js";
import fullMatchPlan from "./routes/fullMatchPlan.js";
import matchDetails from "./routes/matchDetails.js";
import { buildWhyMatched } from "./lib/whyMatched.js";
import expressInterest from "./routes/expressInterest.js";
import placePhotoRouter from "./routes/placePhoto.js";


// ----------------------
// ✅ Initialize Express first
// ----------------------
const app = express();
app.use(cors({ origin: true }));
app.use(express.json({ limit: "4mb" }));
app.use("/api", hangoutPlanner);
app.use("/api", locationMapper);
app.use("/api", fullMatchPlan);
app.use("/api", matchDetails);
app.use("/api", expressInterest);
app.use("/api", placePhotoRouter);



// ----------------------
// ✅ Import routes AFTER app is defined
// ----------------------
import onboarding from "./routes/onboarding.js";
import matches from "./routes/matches.js";
import reveal from "./routes/reveal.js";
import proxy from "./routes/proxy.js";
import weather from "./routes/weather.js";
import reasoning from "./routes/reasoning.js"; // 👈 move here, not before app

// ----------------------
// ✅ Register routes
// ----------------------
app.get("/api/health", (_req, res) => res.json({ ok: true }));
app.use("/api", onboarding);
app.use("/api", matches);
app.use("/api", reveal);
app.use("/api", proxy);
app.use("/api", weather);
app.use("/api", reasoning); // 👈 register after all

app.get("/", (_req, res) =>
  res.send("✅ Good Stuff Backend running! Use /api/* endpoints.")
);

export default app;

// ----------------------
// ✅ Local run config
// ----------------------
if (process.env.VERCEL !== "1") {
  const port = process.env.PORT || 3000;
  app.listen(port, () =>
    console.log(`API listening on http://localhost:${port}`)
  );
}

console.log("Supabase URL:", process.env.SUPABASE_URL);

// ----------------------
// ✅ Debug endpoint
// ----------------------
app.get("/api/debug-tables", async (req, res) => {
  const { data, error } = await supabase.from("profiles").select("id").limit(5);
  res.json({ data, error });
});

// ----------------------
// ✅ Gemini test endpoint
// ----------------------
import { GoogleGenerativeAI } from "@google/generative-ai";

app.get("/api/test-gemini", async (_req, res) => {
  try {
    const hasKey = !!process.env.GEMINI_API_KEY;
    const model = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!).getGenerativeModel({
      model: "gemini-1.5-flash",
    });

    const result = await model.generateContent("Reply with the single word: OK");
    const text = result.response?.text?.() ?? "";

    res.json({
      hasEnvKey: hasKey,
      rawText: text,
    });
  } catch (e: any) {
    console.error("❌ /api/test-gemini failed", e?.message || e);
    res.status(500).json({
      error: e?.message || String(e),
      hasEnvKey: !!process.env.GEMINI_API_KEY,
    });
  }
});

