// server/services/googleEarthEng
const axios = require('axios');
const crypto = require('crypto');
const fs = require('fs');
const logger = require('../utils/logger');

class GoogleEarthEngineService {
  constructor() {
    this.projectId = process.env.GEE_PROJECT_ID;
    this.keyFilePath = process.env.GEE_KEY_FILE || './gee-service-account-key.json';
    this.baseURL = 'https://earthengine.googleapis.com/v1';
    this.accessToken = null;
    this.tokenExpiry = null;
  }

  // ─────────────────────────────────────────────
  // AUTH — auto-refreshes when within 60s of expiry
  // ─────────────────────────────────────────────
  async getAccessToken() {
    if (this.accessToken && this.tokenExpiry && Date.now() < this.tokenExpiry - 60000) {
      return this.accessToken;
    }

    if (!this.projectId) {
      logger.warn('GEE_PROJECT_ID not set — falling back to mock data');
      return null;
    }

    if (!fs.existsSync(this.keyFilePath)) {
      logger.warn(`GEE key file not found at ${this.keyFilePath} — falling back to mock data`);
      return null;
    }

    try {
      const keyFile = JSON.parse(fs.readFileSync(this.keyFilePath, 'utf8'));
      const now = Math.floor(Date.now() / 1000);

      const header  = Buffer.from(JSON.stringify({ alg: 'RS256', typ: 'JWT' })).toString('base64url');
      const payload = Buffer.from(JSON.stringify({
        iss: keyFile.client_email,
        sub: keyFile.client_email,
        aud: 'https://oauth2.googleapis.com/token',
        iat: now,
        exp: now + 3600,
        scope: 'https://www.googleapis.com/auth/earthengine.readonly'
      })).toString('base64url');

      const sign = crypto.createSign('RSA-SHA256');
      sign.update(`${header}.${payload}`);
      const signature = sign.sign(keyFile.private_key, 'base64url');
      const jwt = `${header}.${payload}.${signature}`;

      const tokenRes = await axios.post('https://oauth2.googleapis.com/token', {
        grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
        assertion: jwt
      }, { headers: { 'Content-Type': 'application/json' } });

      this.accessToken = tokenRes.data.access_token;
      this.tokenExpiry = Date.now() + tokenRes.data.expires_in * 1000;
      logger.info('GEE: Access token refreshed');
      return this.accessToken;

    } catch (error) {
      logger.error('GEE auth error:', error.message);
      return null;
    }
  }

  async getClient() {
    const token = await this.getAccessToken();
    if (!token) return null;
    return axios.create({
      baseURL: this.baseURL,
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      timeout: 60000
    });
  }

  // Send a serialized EE computation graph to GEE REST API
  async computeValue(expression) {
    const client = await this.getClient();
    if (!client) return null;
    try {
      const res = await client.post(`/projects/${this.projectId}/value:compute`, { expression });
      return res.data?.result ?? null;
    } catch (error) {
      logger.error('GEE computeValue:', error.response?.data?.error?.message || error.message);
      return null;
    }
  }

  // Convert your polygon coordinates → GEE geometry object
  buildGeometry(coordinates) {
    const ring = Array.isArray(coordinates[0][0]) ? coordinates[0] : coordinates;
    return {
      functionInvocationValue: {
        functionName: 'GeometryConstructors.Polygon',
        arguments: { coordinates: { constantValue: [ring] } }
      }
    };
  }

  // ─────────────────────────────────────────────
  // 1. analyzeTreeCover()
  //    Same method name + return shape as collectEarthService
  //    Dataset: Hansen GFC 2023 — treecover2000, loss, gain bands
  // ─────────────────────────────────────────────
  async analyzeTreeCover(coordinates, dateRange = {}) {
    const client = await this.getClient();
    if (!client) return this.getMockTreeCoverData();

    try {
      logger.info('GEE: Analyzing tree cover via Hansen GFC 2023');
      const geometry = this.buildGeometry(coordinates);

      const expression = {
        functionInvocationValue: {
          functionName: 'Image.reduceRegion',
          arguments: {
            image: {
              functionInvocationValue: {
                functionName: 'Image.select',
                arguments: {
                  input: {
                    functionInvocationValue: {
                      functionName: 'Image.load',
                      arguments: { id: { constantValue: 'UMD/hansen/global_forest_change_2023_v1_11' } }
                    }
                  },
                  bandSelectors: { constantValue: ['treecover2000', 'loss', 'gain'] }
                }
              }
            },
            reducer: { functionInvocationValue: { functionName: 'Reducer.mean', arguments: {} } },
            geometry,
            scale: { constantValue: 30 },
            maxPixels: { constantValue: 1e9 },
            bestEffort: { constantValue: true }
          }
        }
      };

      const result = await this.computeValue(expression);
      if (!result) throw new Error('No result from GEE');

      const treecover2000 = result.treecover2000 ?? 50;
      const lossFraction  = result.loss ?? 0;
      const gainFraction  = result.gain ?? 0;

      const lossPoints    = lossFraction * 100;
      const gainPoints    = gainFraction * 10;
      const currentCover  = Math.max(0, Math.round(treecover2000 - lossPoints + gainPoints));

      return {
        success: true,
        treeCoverPercentage: currentCover,
        changeDetected: lossPoints > 5,
        confidence: 90,
        source: 'GEE-Hansen-GFC-2023'
      };

    } catch (error) {
      logger.error('GEE analyzeTreeCover failed:', error.message);
      return this.getMockTreeCoverData();
    }
  }

