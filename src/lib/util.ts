
export function assertEnv(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Missing env: ${name}`);
  return v;
}

export function mapsPlaceLink(placeIdOrQuery: string): string {
  if (placeIdOrQuery.startsWith("ChIJ")) {
    return `https://www.google.com/maps/place/?q=place_id:${placeIdOrQuery}`;
  }
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(placeIdOrQuery)}`;
}
