
import { Idea } from "../types.js";
import { textSearch, photoProxyUrl, mapUrlForPlace } from "./google.js";
import { polishWithGemini } from "./gemini.js";

function pick<T>(arr: T[], n = 1): T[] { return arr.slice(0, n); }

export async function buildIdeas(city: string, hangouts: string[], peace: string, bias?: { lat: number; lon: number }): Promise<Idea[]> {
  const queries: string[] = [];
  const prefer = new Set(hangouts.map((s) => s.toLowerCase()));

  if (prefer.has("café") || prefer.has("cafe")) queries.push(`cozy cafe in ${city}`);
  if (prefer.has("bar")) queries.push(`rooftop bar in ${city}`);
  if (prefer.has("park")) queries.push(`lakefront park in ${city}`);
  if (prefer.has("art gallery")) queries.push(`art gallery in ${city}`);
  if (prefer.has("bookstore")) queries.push(`indie bookstore in ${city}`);
  if (prefer.has("board‑game bar") || prefer.has("board-game bar")) queries.push(`board game bar in ${city}`);
  if (prefer.has("thrift market")) queries.push(`vintage market in ${city}`);
  if (prefer.has("nature trail")) queries.push(`scenic overlook in ${city}`);

  if (peace) queries.push(`${peace} in ${city}`);
  if (queries.length < 3) queries.push(`romantic spot in ${city}`);

  const results = await Promise.all(queries.slice(0, 6).map(q => textSearch(q, bias)));
  const flattened = results.flat();
  const unique = new Map(flattened.map(p => [p.place_id, p]));
  const top = pick(Array.from(unique.values()).sort((a,b)=> (b.rating||0) - (a.rating||0)), 6);

  let ideas: Idea[] = top.slice(0,3).map((p, i) => {
    const photoRef = p.photos?.[0]?.photo_reference;
    const photo = photoRef ? photoProxyUrl(photoRef, 800) : `https://images.unsplash.com/photo-1500534314209-a25ddb2bd429?q=80&w=1600&auto=format&fit=crop`;
    const title = ["First stop", "Second stop", "Third stop"][i] + `: ${p.name}`;
    const desc = p.formatted_address || "Perfect for easy conversation.";
    const time = ["5:00 PM", "6:30 PM", "8:00 PM"][i] || "6:00 PM";
    const mapUrl = mapUrlForPlace(p);
    return { title, desc, time, photo, mapUrl };
  });

  ideas = await polishWithGemini(ideas, { city, hangouts, peace }).catch(() => ideas);
  return ideas;
}
