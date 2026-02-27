const axios = require('axios');
const logger = require('../utils/logger');

class SentinelHubService {
  constructor() {
    this.clientId = process.env.SENTINEL_HUB_CLIENT_ID;
    this.clientSecret = process.env.SENTINEL_HUB_CLIENT_SECRET;
    this.tokenUrl = 'https://identity.dataspace.copernicus.eu/auth/realms/CDSE/protocol/openid-connect/token';
    this.baseURL = 'https://sh.dataspace.copernicus.eu';
    this.accessToken = null;
    this.tokenExpiry = null;
  }

  async getAccessToken() {
    if (this.accessToken && this.tokenExpiry && Date.now() < this.tokenExpiry - 60000) {
      return this.accessToken;
    }
    if (!this.clientId || !this.clientSecret) {
      logger.warn('SentinelHub credentials not configured, using mock data');
      return null;
    }
    try {
      const params = new URLSearchParams();
      params.append('grant_type', 'client_credentials');
      params.append('client_id', this.clientId);
      params.append('client_secret', this.clientSecret);

      const response = await axios.post(this.tokenUrl, params, {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
      });
      this.accessToken = response.data.access_token;
      this.tokenExpiry = Date.now() + response.data.expires_in * 1000;
      logger.info('SentinelHub: Access token refreshed');
      return this.accessToken;
    } catch (error) {
      logger.error('SentinelHub token error:', error.message);
      return null;
    }
  }

  async getClient() {
    const token = await this.getAccessToken();
    if (!token) return null;
    return axios.create({
      baseURL: this.baseURL,
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      timeout: 30000
    });
  }

  logApiError(label, error) {
    if (error.response) {
      logger.error(`${label} ${error.response.status}:`, JSON.stringify(error.response.data));
    } else {
      logger.error(`${label}:`, error.message);
    }
  }

  buildBounds(coordinates) {
    // Handle if coordinates is a point
    if (Array.isArray(coordinates) && coordinates.length === 2 && typeof coordinates[0] === 'number') {
      return {
        geometry: {
          type: 'Point',
          coordinates: coordinates
        },
        properties: {
          crs: 'http://www.opengis.net/def/crs/OGC/1.3/CRS84'
        }
      };
    }
    
    // Handle polygon - ensure proper GeoJSON format
    let ring;
    if (Array.isArray(coordinates[0]) && Array.isArray(coordinates[0][0])) {
      // It's already a GeoJSON polygon coordinates array
      ring = coordinates[0];
    } else {
      // It's a simple ring
      ring = coordinates;
    }
    
    // Ensure the ring is closed
    if (ring.length > 0) {
      const first = ring[0];
      const last = ring[ring.length - 1];
      if (first[0] !== last[0] || first[1] !== last[1]) {
        ring.push([first[0], first[1]]);
      }
    }
    
    return {
      geometry: {
        type: 'Polygon',
        coordinates: [ring]
      },
      properties: {
        crs: 'http://www.opengis.net/def/crs/OGC/1.3/CRS84'
      }
    };
  }

  calculateDimensions(coordinates) {
    try {
      // Calculate the bounding box
      const ring = Array.isArray(coordinates[0][0]) ? coordinates[0] : coordinates;
      const lats = ring.map(p => p[1]);
      const lngs = ring.map(p => p[0]);
      
      const minLat = Math.min(...lats);
      const maxLat = Math.max(...lats);
      const minLng = Math.min(...lngs);
      const maxLng = Math.max(...lngs);
      
      // Calculate dimensions in degrees
      const latDiff = maxLat - minLat;
      const lngDiff = maxLng - minLng;
      
      // Convert to approximate meters
      const centerLat = (minLat + maxLat) / 2;
      const metersPerDegLat = 111000;
      const metersPerDegLng = 111000 * Math.cos(centerLat * Math.PI / 180);
      
      const widthMeters = Math.abs(lngDiff * metersPerDegLng);
      const heightMeters = Math.abs(latDiff * metersPerDegLat);
      
      // Calculate appropriate pixel dimensions
      // Target resolution: 100m per pixel max
      const targetResolution = 100; // meters per pixel
      
      let width = Math.max(1, Math.min(2500, Math.ceil(widthMeters / targetResolution)));
      let height = Math.max(1, Math.min(2500, Math.ceil(heightMeters / targetResolution)));
      
      // Ensure dimensions are within Sentinel Hub limits (max 2500 pixels)
      const maxDimension = 2500;
      if (width > maxDimension || height > maxDimension) {
        const scale = Math.max(width / maxDimension, height / maxDimension);
        width = Math.max(1, Math.floor(width / scale));
        height = Math.max(1, Math.floor(height / scale));
      }
      
      logger.info(`Calculated dimensions: ${width}x${height} pixels for area ~${Math.round(widthMeters/1000)}x${Math.round(heightMeters/1000)}km`);
      
      return { width, height };
    } catch (error) {
      logger.warn('Error calculating dimensions, using defaults:', error.message);
      return { width: 512, height: 512 };
    }
  }

