
import fetch from "node-fetch";
import { assertEnv, mapsPlaceLink } from "./util.js";

const API_KEY = assertEnv("GOOGLE_MAPS_API_KEY");

export type PlaceResult = {
  name: string;
  formatted_address?: string;
  place_id: string;
  photos?: { photo_reference: string; width: number; height: number }[];
  rating?: number;
};

export async function textSearch(query: string, locationBias?: { lat: number; lon: number }): Promise<PlaceResult[]> {
  const params = new URLSearchParams({ query, key: API_KEY });
  if (locationBias) {
    params.set("location", `${locationBias.lat},${locationBias.lon}`);
    params.set("radius", String(10000));
  }
  const url = `https://maps.googleapis.com/maps/api/place/textsearch/json?${params.toString()}`;
  const res = await fetch(url);
  const json = await res.json();
  if (json.status !== "OK" && json.status !== "ZERO_RESULTS") {
    throw new Error(`Places textSearch error: ${json.status} ${json.error_message || ""}`);
  }
  return (json.results || []) as PlaceResult[];
}

export function photoProxyUrl(photoRef: string, maxwidth = 800): string {
  return `/api/proxy/photo?ref=${encodeURIComponent(photoRef)}&maxwidth=${maxwidth}`;
}

export function mapUrlForPlace(place: PlaceResult): string {
  return mapsPlaceLink(place.place_id || place.name);
}
