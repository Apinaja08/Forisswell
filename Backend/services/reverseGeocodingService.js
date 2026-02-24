const axios = require("axios");

const DEFAULT_BASE_URL = "https://nominatim.openstreetmap.org";

const firstNonEmptyString = (...values) => {
  for (const value of values) {
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return undefined;
};

/**
 * Reverse geocode coordinates (GeoJSON [lon, lat]) into a human-readable address.
 * Uses OpenStreetMap Nominatim by default.
 *
 * @param {number} lon
 * @param {number} lat
 * @returns {Promise<{formatted?: string, city?: string, district?: string, country?: string} | null>}
 */
const reverseGeocode = async (lon, lat) => {
  const baseUrl = (process.env.NOMINATIM_BASE_URL || DEFAULT_BASE_URL).replace(
    /\/+$/,
    ""
  );

  const userAgent =
    process.env.NOMINATIM_USER_AGENT ||
    "Forisswell/1.0 (reverse-geocoding; contact not configured)";

  const email = process.env.NOMINATIM_EMAIL;
  const acceptLanguage = process.env.NOMINATIM_ACCEPT_LANGUAGE;
  const timeoutMs = Number(process.env.NOMINATIM_TIMEOUT_MS || 4000);

  const url = `${baseUrl}/reverse`;

  try {
    const response = await axios.get(url, {
      params: {
        format: "jsonv2",
        lat,
        lon,
        addressdetails: 1,
        ...(email ? { email } : {}),
      },
      headers: {
        "User-Agent": userAgent,
        Accept: "application/json",
        ...(acceptLanguage ? { "Accept-Language": acceptLanguage } : {}),
      },
      timeout: Number.isFinite(timeoutMs) ? timeoutMs : 4000,
    });

    const data = response.data || {};
    const address = data.address || {};

    const formatted = firstNonEmptyString(data.display_name);
    const city = firstNonEmptyString(
      address.city,
      address.town,
      address.village,
      address.hamlet,
      address.municipality,
      address.locality
    );
    const district = firstNonEmptyString(
      address.county,
      address.state_district,
      address.district,
      address.suburb,
      address.city_district,
      address.region
    );
    const country = firstNonEmptyString(address.country);

    const result = { formatted, city, district, country };
    if (!result.formatted && !result.city && !result.district && !result.country) {
      return null;
    }
    return result;
  } catch (error) {
    return null;
  }
};

module.exports = {
  reverseGeocode,
};