  async analyzeTreeCover(coordinates, dateRange = {
    start: '2022-01-01',
    end: new Date().toISOString().split('T')[0]
  }) {
    const client = await this.getClient();
    if (!client) return this.getMockTreeCoverData();

    try {
      const { width, height } = this.calculateDimensions(coordinates);
      
      const timeRanges = [
        { from: `${dateRange.start}T00:00:00Z`, to: `${dateRange.end}T23:59:59Z` },
        { from: `2023-01-01T00:00:00Z`, to: `2023-12-31T23:59:59Z` },
        { from: `2022-06-01T00:00:00Z`, to: `2023-06-01T00:00:00Z` },
        { from: `2020-01-01T00:00:00Z`, to: `2023-12-31T23:59:59Z` }
      ];

      let response = null;

      for (const timeRange of timeRanges) {
        try {
          const evalscript = `//VERSION=3
function setup() {
  return {
    input: [{ bands: ["B04", "B08", "SCL", "dataMask"] }],
    output: [
      { id: "ndvi", bands: 1, sampleType: "FLOAT32" },
      { id: "treeCover", bands: 1, sampleType: "FLOAT32" },
      { id: "dataMask", bands: 1 }
    ]
  };
}
function evaluatePixel(sample) {
  var cloudMask = [3, 6, 7, 8, 9, 10, 11].includes(sample.SCL) ? 0 : 1;
  var valid = sample.dataMask * cloudMask;
  var ndvi = (sample.B08 - sample.B04) / (sample.B08 + sample.B04 + 0.0001);
  var tree = ndvi > 0.4 ? 1.0 : 0.0;
  return {
    ndvi: [ndvi],
    treeCover: [tree],
    dataMask: [valid]
  };
}`;

          const body = {
            input: {
              bounds: this.buildBounds(coordinates),
              data: [{
                type: 'sentinel-2-l2a',
                dataFilter: {
                  timeRange: timeRange,
                  maxCloudCoverage: 80,
                  mosaickingOrder: 'leastRecent'
                }
              }]
            },
            aggregation: {
              timeRange: timeRange,
              aggregationInterval: { of: 'P1Y' },
              evalscript,
              width: width,
              height: height
            }
          };

          response = await client.post('/api/v1/statistics', body);
          
          if (response.data?.data && response.data.data.length > 0) {
            logger.info(`Found data for time range: ${timeRange.from} to ${timeRange.to}`);
            break;
          }
        } catch (err) {
          logger.warn(`No data for time range ${timeRange.from} to ${timeRange.to}, trying next...`);
        }
      }

      if (!response || !response.data?.data || response.data.data.length === 0) {
        logger.warn('No data returned from Statistical API for any time range, using fallback');
        return this.getMockTreeCoverData();
      }

      const dataPoints = response.data.data;
      const data = dataPoints[0];

      const ndviMean = data.outputs?.ndvi?.bands?.B0?.stats?.mean ?? 0.4;
      const treeCoverMean = data.outputs?.treeCover?.bands?.B0?.stats?.mean ?? 0.5;
      const treeCoverPercentage = Math.round(Math.max(0, Math.min(1, treeCoverMean)) * 100);

      return {
        success: true,
        treeCoverPercentage,
        ndviMean: parseFloat(ndviMean.toFixed(3)),
        changeDetected: treeCoverPercentage < 30,
        confidence: 85,
        source: 'Sentinel-2 L2A'
      };
    } catch (error) {
      this.logApiError('SentinelHub analyzeTreeCover', error);
      return this.getMockTreeCoverData();
    }
  }

  async detectDeforestation(coordinates, baselineDate = '2017-01-01') {
    const client = await this.getClient();
    if (!client) return this.getMockDeforestationData();

    try {
      const currentYear = new Date().getFullYear();
      const baselineYear = new Date(baselineDate).getFullYear();

      const baselineAttempts = [
        { start: baselineDate, end: `${baselineYear}-12-31` },
        { start: `${baselineYear - 1}-01-01`, end: `${baselineYear}-12-31` },
        { start: `${baselineYear}-06-01`, end: `${baselineYear + 1}-06-01` }
      ];

      const recentAttempts = [
        { start: `${currentYear - 1}-01-01`, end: `${currentYear}-12-31` },
        { start: `${currentYear - 2}-01-01`, end: `${currentYear}-12-31` },
        { start: `${currentYear - 1}-06-01`, end: `${currentYear}-06-01` }
      ];

      let baselineCover = null;
      let recentCover = null;

      for (const attempt of baselineAttempts) {
        baselineCover = await this.analyzeTreeCover(coordinates, attempt);
        if (baselineCover.source !== 'mock') break;
      }

      for (const attempt of recentAttempts) {
        recentCover = await this.analyzeTreeCover(coordinates, attempt);
        if (recentCover.source !== 'mock') break;
      }

      if (!baselineCover || !recentCover || baselineCover.source === 'mock' || recentCover.source === 'mock') {
        logger.warn('Using mock data for deforestation detection due to insufficient API data');
        return this.getMockDeforestationData();
      }

      const baselinePct = baselineCover.treeCoverPercentage;
      const recentPct = recentCover.treeCoverPercentage;
      const lossPct = Math.max(0, baselinePct - recentPct);
      const hasDeforestation = lossPct > 10;

      return {
        hasDeforestation,
        lossArea: Math.round(lossPct * 100),
        lossPercentage: Math.round(lossPct),
        baselineTreeCover: baselinePct,
        currentTreeCover: recentPct,
        events: hasDeforestation ? [{
          type: 'tree_cover_loss',
          magnitude: lossPct,
          period: `${baselineYear} to ${currentYear}`
        }] : []
      };
    } catch (error) {
      this.logApiError('SentinelHub detectDeforestation', error);
      return this.getMockDeforestationData();
    }
  }

