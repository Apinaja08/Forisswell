// server/services/overpassService.js
const axios = require('axios');
const logger = require('../utils/logger');

class OverpassService {
  constructor() {
    // Free public endpoint — no API key required
    this.baseURL = 'https://overpass-api.de/api/interpreter';
    this.client = axios.create({
      timeout: 20000,
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
    });
  }

  // ─────────────────────────────────────────────
  // Convert polygon coordinates to bounding box
  // Returns: [minLat, minLng, maxLat, maxLng] (Overpass order)
  // ─────────────────────────────────────────────
  polygonToBbox(coordinates) {
    const ring = Array.isArray(coordinates[0][0]) ? coordinates[0] : coordinates;
    const lats = ring.map(p => p[1]);
    const lngs = ring.map(p => p[0]);
    return [Math.min(...lats), Math.min(...lngs), Math.max(...lats), Math.max(...lngs)];
  }

  // ─────────────────────────────────────────────
  // Query Overpass API with QL string
  // ─────────────────────────────────────────────
  async query(ql) {
    try {
      const response = await this.client.post(
        this.baseURL,
        `data=${encodeURIComponent(ql)}`
      );
      return response.data;
    } catch (error) {
      logger.error('Overpass query failed:', error.message);
      return null;
    }
  }

  // ─────────────────────────────────────────────
  // calculateEncroachmentRisk()
  // Replaces Math.random() — returns 0-100 score
  // Checks for: urban areas, roads, agriculture,
  // residential zones, industrial areas near the polygon
  // ─────────────────────────────────────────────
  async calculateEncroachmentRisk(polygonData) {
    try {
      const coords = polygonData.coordinates;
      const [minLat, minLng, maxLat, maxLng] = this.polygonToBbox(coords);

      // Expand bbox by ~5km for proximity search
      const buffer = 0.05; // ~5km in degrees
      const expandedBbox = `${minLat - buffer},${minLng - buffer},${maxLat + buffer},${maxLng + buffer}`;

      // Overpass QL: count urban features near the polygon
      // Higher count = higher encroachment risk
      const ql = `
        [out:json][timeout:15];
        (
          // Urban/residential areas
          way["landuse"~"residential|commercial|industrial|urban"](${expandedBbox});
          // Roads (highways indicate human access)
          way["highway"~"primary|secondary|tertiary|residential"](${expandedBbox});
          // Agriculture (encroaching on forest)
          way["landuse"~"farmland|farmyard|orchard|vineyard|agriculture"](${expandedBbox});
          // Buildings
          way["building"](${expandedBbox});
          // Settlements
          node["place"~"city|town|village|hamlet"](${expandedBbox});
        );
        out count;
      `;

      const result = await this.query(ql);
      if (!result) return this.getMockEncroachmentRisk();

      const totalCount = result?.elements?.[0]?.tags?.total ?? 0;

      // Score: 0-100 based on feature density
      // Tuned thresholds: 0 features = low risk, 50+ = high risk
      let score = Math.min(100, Math.round((totalCount / 50) * 60));

      // Bonus: check if roads go directly through the bounding box
      const directRoadQl = `
        [out:json][timeout:10];
        way["highway"](${minLat},${minLng},${maxLat},${maxLng});
        out count;
      `;
      const roadResult = await this.query(directRoadQl);
      const directRoads = roadResult?.elements?.[0]?.tags?.total ?? 0;
      if (directRoads > 0) score = Math.min(100, score + 20); // Roads through area = +20

      logger.info(`Encroachment risk calculated: ${score} (${totalCount} nearby features, ${directRoads} direct roads)`);
      return score;

    } catch (error) {
      logger.error('OverpassService encroachment risk failed:', error.message);
      return this.getMockEncroachmentRisk();
    }
  }

  // ─────────────────────────────────────────────
  // Optional: Get nearby settlement names for metadata
  // Useful for riskAssessment.metadata.region
  // ─────────────────────────────────────────────
  async getNearbySettlements(coordinates, radiusKm = 20) {
    try {
      const ring = Array.isArray(coordinates[0][0]) ? coordinates[0] : coordinates;
      // Get center point of polygon
      const centerLat = ring.reduce((s, p) => s + p[1], 0) / ring.length;
      const centerLng = ring.reduce((s, p) => s + p[0], 0) / ring.length;
      const radiusM = radiusKm * 1000;

      const ql = `
        [out:json][timeout:10];
        node["place"~"city|town|village"](around:${radiusM},${centerLat},${centerLng});
        out body 5;
      `;

      const result = await this.query(ql);
      return (result?.elements ?? []).map(el => ({
        name: el.tags?.name ?? 'Unknown',
        type: el.tags?.place ?? 'settlement',
        lat: el.lat,
        lng: el.lon
      }));
    } catch (error) {
      logger.error('OverpassService getNearbySettlements failed:', error.message);
      return [];
    }
  }

  getMockEncroachmentRisk() {
    return Math.floor(Math.random() * 40) + 10; // 10-50
  }
}

module.exports = new OverpassService();