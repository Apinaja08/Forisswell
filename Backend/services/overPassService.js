const axios = require("axios");
const pLimit = require("p-limit");
const crypto = require("crypto");
const logger = require("../utils/logger");

class OverpassService {
  constructor() {
    // multiple endpoints for failover
    this.endpoints = [
      "https://overpass-api.de/api/interpreter",
      "https://lz4.overpass-api.de/api/interpreter",
      "https://overpass.kumi.systems/api/interpreter"
    ];

    this.endpointIndex = 0;
    this.lastRequestTime = 0;
    this.minRequestInterval = 2000; // 2 seconds between requests to avoid 429

    this.client = axios.create({
      timeout: 30000, // 30 seconds
      headers: { "Content-Type": "application/x-www-form-urlencoded" }
    });

    // concurrency limiter - reduced to 1 to respect rate limits
    this.limit = pLimit(1);

    // memory cache with TTL
    this.cache = new Map();
    this.cacheTTL = 3600000; // 1 hour cache
  }

  // rotate endpoint if failed
  nextEndpoint() {
    this.endpointIndex = (this.endpointIndex + 1) % this.endpoints.length;
    logger.info(`Switching Overpass endpoint to ${this.endpoints[this.endpointIndex]}`);
    return this.endpoints[this.endpointIndex];
  }

  currentEndpoint() {
    return this.endpoints[this.endpointIndex];
  }

  // hash key for caching
  hash(input) {
    return crypto.createHash("md5").update(JSON.stringify(input)).digest("hex");
  }

  // Rate limiting helper
  async waitForRateLimit() {
    const now = Date.now();
    const timeSinceLastRequest = now - this.lastRequestTime;
    if (timeSinceLastRequest < this.minRequestInterval) {
      const waitTime = this.minRequestInterval - timeSinceLastRequest;
      await new Promise(resolve => setTimeout(resolve, waitTime));
    }
    this.lastRequestTime = Date.now();
  }