  async getHistoricalTrends(coordinates, years = 5) {
    const client = await this.getClient();
    if (!client) return this.getMockHistoricalData();

    try {
      const currentYear = new Date().getFullYear();
      const startYear = currentYear - years;
      
      const { width, height } = this.calculateDimensions(coordinates);

      const evalscript = `//VERSION=3
function setup() {
  return {
    input: [{ bands: ["B04", "B08", "SCL", "dataMask"] }],
    output: [
      { id: "ndvi", bands: 1, sampleType: "FLOAT32" },
      { id: "treeCover", bands: 1, sampleType: "FLOAT32" },
      { id: "dataMask", bands: 1 }
    ]
  };
}
function evaluatePixel(sample) {
  var cloudMask = [3, 8, 9, 10].includes(sample.SCL) ? 0 : 1;
  var valid = sample.dataMask * cloudMask;
  var ndvi = (sample.B08 - sample.B04) / (sample.B08 + sample.B04 + 0.0001);
  return {
    ndvi: [ndvi],
    treeCover: [ndvi > 0.4 ? 1.0 : 0.0],
    dataMask: [valid]
  };
}`;

      const body = {
        input: {
          bounds: this.buildBounds(coordinates),
          data: [{
            type: 'sentinel-2-l2a',
            dataFilter: {
              timeRange: {
                from: `${startYear}-01-01T00:00:00Z`,
                to: `${currentYear}-12-31T23:59:59Z`
              },
              maxCloudCoverage: 80,
              mosaickingOrder: 'leastRecent'
            }
          }]
        },
        aggregation: {
          timeRange: {
            from: `${startYear}-01-01T00:00:00Z`,
            to: `${currentYear}-12-31T23:59:59Z`
          },
          aggregationInterval: { of: 'P1Y' },
          evalscript,
          width: width,
          height: height
        }
      };

      const response = await client.post('/api/v1/statistics', body);
      const dataPoints = response.data?.data ?? [];

      if (dataPoints.length === 0) {
        logger.warn('No historical data returned from Statistical API, trying alternative time range');
        
        body.aggregation.timeRange = {
          from: `${startYear - 2}-01-01T00:00:00Z`,
          to: `${currentYear}-12-31T23:59:59Z`
        };
        
        const retryResponse = await client.post('/api/v1/statistics', body);
        const retryDataPoints = retryResponse.data?.data ?? [];
        
        if (retryDataPoints.length === 0) {
          return this.getMockHistoricalData();
        }
        
        return this.processHistoricalData(retryDataPoints);
      }

      return this.processHistoricalData(dataPoints);
    } catch (error) {
      this.logApiError('SentinelHub getHistoricalTrends', error);
      return this.getMockHistoricalData();
    }
  }

  processHistoricalData(dataPoints) {
    const timeline = dataPoints.map(d => d.interval?.from?.split('T')[0] ?? '');
    const ndvi = dataPoints.map(d =>
      parseFloat(((d.outputs?.ndvi?.bands?.B0?.stats?.mean) ?? 0.4).toFixed(3))
    );
    const treeCover = dataPoints.map(d =>
      Math.round(Math.max(0, Math.min(1, d.outputs?.treeCover?.bands?.B0?.stats?.mean ?? 0.5)) * 100)
    );
    const landUse = treeCover.map(pct =>
      pct > 50 ? 'forest' : pct > 20 ? 'mixed' : 'non-forest'
    );

    return { timeline, ndvi, treeCover, landUse };
  }

  getMockTreeCoverData() {
    return {
      success: true,
      treeCoverPercentage: 45 + Math.floor(Math.random() * 30),
      changeDetected: Math.random() > 0.7,
      confidence: 75 + Math.floor(Math.random() * 20),
      source: 'mock'
    };
  }

  getMockDeforestationData() {
    return {
      hasDeforestation: Math.random() > 0.6,
      lossArea: Math.floor(Math.random() * 1000),
      lossPercentage: Math.floor(Math.random() * 30),
      events: []
    };
  }

  getMockHistoricalData() {
    const years = Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i);
    return {
      timeline: years.map(y => `${y}-01-01`),
      ndvi: years.map(() => parseFloat((0.4 + Math.random() * 0.3).toFixed(3))),
      treeCover: years.map(() => Math.floor(40 + Math.random() * 40)),
      landUse: years.map(() => 'forest')
    };
  }
}

module.exports = new SentinelHubService();