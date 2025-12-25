import "dotenv/config";
import { embedText } from "./db/embeddings.js";

(async () => {
  const v = await embedText("Golden-hour walks, cozy cafés, soft lo-fi.");
  console.log("length:", v.length);
  console.log("sample:", v.slice(0, 5));
  process.exit(0);
})();
