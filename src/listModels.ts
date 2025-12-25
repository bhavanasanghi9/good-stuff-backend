import { GoogleGenerativeAI } from "@google/generative-ai";
import "dotenv/config";

async function listModels() {
  try {
    // Check if API key is loaded
    if (!process.env.GEMINI_API_KEY) {
      throw new Error("GEMINI_API_KEY is not set in environment variables");
    }

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models?key=${process.env.GEMINI_API_KEY}`
    );

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`HTTP ${response.status}: ${response.statusText}\n${errorText}`);
    }

    const data = await response.json();
    console.log("✅ Available Models:");
    data.models?.forEach((m: any) => console.log("-", m.name));
  } catch (err) {
    console.error("❌ Failed to list models:", err);
  }
}

listModels();