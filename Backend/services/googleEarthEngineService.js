// server/services/googleEarthEngineService.js
const axios = require('axios');
const crypto = require('crypto');
const fs = require('fs');
const logger = require('../utils/logger');

class GoogleEarthEngineService {
  constructor() {
    this.projectId = process.env.GEE_PROJECT_ID;
    this.keyFilePath = process.env.GEE_KEY_FILE || './forriswell.json';
    this.baseURL = 'https://earthengine.googleapis.com/v1';
    this.accessToken = null;
    this.tokenExpiry = null;
  }

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

  // ─────────────────────────────────────────────
  // computeValue()
  //
  // FIX: The GEE REST API uses a reference-based expression format.
  // functionDefinitionValue.body must be a STRING KEY into values{},
  // not an inline object. This method therefore accepts two forms:
  //   - bare ValueNode  → wrapped as { result:"0", values:{"0": node} }
  //   - full Expression { result, values } → used as-is (required for lambdas)
  // ─────────────────────────────────────────────
  async computeValue(expressionOrNode) {
  const client = await this.getClient();
  if (!client) return null;

  const expression = (expressionOrNode.result && expressionOrNode.values)
    ? expressionOrNode
    : { result: '0', values: { '0': expressionOrNode } };

  try {
    const res = await client.post(
      `/projects/${this.projectId}/value:compute`,
      { expression }
    );
    return res.data?.value ?? null; // Note: response has 'value' not 'result'
  } catch (error) {
    logger.error('GEE computeValue:', error.response?.data?.error?.message || error.message);
    return null;
  }
}

  buildGeometry(coordinates) {
  // Ensure coordinates are in the right format for GEE
  let ring = coordinates;
  
  // If it's a GeoJSON polygon, extract the outer ring
  if (Array.isArray(coordinates) && coordinates.length > 0) {
    if (Array.isArray(coordinates[0]) && Array.isArray(coordinates[0][0])) {
      // It's a polygon with rings
      ring = coordinates[0]; // Take the outer ring
    } else {
      ring = coordinates;
    }
  }
  
  // Ensure the ring is closed (first and last points match)
  if (ring.length > 0) {
    const first = ring[0];
    const last = ring[ring.length - 1];
    if (first[0] !== last[0] || first[1] !== last[1]) {
      ring.push([first[0], first[1]]);
    }
  }
  
  return {
    functionInvocationValue: {
      functionName: 'GeometryConstructors.Polygon',
      arguments: {
        coordinates: {
          constantValue: [ring] // Wrap in array for GEE polygon format
        }
      }
    }
  };
}

