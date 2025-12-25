import "dotenv/config";
import { supabase } from "./db/client.js";

(async () => {
  // Try to fetch one row from the profiles table
  const { data, error } = await supabase.from("profiles").select("*").limit(1);

  if (error) {
    console.error("❌ Connection failed:", error.message);
  } else {
    console.log("✅ Connected to Supabase!");
    console.log("Returned rows:", data);
  }

  process.exit(0);
})();
