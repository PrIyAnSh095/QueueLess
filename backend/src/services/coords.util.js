/**
 * Centralized coordinate extraction and validation utility.
 * 
 * SINGLE SOURCE OF TRUTH for parsing coordinates from:
 *   - GeoJSON Point: { type: "Point", coordinates: [lng, lat] }
 *   - Plain object:  { lat, lng }
 *   - ServiceProvider model: location: { lat, lng }
 *
 * Returns { lat, lng } or null. Never guesses or uses defaults.
 */

/**
 * Extract { lat, lng } from any location format used in the system.
 * @param {Object} location - GeoJSON Point, {lat,lng}, or nested location object
 * @param {string} [label] - Label for debug logging
 * @returns {{ lat: number, lng: number } | null}
 */
export const extractCoords = (location, label = "Location") => {
  if (!location) return null;

  // GeoJSON Point: { type: "Point", coordinates: [lng, lat] }
  if (location.type === "Point" && Array.isArray(location.coordinates)) {
    const [lng, lat] = location.coordinates;
    if (isValidCoords({ lat, lng })) return { lat, lng };
    return null;
  }

  // Plain object: { lat, lng }
  if (location.lat !== undefined && location.lng !== undefined) {
    if (isValidCoords({ lat: location.lat, lng: location.lng })) {
      return { lat: Number(location.lat), lng: Number(location.lng) };
    }
    return null;
  }

  // Nested: object with a .location sub-property (e.g. organization.location)
  if (location.location) {
    return extractCoords(location.location, label);
  }

  return null;
};

/**
 * Check if coordinates are numerically valid and not the [0,0] sentinel.
 * [0, 0] is the Gulf of Guinea — no real org is there; it means "not set."
 * @param {{ lat: number, lng: number }} coords
 * @returns {boolean}
 */
export const isValidCoords = (coords) => {
  if (!coords) return false;
  const { lat, lng } = coords;
  if (lat == null || lng == null || isNaN(Number(lat)) || isNaN(Number(lng))) return false;
  if (Number(lat) === 0 && Number(lng) === 0) return false; // sentinel default
  if (Number(lat) < -90 || Number(lat) > 90) return false;
  if (Number(lng) < -180 || Number(lng) > 180) return false;
  return true;
};

/**
 * Quick boolean check — does this location have usable coordinates?
 * @param {Object} location
 * @returns {boolean}
 */
export const hasLocation = (location) => {
  return extractCoords(location) !== null;
};

/**
 * Given a populated service document, extract the best available org coordinates.
 * Priority: service.location > service.organizationId.location
 * @param {Object} service - Populated service document
 * @returns {{ lat: number, lng: number } | null}
 */
export const getOrgCoordsFromService = (service) => {
  if (!service) return null;

  // 1. Service-level location (GeoJSON)
  const serviceCoords = extractCoords(service.location, "Service Location");
  if (serviceCoords) return serviceCoords;

  // 2. Organization-level location ({ lat, lng })
  const orgCoords = extractCoords(service.organizationId?.location, "Organization Location");
  if (orgCoords) return orgCoords;

  return null;
};
