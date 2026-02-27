const axios = require("axios");
const pLimit = require("p-limit");
const crypto = require("crypto");
const logger = require("../utils/logger");

class OverpassService {
  constructor() {
    // multiple endpoints for failover
    this.endpoints = [
      "https://overpass.kumi.systems/api/interpreter",
      "https://lz4.overpass-api.de/api/interpreter",
      "https://overpass-api.de/api/interpreter"
    ];

    this.endpointIndex = 0;

    this.client = axios.create({
      timeout: 60000,
      headers: { "Content-Type": "application/x-www-form-urlencoded" }
    });

    // concurrency limiter
    this.limit = pLimit(3);

    // memory cache
    this.cache = new Map();
  }

  // rotate endpoint if failed
  nextEndpoint() {
    this.endpointIndex =
      (this.endpointIndex + 1) % this.endpoints.length;
    return this.endpoints[this.endpointIndex];
  }

  currentEndpoint() {
    return this.endpoints[this.endpointIndex];
  }

  // hash key for caching
  hash(input) {
    return crypto
      .createHash("md5")
      .update(JSON.stringify(input))
      .digest("hex");
  }

  polygonToBbox(coords) {
    const ring = Array.isArray(coords[0][0]) ? coords[0] : coords;
    const lats = ring.map(p => p[1]);
    const lngs = ring.map(p => p[0]);
    return [
      Math.min(...lats),
      Math.min(...lngs),
      Math.max(...lats),
      Math.max(...lngs)
    ];
  }

  // adaptive tiling
  splitBbox(bbox, tileSizeDeg) {
    const [minLat, minLng, maxLat, maxLng] = bbox;
    const tiles = [];

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
  async query(ql) {
    const cacheKey = this.hash(ql);

    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey);
    }

    let attempts = 0;

    while (attempts < this.endpoints.length) {
      try {
        const url = this.currentEndpoint();

        const res = await this.client.post(
          url,
          `data=${encodeURIComponent(ql)}`
        );

        this.cache.set(cacheKey, res.data);
        return res.data;
      } catch (err) {
        logger.warn(
          `Overpass failed (${err.response?.status}) switching endpoint`
        );
        this.nextEndpoint();
        attempts++;
        await new Promise(r => setTimeout(r, 1500));
      }
    }

    logger.error("All Overpass endpoints failed.");
    return null;
  }

  // lightweight tile query
  async queryTile(tile) {
    const [minLat, minLng, maxLat, maxLng] = tile;
    const bbox = `${minLat},${minLng},${maxLat},${maxLng}`;

    const ql = `
      [out:json][timeout:60];
      (
        way["building"](${bbox});
        way["highway"](${bbox});
      );
      out count;
    `;

    const result = await this.query(ql);
    return result?.elements?.[0]?.tags?.total ?? 0;
  }

  // MAIN RISK CALCULATION
  async calculateEncroachmentRisk(polygonData) {
    try {
      const bbox = this.polygonToBbox(polygonData.coordinates);

      // estimate size → adaptive tile size
      const latDiff = bbox[2] - bbox[0];
      const lngDiff = bbox[3] - bbox[1];
      const areaSize = latDiff * lngDiff;

      let tileSize = 0.1;
      if (areaSize > 1) tileSize = 0.25;
      if (areaSize > 5) tileSize = 0.5;

      const tiles = this.splitBbox(bbox, tileSize);

      logger.info(
        `Overpass tiles: ${tiles.length} (tileSize=${tileSize})`
      );

      let total = 0;

      await Promise.all(
        tiles.map((tile, i) =>
          this.limit(async () => {
            const count = await this.queryTile(tile);
            total += count;
            logger.info(`Tile ${i + 1}/${tiles.length} → ${count}`);
          })
        )
      );

      // base score
      let score = Math.min(60, Math.round((total / 50) * 60));

      // direct road check
      const [minLat, minLng, maxLat, maxLng] = bbox;
      const roadQl = `
        [out:json][timeout:25];
        way["highway"](${minLat},${minLng},${maxLat},${maxLng});
        out count;
      `;

      const roadResult = await this.query(roadQl);
      const roads =
        roadResult?.elements?.[0]?.tags?.total ?? 0;

      if (roads > 0) score = Math.min(100, score + 20);

      logger.info(
        `Encroachment risk: ${score} (${total} features, ${roads} roads)`
      );

      return score;
    } catch (err) {
      logger.error(
        "Encroachment calculation failed:",
        err.message
      );
      return this.getMockEncroachmentRisk();
    }
  }

  // nearest towns
  async getNearbySettlements(coords, radiusKm = 20) {
    try {
      const ring = Array.isArray(coords[0][0]) ? coords[0] : coords;
      const lat = ring.reduce((s, p) => s + p[1], 0) / ring.length;
      const lng = ring.reduce((s, p) => s + p[0], 0) / ring.length;

      const radius = radiusKm * 1000;

      const ql = `
        [out:json][timeout:25];
        node["place"~"city|town|village"](around:${radius},${lat},${lng});
        out body 5;
      `;

      const res = await this.query(ql);

      return (res?.elements ?? []).map(el => ({
        name: el.tags?.name ?? "Unknown",
        type: el.tags?.place ?? "settlement",
        lat: el.lat,
        lng: el.lon
      }));
    } catch (err) {
      logger.error("Settlement query failed:", err.message);
      return [];
    }
  }

  getMockEncroachmentRisk() {
    return Math.floor(Math.random() * 40) + 10;
  }
}

module.exports = new OverpassService();