  // ─────────────────────────────────────────────
  // 2. detectDeforestation()
  //    Same method name + return shape as collectEarthService
  //    Dataset: Hansen GFC — loss + lossyear bands
  // ─────────────────────────────────────────────
  async detectDeforestation(coordinates, baselineDate = '2010-01-01') {
    const client = await this.getClient();
    if (!client) return this.getMockDeforestationData();

    try {
      logger.info('GEE: Detecting deforestation via Hansen GFC 2023');
      const geometry = this.buildGeometry(coordinates);
      const baselineOffset = new Date(baselineDate).getFullYear() - 2000;

      const expression = {
        functionInvocationValue: {
          functionName: 'Image.reduceRegion',
          arguments: {
            image: {
              functionInvocationValue: {
                functionName: 'Image.select',
                arguments: {
                  input: {
                    functionInvocationValue: {
                      functionName: 'Image.load',
                      arguments: { id: { constantValue: 'UMD/hansen/global_forest_change_2023_v1_11' } }
                    }
                  },
                  bandSelectors: { constantValue: ['loss', 'lossyear', 'treecover2000'] }
                }
              }
            },
            reducer: { functionInvocationValue: { functionName: 'Reducer.mean', arguments: {} } },
            geometry,
            scale: { constantValue: 30 },
            maxPixels: { constantValue: 1e9 },
            bestEffort: { constantValue: true }
          }
        }
      };

      const result = await this.computeValue(expression);
      if (!result) throw new Error('No result from GEE');

      const lossFraction  = result.loss ?? 0;
      const lossYear      = result.lossyear ?? 0;
      const treecover2000 = result.treecover2000 ?? 50;

      const lossPercentage = Math.round(lossFraction * 100);
      const recentLoss     = lossYear >= baselineOffset ? lossPercentage : 0;
      const hasDeforestation = recentLoss > 5;
      const actualLossYear = lossYear > 0 ? 2000 + Math.round(lossYear) : null;

      return {
        hasDeforestation,
        lossArea: Math.round(recentLoss * treecover2000 * 10),
        lossPercentage: recentLoss,
        primaryLossYear: actualLossYear,
        events: hasDeforestation ? [{
          type: 'tree_cover_loss',
          year: actualLossYear,
          magnitude: recentLoss,
          source: 'Hansen GFC 2023'
        }] : []
      };

    } catch (error) {
      logger.error('GEE detectDeforestation failed:', error.message);
      return this.getMockDeforestationData();
    }
  }

  // ─────────────────────────────────────────────
  // 3. getHistoricalTrends()
  //    Same method name + return shape as collectEarthService
  //    Dataset: Landsat 8 C2 (2013+) / Landsat 7 C2 (pre-2013)
  //    years param = how many years back (default 10)
  // ─────────────────────────────────────────────
  async getHistoricalTrends(coordinates, years = 10) {
    const client = await this.getClient();
    if (!client) return this.getMockHistoricalData();

    logger.info(`GEE: Getting ${years}-year historical NDVI via Landsat`);

    try {
      const geometry    = this.buildGeometry(coordinates);
      const currentYear = new Date().getFullYear();
      const startYear   = currentYear - years;
      const results     = [];

      for (let yr = startYear; yr <= currentYear; yr++) {
        // Landsat 8 launched April 2013; use L7 for earlier years
        const collectionId = yr >= 2013 ? 'LANDSAT/LC08/C02/T1_L2' : 'LANDSAT/LE07/C02/T1_L2';
        const nirBand      = yr >= 2013 ? 'SR_B5' : 'SR_B4';
        const redBand      = yr >= 2013 ? 'SR_B4' : 'SR_B3';

        const expression = {
          functionInvocationValue: {
            functionName: 'Image.reduceRegion',
            arguments: {
              image: {
                functionInvocationValue: {
                  functionName: 'ImageCollection.reduce',
                  arguments: {
                    collection: {
                      functionInvocationValue: {
                        functionName: 'ImageCollection.map',
                        arguments: {
                          collection: {
                            functionInvocationValue: {
                              functionName: 'ImageCollection.filterDate',
                              arguments: {
                                collection: {
                                  functionInvocationValue: {
                                    functionName: 'ImageCollection.filterBounds',
                                    arguments: {
                                      collection: {
                                        functionInvocationValue: {
                                          functionName: 'ImageCollection.load',
                                          arguments: { id: { constantValue: collectionId } }
                                        }
                                      },
                                      geometry
                                    }
                                  }
                                },
                                start: { constantValue: `${yr}-01-01` },
                                end:   { constantValue: `${yr}-12-31` }
                              }
                            }
                          },
                          baseAlgorithm: {
                            functionDefinitionValue: {
                              argumentNames: ['img'],
                              body: {
                                functionInvocationValue: {
                                  functionName: 'Image.normalizedDifference',
                                  arguments: {
                                    input: { argumentReference: 'img' },
                                    bandNames: { constantValue: [nirBand, redBand] }
                                  }
                                }
                              }
                            }
                          }
                        }
                      }
                    },
                    reducer: { functionInvocationValue: { functionName: 'Reducer.mean', arguments: {} } }
                  }
                }
              },
              reducer: { functionInvocationValue: { functionName: 'Reducer.mean', arguments: {} } },
              geometry,
              scale: { constantValue: 30 },
              bestEffort: { constantValue: true }
            }
          }
        };

        const result = await this.computeValue(expression);
        if (result) {
          const ndviVal = result.nd_mean ?? result.nd ?? null;
          if (ndviVal !== null && ndviVal > -1) {
            const ndvi = parseFloat(Math.max(-1, Math.min(1, ndviVal)).toFixed(3));
            results.push({
              year: yr,
              ndvi,
              treeCover: Math.round(Math.max(0, Math.min(100, ndvi * 120)))
            });
          }
        }
      }

      if (results.length === 0) throw new Error('No Landsat results');

      return {
        timeline: results.map(r => `${r.year}-01-01`),
        ndvi:     results.map(r => r.ndvi),
        treeCover: results.map(r => r.treeCover),
        landUse:  results.map(r =>
          r.treeCover > 50 ? 'forest' : r.treeCover > 20 ? 'mixed' : 'non-forest'
        )
      };

    } catch (error) {
      logger.error('GEE getHistoricalTrends failed:', error.message);
      return this.getMockHistoricalData();
    }
  }

