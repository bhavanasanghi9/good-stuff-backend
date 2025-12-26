import { Router } from "express";
import { z } from "zod";

const router = Router();

/**
 * POST /api/express-interest
 *
 * Body:
 * {
 *   userId: string,
 *   matchId: string
 * }
 *
 * MVP behavior:
 * - Validate payload
 * - Return success
 *
 * NOTE:
 * If you later want to persist interest, add a DB insert here (Supabase table, etc.)
 * WITHOUT changing the response shape.
 */

const schema = z.object({
  userId: z.string().min(1),
  matchId: z.string().min(1),
});

router.post("/express-interest", async (req, res) => {
  const parse = schema.safeParse(req.body);
  if (!parse.success) {
    return res.status(400).json({
      error: "userId and matchId are required",
      details: parse.error.issues,
    });
  }

  const { userId, matchId } = parse.data;

  try {
    // ✅ MVP: record interest later if needed
    // Example future (only if you create a table):
    // await supabase.from("expressed_interests").insert({
    //   user_id: userId,
    //   match_id: matchId,
    //   created_at: new Date().toISOString(),
    // });

    return res.json({
      success: true,
      userId,
      matchId,
      message: "Interest recorded",
    });
  } catch (err: any) {
    console.error("❌ Express Interest failed:", err?.message || err);
    return res.status(500).json({
      error: err?.message || "internal error",
    });
  }
});

export default router;
