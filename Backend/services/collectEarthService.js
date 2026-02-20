// server/services/collectEarthService.js
const axios = require('axios');
const logger = require('../utils/logger');

class CollectEarthService {
  constructor() {
    this.baseURL = process.env.COLLECT_EARTH_API_URL;
    this.apiKey = process.env.COLLECT_EARTH_API_KEY;
    this.client = axios.create({
      baseURL: this.baseURL,
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json'
      }
    });
  }

  async analyzeTreeCover(polygon, dateRange = { start: '2015-01-01', end: new Date() }) {
    try {
      const response = await this.client.post('/analysis/tree-cover', {
        geometry: polygon,
        startDate: dateRange.start,
        endDate: dateRange.end,
        includeHistorical: true
      });
      
      return {
        success: true,
        data: response.data,
        treeCoverPercentage: response.data.treeCover.percentage,
        changeDetected: response.data.changeDetected,
        confidence: response.data.confidence
      };
    } catch (error) {
      logger.error('CollectEarth API Error:', error);
      return {
        success: false,
        error: error.message,
        fallbackData: this.getFallbackData()
      };
    }
  }

  async detectDeforestation(polygon, baselineDate = '2010-01-01') {
    try {
      const response = await this.client.post('/analysis/deforestation', {
        geometry: polygon,
        baselineDate,
        changeThreshold: 0.15 // 15% tree cover loss = deforestation
      });

      return {
        hasDeforestation: response.data.deforestationDetected,
        lossArea: response.data.lossArea,
        lossPercentage: response.data.lossPercentage,
        events: response.data.events
      };
    } catch (error) {
      logger.error('Deforestation detection failed:', error);
      throw error;
    }
  }

  async getHistoricalTrends(polygon, years = 10) {
    try {
      const response = await this.client.post('/analysis/historical', {
        geometry: polygon,
        yearsBack: years,
        interval: 'yearly'
      });

      return {
        timeline: response.data.timeline,
        ndvi: response.data.ndvi,
        treeCover: response.data.treeCover,
        landUse: response.data.landUse
      };
    } catch (error) {
      logger.error('Historical trends fetch failed:', error);
      return this.getMockHistoricalData(polygon);
    }
  }

  getFallbackData() {
    return {
      treeCoverPercentage: 65,
      changeDetected: false,
      confidence: 70
    };
  }

  getMockHistoricalData(polygon) {
    const years = Array.from({ length: 10 }, (_, i) => 2024 - i);
    return {
      timeline: years.map(year => `${year}-01-01`),
      ndvi: years.map(() => 0.4 + Math.random() * 0.3),
      treeCover: years.map(() => 60 + Math.random() * 20),
      landUse: years.map(() => 'forest')
    };
  }
}

module.exports = new CollectEarthService();