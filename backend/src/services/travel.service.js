import axios from "axios";

const ORS_BASE_URL = "https://api.openrouteservice.org";

/**
 * Validates coordinates.
 * @param {number} lat 
 * @param {number} lng 
 * @throws {Error} if coordinates are invalid
 */
const validateCoords = (lat, lng, name = "Coordinates") => {
  if (lat == null || lng == null || isNaN(lat) || isNaN(lng)) {
    throw new Error(`${name} are missing or invalid: lat=${lat}, lng=${lng}`);
  }
  if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
    throw new Error(`${name} out of range: lat=${lat}, lng=${lng}`);
  }
};

/**
 * ONE SOURCE OF TRUTH for travel info and reverse geocoding.
 * Always returns consistent data for UI and Email.
 * 
 * @param {number} userLat 
 * @param {number} userLng 
 * @param {number} orgLat 
 * @param {number} orgLng 
 * @returns {Promise<{ distanceKm: number, travelMinutes: number, displayAddress: string }>}
 */
export const getTravelInfo = async (userLat, userLng, orgLat, orgLng) => {
  const apiKey = process.env.ORS_API_KEY;
  
  // 1. Validation
  validateCoords(userLat, userLng, "User Location");
  validateCoords(orgLat, orgLng, "Organization Location");

  if (!apiKey) {
    console.error("[travel.service] ORS_API_KEY is missing in .env");
    return { distanceKm: 0, travelMinutes: 0, displayAddress: "Address Unavailable" };
  }

  console.log(`[travel.service] Fetching info: User(${userLat}, ${userLng}) -> Org(${orgLat}, ${orgLng})`);

  let distanceKm = 0;
  let travelMinutes = 0;
  let displayAddress = "Address Unavailable";

  try {
    // 2. Directions API (POST) - Road distance and time
    // ORS POST Directions expects [lng, lat] order
    // MUST use /geojson endpoint to get GeoJSON response with features[]
    // Without /geojson, ORS returns { routes: [] } which has a different structure
    const directionsPayload = {
      coordinates: [
        [userLng, userLat],
        [orgLng, orgLat]
      ]
    };

    console.log(`[travel.service] ORS Request payload:`, JSON.stringify(directionsPayload));

    const directionsResponse = await axios.post(
      `${ORS_BASE_URL}/v2/directions/driving-car/geojson`,
      directionsPayload,
      {
        headers: {
          Authorization: apiKey,
          "Content-Type": "application/json"
        }
      }
    );

    // Debug: log raw response structure
    const responseKeys = Object.keys(directionsResponse.data || {});
    console.log(`[travel.service] ORS Response keys: [${responseKeys.join(', ')}]`);

    const features = directionsResponse.data?.features;
    if (!features || features.length === 0) {
      console.error("[travel.service] ORS returned empty features. Full response:", JSON.stringify(directionsResponse.data).slice(0, 500));
      throw new Error("No route found in ORS directions response");
    }

    const route = features[0].properties.segments[0];
    distanceKm = Math.round((route.distance / 1000) * 100) / 100;
    travelMinutes = Math.ceil(route.duration / 60);

    // 3. Reverse Geocoding API (GET) - Readable address
    const geocodeResponse = await axios.get(`${ORS_BASE_URL}/geocode/reverse`, {
      params: {
        api_key: apiKey,
        "point.lat": orgLat,
        "point.lon": orgLng,
        size: 1
      }
    });

    displayAddress = geocodeResponse.data?.features?.[0]?.properties?.label || "Unknown Address";

    console.log(`[travel.service] ✅ Result: ${distanceKm}km, ${travelMinutes}min, Address: ${displayAddress}`);

    return { distanceKm, travelMinutes, displayAddress };
  } catch (error) {
    // Log the FULL error details — not just the message
    if (error.response) {
      console.error("[travel.service] ORS API HTTP Error:", {
        status: error.response.status,
        statusText: error.response.statusText,
        data: JSON.stringify(error.response.data).slice(0, 500)
      });
    } else {
      console.error("[travel.service] ORS API Error:", error.message);
    }
    return { 
      distanceKm: 0, 
      travelMinutes: 0, 
      displayAddress: "Address Service Unavailable" 
    };
  }
};

/**
 * Standalone reverse geocoding — get a human-readable address from coordinates.
 * Use this when you ONLY need an address (no distance/time needed).
 * 
 * @param {number} lat 
 * @param {number} lng 
 * @returns {Promise<string>} Display address string
 */
export const reverseGeocode = async (lat, lng) => {
  const apiKey = process.env.ORS_API_KEY;
  if (!apiKey) {
    console.error("[travel.service] ORS_API_KEY is missing — cannot reverse geocode");
    return "Address Unavailable";
  }

  try {
    const response = await axios.get(`${ORS_BASE_URL}/geocode/reverse`, {
      params: {
        api_key: apiKey,
        "point.lat": lat,
        "point.lon": lng,
        size: 1
      }
    });
    const label = response.data?.features?.[0]?.properties?.label;
    console.log(`[travel.service] Reverse geocode (${lat}, ${lng}) → ${label}`);
    return label || "Unknown Address";
  } catch (error) {
    console.error("[travel.service] Reverse geocode error:", error.response?.data || error.message);
    return "Address Unavailable";
  }
};
