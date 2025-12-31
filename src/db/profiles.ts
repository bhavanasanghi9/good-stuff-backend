import { supabase } from "./client.js";

/**
 * The Profile shape used in Supabase.
 */
export type Profile = {
  id: string;
  name?: string | null;
  age?: number | null;
  photo_data_url?: string | null;

  answers: Record<string, any>;

  vibe_bio?: string | null;

  embedding?: number[] | null;
  enriched_profile?: string | null;
  city?: string | null;
};


/**
 * ✅ Upserts (inserts or updates) a profile with enriched text + embedding.
 */
export async function upsertProfile(p: Profile) {
  try {
    const { error } = await supabase
      .from("profiles")
      .upsert(
  {
    id: p.id,
    name: p.name || null,
    age: p.age || null,              // ✅ ADD THIS
    photo_data_url: p.photo_data_url || null,
    answers: p.answers || {},
    vibe_bio: p.vibe_bio || null,    // ✅ ADD THIS
    enriched_profile: p.enriched_profile || null,
    embedding: p.embedding || null,
    city: p.city || null,
    lat: p.lat || null,
    lon: p.lon || null,
    updated_at: new Date().toISOString(),
  },
  { onConflict: "id" }
);


    if (error) throw new Error("❌ upsertProfile failed: " + error.message);

    console.log(`✅ upsertProfile: stored ${p.id}`);
  } catch (e: any) {
    console.error("❌ upsertProfile failed:", e.message || e);
    throw e;
  }
}

/**
 * Fetches a profile by id (excluding the embedding for brevity).
 */
export async function getProfile(id: string) {
  const { data, error } = await supabase
    .from("profiles")
    .select("id,name,photo_data_url,answers,enriched_profile,city,lat,lon")
    .eq("id", id)
    .maybeSingle();

  if (error) throw new Error("❌ getProfile failed: " + error.message);
  return data;
}

/**
 * Finds top-N similar profiles using the SQL function `match_profiles()`.
 */
// export async function findSimilar(
//   embedding: number[],
//   limit = 5,
//   excludeUserId?: string
// ) {
//   const sanitized = embedding.filter(
//     (v) => typeof v === "number" && isFinite(v)
//   );

//   const { data, error } = await supabase.rpc("match_profiles", {
//     query_embedding: sanitized,
//     match_count: limit,
//     exclude_user_id: excludeUserId ?? null,
//   });

//   if (error) {
//     throw new Error("❌ findSimilar failed: " + error.message);
//   }

//   return data || [];
// }

/**
 * Finds top-N similar profiles using the SQL function `match_profiles()`.
 * Supports relaxed city/state/country filtering and global toggle.
 */

export async function findSimilar(
  embedding: number[],
  limit = 5,
  excludeUserId?: string,
  filters?: {
    connection?: string | null;
    city?: string | null;
    state?: string | null;
    country?: string | null;
  },
  globalMode = false
) {
  try {
    // ✅ 1. Clean the embedding before sending to Supabase
    const sanitized = embedding.filter(
      (v) => typeof v === "number" && isFinite(v)
    );

    // ✅ 2. Call the Supabase RPC (Postgres function)
    const { data, error } = await supabase.rpc("match_profiles", {
      query_embedding: sanitized,
      match_count: limit * 3, // fetch more to filter later
      exclude_user_id: excludeUserId ?? null,
    });

    if (error) {
      throw new Error("❌ findSimilar failed: " + error.message);
    }

    let matches = data || [];

    // ✅ 3. If global mode is ON, skip all filters
    if (globalMode) {
      console.log("🌍 Global mode enabled — returning all closest matches");
      return matches.slice(0, limit);
    }

    // ✅ 4. Apply relaxed filters (prioritize city/state but don’t exclude all)
    matches = matches.filter((m: any) => {
      const ans = m.answers || {};

      const connOk =
        !filters?.connection ||
        (ans.connection &&
          ans.connection.toLowerCase().includes(filters.connection.toLowerCase()));

      const cityOk =
        !filters?.city ||
        !m.city ||
        (m.city && m.city.toLowerCase() === filters.city.toLowerCase());

      const stateOk =
        !filters?.state ||
        !m.state ||
        (m.state && m.state.toLowerCase() === filters.state.toLowerCase());

      const countryOk =
        !filters?.country ||
        !m.country ||
        (m.country && m.country.toLowerCase() === filters.country.toLowerCase());

      return connOk && cityOk && stateOk && countryOk;
    });

    console.log(`✅ Matches after relaxed filters: ${matches.length}`);

    // ✅ 5. Return top-N matches after relaxed filtering
    return matches.slice(0, limit);
  } catch (err: any) {
    console.error("❌ findSimilar failed:", err.message);
    throw err;
  }
}