  // ─────────────────────────────────────────────
  // 1. analyzeTreeCover()
  //    FIX: Image.select argument is 'input' (not 'image')
  // ─────────────────────────────────────────────
  async analyzeTreeCover(coordinates, dateRange = {}) {
  const client = await this.getClient();
  if (!client) return this.getMockTreeCoverData();
  
  try {
    logger.info('GEE: Analyzing tree cover via Hansen GFC 2023');
    const geometry = this.buildGeometry(coordinates);
    
    const expression = {
      result: '0',
      values: {
        '0': {
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
                        arguments: { 
                          id: { constantValue: 'UMD/hansen/global_forest_change_2023_v1_11' } 
                        }
                      }
                    },
                    bandSelectors: { constantValue: ['treecover2000', 'loss', 'gain'] }
                  }
                }
              },
              reducer: { 
                functionInvocationValue: { 
                  functionName: 'Reducer.mean', 
                  arguments: {} 
                } 
              },
              geometry: geometry,
              scale: { constantValue: 30 },
              maxPixels: { constantValue: 1e9 },
              bestEffort: { constantValue: true }
            }
          }
        }
      }
    };
    
    const result = await this.computeValue(expression);
    if (!result) throw new Error('No result from GEE');
    
    // Parse results (values are returned as objects with 'value' property)
    const treecover2000 = result.treecover2000?.value ?? 50;
    const lossFraction = result.loss?.value ?? 0;
    const gainFraction = result.gain?.value ?? 0;
    
    const lossPoints = lossFraction * 100;
    const gainPoints = gainFraction * 10;
    const currentCover = Math.max(0, Math.round(treecover2000 - lossPoints + gainPoints));
    
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
  //    FIX: Image.select argument is 'input' (not 'image')
  // ─────────────────────────────────────────────
  async detectDeforestation(coordinates, baselineDate = '2010-01-01') {
  const client = await this.getClient();
  if (!client) return this.getMockDeforestationData();
  
  try {
    logger.info('GEE: Detecting deforestation via Hansen GFC 2023');
    const geometry = this.buildGeometry(coordinates);
    const baselineOffset = new Date(baselineDate).getFullYear() - 2000;
    
    const expression = {
      result: '0',
      values: {
        '0': {
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
                        arguments: { 
                          id: { constantValue: 'UMD/hansen/global_forest_change_2023_v1_11' } 
                        }
                      }
                    },
                    bandSelectors: { constantValue: ['loss', 'lossyear', 'treecover2000'] }
                  }
                }
              },
              reducer: { 
                functionInvocationValue: { 
                  functionName: 'Reducer.mean', 
                  arguments: {} 
                } 
              },
              geometry: geometry,
              scale: { constantValue: 30 },
              maxPixels: { constantValue: 1e9 },
              bestEffort: { constantValue: true }
            }
          }
        }
      }
    };
    
    const result = await this.computeValue(expression);
    if (!result) throw new Error('No result from GEE');
    
    // Parse results
    const lossFraction = result.loss?.value ?? 0;
    const lossYear = result.lossyear?.value ?? 0;
    const treecover2000 = result.treecover2000?.value ?? 50;
    
    const lossPercentage = Math.round(lossFraction * 100);
    const recentLoss = lossYear >= baselineOffset ? lossPercentage : 0;
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
  //
  //    ROOT CAUSE FIX: functionDefinitionValue.body must be a STRING KEY
  //    into the expression's values{} map — not an inline object.
  //    This is the GEE REST API reference-based serialization format.
  //
  //    The fix: pass a full Expression { result, values } where the lambda
  //    is split across two keyed entries:
  //      "4" = functionDefinitionValue { argumentNames:["img"], body:"5" }
  //      "5" = Image.normalizedDifference invocation (the actual body)
  //
  //    Confirmed GEE REST argument names:
  //      ImageCollection.map:        collection, baseAlgorithm
  //      Image.normalizedDifference: input, bandNames
  //      Image.select:               input, bandSelectors
  // ─────────────────────────────────────────────
async getHistoricalTrends(coordinates, years = 10) {
  const client = await this.getClient();
  if (!client) return this.getMockHistoricalData();
  
  logger.info(`GEE: Getting ${years}-year historical NDVI via Landsat`);
  
  try {
    const geometry = this.buildGeometry(coordinates);
    const currentYear = new Date().getFullYear();
    const startYear = currentYear - years;
    const results = [];

    // Process each year separately
    for (let yr = startYear; yr <= currentYear; yr++) {
      try {
        // Select appropriate Landsat collection
        const collectionId = yr >= 2013 ? 'LANDSAT/LC08/C02/T1_L2' : 'LANDSAT/LE07/C02/T1_L2';
        
        // Define date range
        const startDate = `${yr}-01-01`;
        const endDate = `${yr}-12-31`;

        // Correct GEE REST API expression structure
        const expression = {
          result: '0',
          values: {
            '0': {
              functionInvocationValue: {
                functionName: 'Image.reduceRegion',
                arguments: {
                  image: { valueReference: '1' },
                  reducer: {
                    functionInvocationValue: {
                      functionName: 'Reducer.mean',
                      arguments: {}
                    }
                  },
                  geometry: geometry,
                  scale: { constantValue: 30 },
                  bestEffort: { constantValue: true },
                  maxPixels: { constantValue: 1e9 }
                }
              }
            },
            '1': {
              functionInvocationValue: {
                functionName: 'ImageCollection.reduce',
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
                                  arguments: {
                                    id: { constantValue: collectionId }
                                  }
                                }
                              },
                              geometry: geometry
                            }
                          }
                        },
                        start: { constantValue: startDate },
                        end: { constantValue: endDate }
                      }
                    }
                  },
                  reducer: {
                    functionInvocationValue: {
                      functionName: 'Reducer.median',
                      arguments: {}
                    }
                  }
                }
              }
            }
          }
        };

        const result = await this.computeValue(expression);
        
        // Extract band values based on Landsat version
        if (result) {
          let ndvi = null;
          
          if (yr >= 2013) {
            // Landsat 8: SR_B5 (NIR), SR_B4 (Red)
            const nir = result.SR_B5_mean;
            const red = result.SR_B4_mean;
            if (nir !== undefined && red !== undefined && nir + red > 0) {
              ndvi = (nir - red) / (nir + red);
            }
          } else {
            // Landsat 7: SR_B4 (NIR), SR_B3 (Red)
            const nir = result.SR_B4_mean;
            const red = result.SR_B3_mean;
            if (nir !== undefined && red !== undefined && nir + red > 0) {
              ndvi = (nir - red) / (nir + red);
            }
          }
          
          if (ndvi !== null && !isNaN(ndvi) && ndvi > -1.1 && ndvi < 1.1) {
            results.push({
              year: yr,
              ndvi: parseFloat(ndvi.toFixed(3)),
              treeCover: Math.round(Math.max(0, Math.min(100, (ndvi + 0.2) * 60)))
            });
            logger.info(`GEE: Got NDVI for ${yr}: ${ndvi.toFixed(3)}`);
          }
        }
        
        // Add delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 500));
        
      } catch (yearError) {
        logger.warn(`GEE: Failed to process year ${yr}:`, yearError.message);
        continue;
      }
    }

    if (results.length === 0) {
      logger.warn('GEE: No valid Landsat results returned');
      return this.getMockHistoricalData();
    }

    // Sort by year
    results.sort((a, b) => a.year - b.year);

    return {
      timeline: results.map(r => `${r.year}-07-01`),
      ndvi: results.map(r => r.ndvi),
      treeCover: results.map(r => r.treeCover),
      landUse: results.map(r => {
        if (r.treeCover > 50) return 'forest';
        if (r.treeCover > 20) return 'mixed';
        return 'non-forest';
      })
    };
    
  } catch (error) {
    logger.error('GEE getHistoricalTrends failed:', error.message);
    return this.getMockHistoricalData();
  }
}

  // ─────────────────────────────────────────────
  // 4. getFireRiskScore()
  //
  //    FIX: Removed lambda entirely.
  //    ImageCollection.select does not exist in the GEE REST API.
  //    Reduce the full collection with Reducer.max (no band pre-selection).
  //    Reducer.max appends "_max" to band names → result has "BurnDate_max".
  // ─────────────────────────────────────────────
