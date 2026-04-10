const axios = require("axios");
const pLimit = require("p-limit");
const crypto = require("crypto");
const logger = require("../utils/logger");

class OverpassService {
  constructor() {
    this.endpoints = [
      "https://overpass-api.de/api/interpreter",
      "https://lz4.overpass-api.de/api/interpreter",
      "https://overpass.kumi.systems/api/interpreter"
    ];
    this.endpointIndex = 0;
    this.lastRequestTime = 0;
    this.minRequestInterval = 1000; // 1 second between requests

    this.client = axios.create({
      timeout: 45000,
      headers: { "Content-Type": "application/x-www-form-urlencoded" }
    });

    this.limit = pLimit(2);
    this.cache = new Map();
    this.cacheTTL = 7200000; // 2 hour cache
  }

  nextEndpoint() {
    this.endpointIndex = (this.endpointIndex + 1) % this.endpoints.length;
    logger.info(`Switching Overpass endpoint to ${this.endpoints[this.endpointIndex]}`);
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
      return [0, 0, 0, 0];
    }
  }

  async query(ql, retryCount = 0) {
    const cacheKey = this.hash(ql);
    
    if (this.cache.has(cacheKey)) {
      const { data, timestamp } = this.cache.get(cacheKey);
      if (Date.now() - timestamp < this.cacheTTL) {
        logger.debug(`Using cached Overpass result`);
        return data;
      }
      this.cache.delete(cacheKey);
    }

    await this.waitForRateLimit();

    let attempts = 0;
    const maxAttempts = this.endpoints.length;

    while (attempts < maxAttempts) {
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
        const status = err.response?.status;
        logger.warn(`Overpass failed (${status}) - endpoint: ${this.currentEndpoint()}`);
        
        if (status === 429) {
          const waitTime = 5000 * (attempts + 1);
          logger.warn(`Rate limited, waiting ${waitTime}ms`);
          await new Promise(r => setTimeout(r, waitTime));
        }
        
        this.nextEndpoint();
        attempts++;
        
        if (attempts < maxAttempts) {
          await new Promise(r => setTimeout(r, 2000));
        }
      }
    }

    logger.error("All Overpass endpoints failed");
    return null;
  }

  async calculateEncroachmentRisk(polygonData) {
    try {
      const bbox = this.polygonToBbox(polygonData.coordinates);
      
      if (!bbox || bbox.length !== 4 || bbox.every(v => v === 0)) {
        throw new Error("Invalid bbox for Overpass query");
      }

      const [minLat, minLng, maxLat, maxLng] = bbox;
      
      // Simplified query for buildings and roads
      const ql = `
        [out:json][timeout:45];
        (
          way["building"](${minLat},${minLng},${maxLat},${maxLng});
          way["highway"](${minLat},${minLng},${maxLat},${maxLng});
          relation["building"](${minLat},${minLng},${maxLat},${maxLng});
        );
        out count;
      `;

      logger.info(`Querying Overpass for area: ${minLat.toFixed(4)},${minLng.toFixed(4)} to ${maxLat.toFixed(4)},${maxLng.toFixed(4)}`);
      
      const result = await this.query(ql);
      
      if (!result) {
        throw new Error("Overpass returned no data");
      }
      
      const totalFeatures = result?.elements?.[0]?.tags?.total || 0;
      
      // Calculate risk score based on number of features
      let score = Math.min(80, Math.round((totalFeatures / 50) * 80));
      
      // Deterministic baseline for areas with zero mapped features
      if (totalFeatures === 0) {
        score = 5;
      }
      
      logger.info(`Encroachment risk: ${score} (${totalFeatures} features found)`);
      
      return Math.min(100, Math.max(0, score));
    } catch (err) {
      logger.error("Encroachment calculation failed:", err.message);
      throw err;
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
      
      const radius = Math.min(radiusKm * 1000, 20000);
      
      const ql = `
        [out:json][timeout:30];
        (
          node["place"~"city|town|village"](around:${radius},${lat},${lng});
          node["population"](around:${radius},${lat},${lng});
        );
        out body 5;
      `;
      
      logger.info(`Searching for settlements near ${lat.toFixed(4)}, ${lng.toFixed(4)}`);
      
      const res = await this.query(ql);
      
      if (!res?.elements || res.elements.length === 0) {
        logger.info('No settlements found nearby');
        return [];
      }
      
      const settlements = res.elements.slice(0, 3).map(el => ({
        name: el.tags?.name ?? "Unknown Settlement",
        type: el.tags?.place ?? "settlement",
        lat: el.lat,
        lng: el.lon,
        distance: this.calculateDistance(lat, lng, el.lat, el.lon),
        population: el.tags?.population ?? "unknown"
      }));
      
      logger.info(`Found ${settlements.length} nearby settlements`);
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

  getDefaultEncroachmentRisk() {
    return 10 + Math.floor(Math.random() * 15);
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