  polygonToBbox(coords) {
    try {
      const ring = Array.isArray(coords[0][0]) ? coords[0] : coords;
      const lats = ring.map(p => p[1]);
      const lngs = ring.map(p => p[0]);
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

  // adaptive tiling - optimized for small areas
  splitBbox(bbox, tileSizeDeg) {
    const [minLat, minLng, maxLat, maxLng] = bbox;
    const tiles = [];

    // For very small areas, just return the original bbox
    const latDiff = maxLat - minLat;
    const lngDiff = maxLng - minLng;
    
    if (latDiff < tileSizeDeg && lngDiff < tileSizeDeg) {
      return [[minLat, minLng, maxLat, maxLng]];
    }

    for (let lat = minLat; lat < maxLat; lat += tileSizeDeg) {
      for (let lng = minLng; lng < maxLng; lng += tileSizeDeg) {
        tiles.push([
          lat,
          lng,
          Math.min(lat + tileSizeDeg, maxLat),
          Math.min(lng + tileSizeDeg, maxLng)
        ]);
      }
    }
    return tiles;
  }

  // main query function with retry + rotation
  async query(ql, retryCount = 0) {
    const cacheKey = this.hash(ql);

    // Check cache
    if (this.cache.has(cacheKey)) {
      const { data, timestamp } = this.cache.get(cacheKey);
      if (Date.now() - timestamp < this.cacheTTL) {
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
        logger.debug(`Overpass query to ${url} (attempt ${attempts + 1}/${maxAttempts})`);

        const res = await this.client.post(
          url,
          `data=${encodeURIComponent(ql)}`
        );

        // Cache successful response
        this.cache.set(cacheKey, {
          data: res.data,
          timestamp: Date.now()
        });
        
        return res.data;
      } catch (err) {
        const status = err.response?.status;
        logger.warn(`Overpass failed (${status}) - endpoint: ${this.currentEndpoint()}`);
        
        // If rate limited, wait longer before retry
        if (status === 429) {
          const waitTime = 5000 * (attempts + 1);
          logger.warn(`Rate limited, waiting ${waitTime}ms before retry`);
          await new Promise(r => setTimeout(r, waitTime));
        }
        
        this.nextEndpoint();
        attempts++;
        
        if (attempts < maxAttempts) {
          await new Promise(r => setTimeout(r, 2000));
        }
      }
    }

    logger.error("All Overpass endpoints failed after multiple attempts.");
    return null;
  }

  // lightweight tile query with fallback
  async queryTile(tile) {
    const [minLat, minLng, maxLat, maxLng] = tile;
    const bbox = `${minLat},${minLng},${maxLat},${maxLng}`;

    // Simplified query for better performance
    const ql = `
      [out:json][timeout:30];
      (
        way["building"](${bbox});
        way["highway"](${bbox});
      );
      out count;
    `;

    try {
      const result = await this.query(ql);
      return result?.elements?.[0]?.tags?.total ?? 0;
    } catch (error) {
      logger.warn(`Tile query failed: ${error.message}`);
      return 0;
    }
  }

  // MAIN RISK CALCULATION
  async calculateEncroachmentRisk(polygonData) {
    try {
      const bbox = this.polygonToBbox(polygonData.coordinates);
      
      // Validate bbox
      if (!bbox || bbox.length !== 4 || bbox.every(v => v === 0)) {
        logger.warn('Invalid bbox, using default risk');
        return this.getDefaultEncroachmentRisk();
      }

      // For small areas, use single tile
      const latDiff = bbox[2] - bbox[0];
      const lngDiff = bbox[3] - bbox[1];
      const areaSize = Math.abs(latDiff * lngDiff);
      
      // Use larger tile size for smaller areas to reduce requests
      let tileSize = 0.05; // ~5km
      if (areaSize > 0.01) tileSize = 0.1; // ~10km
      if (areaSize > 0.1) tileSize = 0.25; // ~25km
      if (areaSize > 1) tileSize = 0.5; // ~50km

      const tiles = this.splitBbox(bbox, tileSize);
      
      // Limit to single tile for very small areas
      const maxTiles = areaSize < 0.01 ? 1 : 5;
      const tilesToProcess = tiles.slice(0, maxTiles);
      
      logger.info(`Overpass tiles: ${tilesToProcess.length} (tileSize=${tileSize}°, area=${(areaSize * 10000).toFixed(2)}ha)`);

      let total = 0;
      let failedTiles = 0;

      // Process tiles sequentially to avoid rate limits
      for (let i = 0; i < tilesToProcess.length; i++) {
        try {
          const count = await this.queryTile(tilesToProcess[i]);
          total += count;
          logger.info(`Tile ${i + 1}/${tilesToProcess.length} → ${count}`);
          
          // Add delay between tiles
          if (i < tilesToProcess.length - 1) {
            await new Promise(r => setTimeout(r, 1000));
          }
        } catch (err) {
          failedTiles++;
          logger.warn(`Tile ${i + 1} failed: ${err.message}`);
        }
      }

      // Base score calculation
      let score = Math.min(60, Math.round((total / 30) * 60));
      
      // Adjust score based on area size
      if (areaSize < 0.001) { // < 1 hectare
        score = Math.min(40, score); // Cap at 40 for very small areas
      }

      // Direct road check (optional, skip if we already have high score)
      if (score < 80) {
        try {
          const [minLat, minLng, maxLat, maxLng] = bbox;
          
          // Only check roads if area is not too large
          if (areaSize < 0.5) {
            const roadQl = `
              [out:json][timeout:15];
              way["highway"](${minLat},${minLng},${maxLat},${maxLng});
              out count;
            `;

            const roadResult = await this.query(roadQl);
            const roads = roadResult?.elements?.[0]?.tags?.total ?? 0;

            if (roads > 0) {
              score = Math.min(100, score + 20);
              logger.info(`Added ${Math.min(20, 100 - score)} points for ${roads} roads`);
            }
          }
        } catch (roadError) {
          logger.warn(`Road query failed: ${roadError.message}`);
        }
      }

      logger.info(`Encroachment risk: ${score} (${total} features, ${failedTiles} failed tiles, area: ${(areaSize * 10000).toFixed(2)}ha)`);
      
      return Math.min(100, Math.max(0, score));
    } catch (err) {
      logger.error("Encroachment calculation failed:", err.message);
      return this.getDefaultEncroachmentRisk();
    }
  }

  // nearest towns - optimized for small areas
  async getNearbySettlements(coords, radiusKm = 10) {
    try {
      const ring = Array.isArray(coords[0][0]) ? coords[0] : coords;
      const lat = ring.reduce((s, p) => s + p[1], 0) / ring.length;
      const lng = ring.reduce((s, p) => s + p[0], 0) / ring.length;

      // Use smaller radius for better performance
      const radius = Math.min(radiusKm * 1000, 20000); // Max 20km

      const ql = `
        [out:json][timeout:15];
        node["place"~"city|town|village"](around:${radius},${lat},${lng});
        out body 3;
      `;

      const res = await this.query(ql);

      if (!res?.elements) return [];

      return res.elements.slice(0, 3).map(el => ({
        name: el.tags?.name ?? "Unknown",
        type: el.tags?.place ?? "settlement",
        lat: el.lat,
        lng: el.lon,
        distance: this.calculateDistance(lat, lng, el.lat, el.lon)
      }));
    } catch (err) {
      logger.error("Settlement query failed:", err.message);
      return [];
    }
  }

  // Calculate distance between two points in km
  calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371; // Earth's radius in km
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
    return Math.floor(Math.random() * 20) + 5; // 5-25 range
  }

  // Clear cache periodically
  clearCache() {
    const now = Date.now();
    for (const [key, { timestamp }] of this.cache.entries()) {
      if (now - timestamp > this.cacheTTL) {
        this.cache.delete(key);
      }
    }
  }
}

// Clear cache every hour
setInterval(() => {
  if (module.exports) {
    module.exports.clearCache();
  }
}, 3600000);

module.exports = new OverpassService();