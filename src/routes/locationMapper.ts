import { Router } from "express";
import axios from "axios";
import "dotenv/config";

const router = Router();
const GOOGLE_API_KEY = process.env.GOOGLE_MAPS_API_KEY!;

console.log("📍 locationMapper route loaded successfully");

// ---------------------------------------------
// Helper: Build a Google Maps URL
// ---------------------------------------------
function generateMapUrl(placeName: string, location: string) {
  const baseUrl = "https://www.google.com/maps/search/?api=1&query=";
  const query = `${placeName} ${location}`.replace(/\s+/g, "+");
  return `${baseUrl}${query}`;
}

// ---------------------------------------------
// Helper: Get up to 3 photo URLs for a place
// ---------------------------------------------
// async function getPhotoUrlsForPlace(placeName: string, location: string, maxPhotos = 3): Promise<string[]> {
//   try {
//     // Step 1: Text Search → get place_id
//     const searchUrl = "https://maps.googleapis.com/maps/api/place/textsearch/json";
//     const { data: searchData } = await axios.get(searchUrl, {
//       params: { query: `${placeName}, ${location}`, key: GOOGLE_API_KEY },
//     });

//     const results = searchData.results || [];
//     if (!results.length) return [];

//     const placeId = results[0].place_id;
//     if (!placeId) return [];

//     // Step 2: Place Details → get photos
//     const detailsUrl = "https://maps.googleapis.com/maps/api/place/details/json";
//     const { data: detailsData } = await axios.get(detailsUrl, {
//       params: { place_id: placeId, fields: "photos", key: GOOGLE_API_KEY },
//     });

//     const photos = detailsData.result?.photos || [];
//     const urls = photos.slice(0, maxPhotos).map(
//       (p: any) =>
//         `https://maps.googleapis.com/maps/api/place/photo?maxwidth=800&photoreference=${p.photo_reference}&key=${GOOGLE_API_KEY}`
//     );

//     return urls;
//   } catch (err: any) {
//     console.error("[PHOTO ERROR]", err.message);
//     return [];
//   }
// }

async function getPhotoUrlsForPlace(placeName: string, location: string, maxPhotos = 3): Promise<string[]> {
  try {
    // Step 1: Text Search → get place_id
    const searchUrl = "https://maps.googleapis.com/maps/api/place/textsearch/json";
    const { data: searchData } = await axios.get(searchUrl, {
      params: { query: `${placeName}, ${location}`, key: GOOGLE_API_KEY },
    });

    console.log("🔍 Search API response status:", searchData.status); // ADD THIS
    console.log("🔍 Results found:", searchData.results?.length || 0); // ADD THIS

    const results = searchData.results || [];
    if (!results.length) {
      console.log("❌ No results found for:", placeName);
      return [];
    }

    const placeId = results[0].place_id;
    if (!placeId) {
      console.log("❌ No place_id found");
      return [];
    }

    console.log("✅ Found place_id:", placeId); // ADD THIS

    // Step 2: Place Details → get photos
    const detailsUrl = "https://maps.googleapis.com/maps/api/place/details/json";
    const { data: detailsData } = await axios.get(detailsUrl, {
      params: { place_id: placeId, fields: "photos", key: GOOGLE_API_KEY },
    });

    console.log("📸 Details API response status:", detailsData.status); // ADD THIS
    console.log("📸 Photos found:", detailsData.result?.photos?.length || 0); // ADD THIS

    const photos = detailsData.result?.photos || [];
    const urls = photos.slice(0, maxPhotos).map(
      (p: any) =>
        `https://maps.googleapis.com/maps/api/place/photo?maxwidth=800&photoreference=${p.photo_reference}&key=${GOOGLE_API_KEY}`
    );

    return urls;
  } catch (err: any) {
    console.error("[PHOTO ERROR]", err.message);
    console.error("[PHOTO ERROR DETAILS]", err.response?.data); // ADD THIS
    return [];
  }
}

// ---------------------------------------------
// Route: POST /api/location-mapper
// ---------------------------------------------
router.post("/location-mapper", async (req, res) => {
  try {
    const { city, ideas } = req.body as {
      city: string;
      ideas: { title: string; description: string }[];
    };

    if (!city || !ideas?.length) {
      return res.status(400).json({ error: "city and ideas[] are required" });
    }

    const enriched = [];
    for (const idea of ideas) {
      const placeName = idea.title;
      const location = city;

      // Get map URL and photos
      const mapUrl = generateMapUrl(placeName, location);
      const photos = await getPhotoUrlsForPlace(placeName, location, 3);

      enriched.push({
        ...idea,
        place: {
          name: placeName,
          url: mapUrl,
          photos,
        },
      });
    }

    return res.json({ ideas: enriched });
  } catch (err: any) {
    console.error("❌ Location Mapper failed:", err.message);
    res.status(500).json({ error: err.message || "internal error" });
  }
});

export default router;
