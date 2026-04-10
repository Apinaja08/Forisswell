const axios = require("axios");
const crypto = require("crypto");
const logger = require("../utils/logger");

class OverpassService {
  constructor() {
    this.endpoints = [
      "https://overpass-api.de/api/interpreter",
      "https://lz4.overpass-api.de/api/interpreter"
    ];
    this.endpointIndex = 0;
    this.lastRequestTime = 0;
    this.minRequestInterval = 500; // Reduced to 500ms for faster responses
    
    this.client = axios.create({
      timeout: 15000, // Reduced to 15 seconds
      headers: { "Content-Type": "application/x-www-form-urlencoded" }
    });
    
    this.cache = new Map();
    this.cacheTTL = 3600000; // 1 hour cache
  }

  nextEndpoint() {
    this.endpointIndex = (this.endpointIndex + 1) % this.endpoints.length;
    return this.endpoints[this.endpointIndex];
  }

  currentEndpoint() {
    return this.endpoints[this.endpointIndex];
  }

  hash(input) {
    return crypto.createHash("md5").update(JSON.stringify(input)).digest("hex");
  }

  async waitForRateLimit() {
    const now = Date.now();
    const timeSinceLastRequest = now - this.lastRequestTime;
    if (timeSinceLastRequest < this.minRequestInterval) {
      await new Promise(resolve => setTimeout(resolve, this.minRequestInterval - timeSinceLastRequest));
    }
    this.lastRequestTime = Date.now();
  }

  polygonToBbox(coords) {
    try {
      let ring;
      if (Array.isArray(coords[0]) && Array.isArray(coords[0][0])) {
        ring = coords[0];
      } else {
        ring = coords;
      }
      
      const lats = ring.map(p => parseFloat(p[1]));
      const lngs = ring.map(p => parseFloat(p[0]));
      
      return [
        Math.min(...lats),
        Math.min(...lngs),
        Math.max(...lats),
        Math.max(...lngs)
      ];
    } catch (error) {
      logger.error("Error converting polygon to bbox:", error.message);
      return null;
    }
  }

  async query(ql, retryCount = 0) {
    const cacheKey = this.hash(ql);
    
    if (this.cache.has(cacheKey)) {
      const { data, timestamp } = this.cache.get(cacheKey);
      if (Date.now() - timestamp < this.cacheTTL) {
        return data;
      }
      this.cache.delete(cacheKey);
    }

    await this.waitForRateLimit();

    try {
      const url = this.currentEndpoint();
      logger.debug(`Overpass query to ${url}`);
      
      const res = await this.client.post(url, `data=${encodeURIComponent(ql)}`);
      
      this.cache.set(cacheKey, {
        data: res.data,
        timestamp: Date.now()
      });
      
      return res.data;
    } catch (err) {
      logger.warn(`Overpass failed: ${err.message}`);
      
      // Try one more endpoint if available
      if (retryCount === 0 && this.endpoints.length > 1) {
        this.nextEndpoint();
        return this.query(ql, retryCount + 1);
      }
      
      return null;
    }
  }

  async calculateEncroachmentRisk(polygonData) {
    try {
      const bbox = this.polygonToBbox(polygonData.coordinates);
      
      if (!bbox) {
        logger.warn('Invalid bbox, using default risk');
        return 15;
      }

      const [minLat, minLng, maxLat, maxLng] = bbox;
      
      // Simplified query - only buildings (faster)
      const ql = `
        [out:json][timeout:10];
        (
          way["building"](${minLat},${minLng},${maxLat},${maxLng});
        );
        out count;
      `;

      logger.info(`Querying Overpass for encroachment...`);
      
      const result = await this.query(ql);
      
      if (!result) {
        logger.warn('Overpass returned no data, using default risk');
        return 15;
      }
      
      const totalFeatures = result?.elements?.[0]?.tags?.total || 0;
      
      // Calculate risk score (reduced maximum)
      let score = Math.min(60, Math.round((totalFeatures / 100) * 60));
      
      // Default minimum risk
      if (score < 10) score = 10;
      
      logger.info(`Encroachment risk: ${score} (${totalFeatures} buildings)`);
      
      return Math.min(100, Math.max(0, score));
    } catch (err) {
      logger.error("Encroachment calculation failed:", err.message);
      return 15; // Default risk
    }
  }

  async getNearbySettlements(coords, radiusKm = 10) {
    try {
      let ring;
      if (Array.isArray(coords[0]) && Array.isArray(coords[0][0])) {
        ring = coords[0];
      } else {
        ring = coords;
      }
      
      const lat = ring.reduce((s, p) => s + parseFloat(p[1]), 0) / ring.length;
      const lng = ring.reduce((s, p) => s + parseFloat(p[0]), 0) / ring.length;
      
      const radius = Math.min(radiusKm * 1000, 10000);
      
      const ql = `
        [out:json][timeout:10];
        node["place"~"city|town|village"](around:${radius},${lat},${lng});
        out body 3;
      `;
      
      logger.info(`Searching for settlements near ${lat.toFixed(4)}, ${lng.toFixed(4)}`);
      
      const res = await this.query(ql);
      
      if (!res?.elements || res.elements.length === 0) {
        return [];
      }
      
      const settlements = res.elements.slice(0, 2).map(el => ({
        name: el.tags?.name ?? "Local Settlement",
        type: el.tags?.place ?? "settlement",
        lat: el.lat,
        lng: el.lon,
        distance: this.calculateDistance(lat, lng, el.lat, el.lon)
      }));
      
      return settlements;
    } catch (err) {
      logger.error("Settlement query failed:", err.message);
      return [];
    }
  }

  calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  }

  clearCache() {
    const now = Date.now();
    for (const [key, { timestamp }] of this.cache.entries()) {
      if (now - timestamp > this.cacheTTL) {
        this.cache.delete(key);
      }
    }
  }
}

setInterval(() => {
  module.exports.clearCache();
}, 3600000);

module.exports = new OverpassService();