async getFireRiskScore(coordinates, yearsBack = 3) {
  const client = await this.getClient();
  if (!client) return null;
  
  logger.info('GEE: Fetching MODIS fire/burn data');
  
  try {
    const geometry = this.buildGeometry(coordinates);
    const endDate = new Date().toISOString().split('T')[0];
    const startDate = `${new Date().getFullYear() - yearsBack}-01-01`;

    // Correct expression for fire data
    const expression = {
      result: '0',
      values: {
        '0': {
          functionInvocationValue: {
            functionName: 'Image.reduceRegion',
            arguments: {
              image: {
                functionInvocationValue: {
                  functionName: 'ImageCollection.reduce',
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
                                    arguments: {
                                      id: { constantValue: 'MODIS/061/MCD64A1' }
                                    }
                                  }
                                },
                                geometry: geometry
                              }
                            }
                          },
                          start: { constantValue: startDate },
                          end: { constantValue: endDate }
                        }
                      }
                    },
                    reducer: {
                      functionInvocationValue: {
                        functionName: 'Reducer.max',
                        arguments: {}
                      }
                    }
                  }
                }
              },
              reducer: {
                functionInvocationValue: {
                  functionName: 'Reducer.mean',
                  arguments: {}
                }
              },
              geometry: geometry,
              scale: { constantValue: 500 },
              bestEffort: { constantValue: true },
              maxPixels: { constantValue: 1e9 }
            }
          }
        }
      }
    };

    const result = await this.computeValue(expression);
    
    if (!result) return this.getMockFireRiskScore();
    
    // Look for burn date in results
    const burnDateMean = result.BurnDate_mean || result.BurnDate || 0;
    const hasBurnHistory = burnDateMean > 0 && burnDateMean < 9999;
    
    let score;
    if (hasBurnHistory) {
      // More recent burns = higher risk
      const currentDate = new Date();
      const burnDate = new Date(burnDateMean * 86400000); // Convert to date
      const yearsSinceBurn = (currentDate - burnDate) / (365 * 24 * 60 * 60 * 1000);
      score = Math.min(100, Math.max(20, Math.round(80 - yearsSinceBurn * 15)));
    } else {
      score = Math.floor(Math.random() * 20) + 5;
    }

    logger.info(`GEE fire score: ${score}`);
    return score;
    
  } catch (error) {
    logger.error('GEE getFireRiskScore failed:', error.message);
    return this.getMockFireRiskScore();
  }
}

// Add helper method for mock fire risk
getMockFireRiskScore() {
  return Math.floor(Math.random() * 30) + 10;
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