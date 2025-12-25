import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseServiceRole = process.env.SUPABASE_SERVICE_ROLE!;

if (!supabaseUrl || !supabaseServiceRole) {
  console.error("❌ missing Supabase environment variables");
}

export const supabase = createClient(supabaseUrl, supabaseServiceRole, {
  auth: { persistSession: false },
});
