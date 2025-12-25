import "dotenv/config";
import { embedText } from "./db/embeddings.js";
import { upsertProfile, findSimilar } from "./db/profiles.js";

(async () => {
  const embedding = await embedText("Golden-hour walks, cozy cafés, soft lo-fi.");
  await upsertProfile({
    id: "u_test1",
    name: "Test User 1",
    photo_data_url: null,
    answers: { alive: "golden-hour walks", intent: "something real" },
    embedding,
  });

  const results = await findSimilar(embedding, 5, "u_test1");
  console.log(results);

  process.exit(0);
})();
