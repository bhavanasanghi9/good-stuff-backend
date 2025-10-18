
import express from "express";
import cors from "cors";

import onboarding from "./routes/onboarding.js";
import matches from "./routes/matches.js";
import reveal from "./routes/reveal.js";
import proxy from "./routes/proxy.js";
import weather from "./routes/weather.js";

const app = express();
app.use(cors({ origin: true }));
app.use(express.json({ limit: "4mb" }));

app.get("/api/health", (_req, res) => res.json({ ok: true }));
app.use("/api", onboarding);
app.use("/api", matches);
app.use("/api", reveal);
app.use("/api", proxy);
app.use("/api", weather);

app.get("/", (_req, res) => res.send("✅ Good Stuff Backend running! Use /api/* endpoints."));

export default app;

if (process.env.VERCEL !== "1") {
  const port = process.env.PORT || 3000;
  app.listen(port, () => console.log(`API listening on http://localhost:${port}`));
}
