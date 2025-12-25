import { GoogleGenerativeAI } from "@google/generative-ai";

/**
 * Initializes the Gemini API client using the API key from your .env file.
 */
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const EMBED_MODEL = process.env.GEMINI_EMBED_MODEL || "text-embedding-004";

if (!GEMINI_API_KEY) {
  throw new Error("❌ Missing GEMINI_API_KEY in environment variables");
}

// Create a single Gemini API client instance
const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);

/**
 * Generates a numeric embedding vector for a given text using Gemini.
 * 
 * @param text - The input text (e.g., user's vibe description)
 * @returns Promise<number[]> - Embedding vector (768 dimensions for text-embedding-004)
 */
export async function embedText(text: string): Promise<number[]> {
  try {
    const model = genAI.getGenerativeModel({ model: EMBED_MODEL });

    // The latest Gemini SDK exposes embedContent() directly on the model
    const res = await model.embedContent(text);

    if (!res?.embedding?.values) {
      throw new Error("No embedding values returned from Gemini API");
    }

    return res.embedding.values; // This is an array of floats (numbers)
  } catch (err: any) {
    console.error("❌ Embedding failed:", err.message || err);
    throw err;
  }
}