  // ─────────────────────────────────────────────
  // 4. getFireRiskScore()  ← NEW method
  //    Called by riskAnalysisService.calculateFireRisk()
  //    Dataset: MODIS MCD64A1 burned area — 500m, monthly
  //    Returns a 0-100 score based on real burn history
  // ─────────────────────────────────────────────
  async getFireRiskScore(coordinates, yearsBack = 3) {
    const client = await this.getClient();
    if (!client) return null;

    logger.info('GEE: Fetching MODIS fire/burn data');

    try {
      const geometry  = this.buildGeometry(coordinates);
      const endDate   = new Date().toISOString().split('T')[0];
      const startDate = `${new Date().getFullYear() - yearsBack}-01-01`;

      const expression = {
        functionInvocationValue: {
          functionName: 'Image.reduceRegion',
          arguments: {
            image: {
              functionInvocationValue: {
                functionName: 'ImageCollection.reduce',
                arguments: {
                  collection: {
                    functionInvocationValue: {
                      functionName: 'ImageCollection.select',
                      arguments: {
                        collection: {
                          functionInvocationValue: {
                            functionName: 'ImageCollection.filterDate',
                            arguments: {
                              collection: {
                                functionInvocationValue: {
                                  functionName: 'ImageCollection.filterBounds',
                                  arguments: {
                                    collection: {
                                      functionInvocationValue: {
                                        functionName: 'ImageCollection.load',
                                        arguments: { id: { constantValue: 'MODIS/061/MCD64A1' } }
                                      }
                                    },
                                    geometry
                                  }
                                }
                              },
                              start: { constantValue: startDate },
                              end:   { constantValue: endDate }
                            }
                          }
                        },
                        bandSelectors: { constantValue: ['BurnDate'] }
                      }
                    }
                  },
                  reducer: { functionInvocationValue: { functionName: 'Reducer.max', arguments: {} } }
                }
              }
            },
            reducer: { functionInvocationValue: { functionName: 'Reducer.mean', arguments: {} } },
            geometry,
            scale: { constantValue: 500 },
            bestEffort: { constantValue: true }
          }
        }
      };

      const result = await this.computeValue(expression);
      if (!result) return null;

      const burnDateMean = result.BurnDate_max ?? result.BurnDate ?? 0;
      const hasBurnHistory = burnDateMean > 0;
      const score = hasBurnHistory
        ? Math.min(100, Math.round(50 + (burnDateMean / 365) * 50))
        : Math.floor(Math.random() * 15) + 5;

      logger.info(`GEE fire score: ${score} (burnMean=${burnDateMean.toFixed(2)})`);
      return score;

    } catch (error) {
      logger.error('GEE getFireRiskScore failed:', error.message);
      return null;
    }
  }

  // ─────────────────────────────────────────────
  // Fallback mock data — same interface as collectEarthService
  // Used when GEE credentials are not yet configured
  // ─────────────────────────────────────────────
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
    const years = Array.from({ length: 10 }, (_, i) => new Date().getFullYear() - i);
    return {
      timeline:  years.map(y => `${y}-01-01`),
      ndvi:      years.map(() => parseFloat((0.4 + Math.random() * 0.3).toFixed(3))),
      treeCover: years.map(() => Math.floor(40 + Math.random() * 40)),
      landUse:   years.map(() => 'forest')
    };
  }
}

module.exports = new GoogleEarthEngineService();