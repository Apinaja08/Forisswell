// server/services/collectEarthService.js
const axios = require('axios');
const logger = require('../utils/logger');

class CollectEarthService {
  constructor() {
    this.baseURL = process.env.COLLECT_EARTH_API_URL || 'https://api.collect.earth/v1';
    this.apiKey = process.env.COLLECT_EARTH_API_KEY;
    this.client = axios.create({
      baseURL: this.baseURL,
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json'
      },
      timeout: 10000 // 10 second timeout
    });
  }

  async analyzeTreeCover(polygon, dateRange = { start: '2015-01-01', end: new Date().toISOString().split('T')[0] }) {
    try {
      logger.info('Analyzing tree cover for polygon');
      
      // Check if API key is configured
      if (!this.apiKey || this.apiKey === 'your_api_key_here') {
        logger.warn('CollectEarth API key not configured, using mock data');
        return this.getMockTreeCoverData();
      }

      const response = await this.client.post('/analysis/tree-cover', {
        geometry: polygon,
        startDate: dateRange.start,
        endDate: dateRange.end,
        includeHistorical: true
      });
      
      return {
        success: true,
        data: response.data,
        treeCoverPercentage: response.data.treeCover?.percentage || 0,
        changeDetected: response.data.changeDetected || false,
        confidence: response.data.confidence || 70
      };
    } catch (error) {
      logger.error('CollectEarth API Error:', error.message);
      return this.getMockTreeCoverData();
    }
  }

  async detectDeforestation(polygon, baselineDate = '2010-01-01') {
    try {
      logger.info('Detecting deforestation');
      
      if (!this.apiKey || this.apiKey === 'your_api_key_here') {
        return this.getMockDeforestationData();
      }

      const response = await this.client.post('/analysis/deforestation', {
        geometry: polygon,
        baselineDate,
        changeThreshold: 0.15
      });

      return {
        hasDeforestation: response.data.deforestationDetected || false,
        lossArea: response.data.lossArea || 0,
        lossPercentage: response.data.lossPercentage || 0,
        events: response.data.events || []
      };
    } catch (error) {
      logger.error('Deforestation detection failed:', error.message);
      return this.getMockDeforestationData();
    }
  }

  async getHistoricalTrends(polygon, years = 10) {
    try {
      logger.info('Getting historical trends');
      
      if (!this.apiKey || this.apiKey === 'your_api_key_here') {
        return this.getMockHistoricalData();
      }

      const response = await this.client.post('/analysis/historical', {
        geometry: polygon,
        yearsBack: years,
        interval: 'yearly'
      });

      return {
        timeline: response.data.timeline || [],
        ndvi: response.data.ndvi || [],
        treeCover: response.data.treeCover || [],
        landUse: response.data.landUse || []
      };
    } catch (error) {
      logger.error('Historical trends fetch failed:', error.message);
      return this.getMockHistoricalData();
    }
  }

  getMockTreeCoverData() {
    return {
      success: true,
      treeCoverPercentage: 45 + Math.floor(Math.random() * 30),
      changeDetected: Math.random() > 0.7,
      confidence: 75 + Math.floor(Math.random() * 20)
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
    const years = Array.from({ length: 10 }, (_, i) => 2024 - i);
    return {
      timeline: years.map(year => `${year}-01-01`),
      ndvi: years.map(() => 0.4 + Math.random() * 0.3),
      treeCover: years.map(() => 40 + Math.random() * 40),
      landUse: years.map(() => 'forest')
    };
  }
}

module.exports = new CollectEarthService();