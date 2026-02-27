# Forisswell Backend API

A RESTful API backend for the Forisswell application — a weather-based tree care and community system.

> Source of truth: `Backend/README.md` (this file mirrors it for convenience).

## Tech Stack

- Node.js + Express
- MongoDB + Mongoose
- JWT authentication

## Project Structure

```
Backend/
├── app.js                       # Express app configuration
├── server.js / Server.js        # Server entry point (npm start runs node server.js)
├── config/
│   └── db.js                    # MongoDB connection
├── controllers/
│   ├── authController.js
│   ├── treeController.js
│   ├── weatherCareController.js
│   ├── riskController.js
│   └── eventController.js
├── middleware/
│   ├── auth.js
│   └── validation.js
├── models/
│   ├── User.js
│   ├── Tree.js
│   ├── Risk.js
│   └── Event.js
├── routes/
│   ├── authRoutes.js
│   ├── treeRoutes.js
│   ├── weatherCareRoutes.js
│   ├── riskRoutes.js
│   └── eventRoutes.js
└── services/
    ├── weatherService.js
    ├── reverseGeocodingService.js
    ├── riskAnalysisService.js
    ├── sentinelHubService.js
    ├── overpassService.js
    ├── calenderService.js
    └── notificationService.js
```

## Getting Started

### Prerequisites

- Node.js v18+
- MongoDB (local or Atlas)

### Install

```bash
cd Backend
npm install
```

### Configure `.env`

Create `Backend/.env`:

```env
PORT=5000
NODE_ENV=development
MONGO_URI=mongodb://localhost:27017/FORISSWELL

JWT_SECRET=change-me
JWT_EXPIRES_IN=7d

CLIENT_URL=http://localhost:5173
OPENWEATHER_API_KEY=your_openweathermap_api_key

# Optional (risk analysis via Sentinel Hub; uses mock data if keys missing)
SENTINEL_HUB_CLIENT_ID=your_sentinel_hub_client_id
SENTINEL_HUB_CLIENT_SECRET=your_sentinel_hub_client_secret

GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
GOOGLE_REDIRECT_URI=http://localhost:5000/auth/google/callback

#Geocoding
DEFAULT_BASE_URL = https://nominatim.openstreetmap.org

# Optional (email notifications)
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your_email@gmail.com
EMAIL_PASS=your_app_password
EMAIL_FROM=noreply@plantapp.com
```

### Run

```bash
cd Backend
npm start
```

Base URL:

```
http://localhost:5000
```

---

## API Documentation (All Endpoints + Sample Values)

Set these once in your terminal to reuse the examples:

```bash
BASE_URL="http://localhost:5000"
TOKEN="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.example.signature"
```

> Protected routes require: `Authorization: Bearer <token>`

---

## 1) Health

### GET `/api/health` (Public)

```bash
curl -sS "$BASE_URL/api/health"
```

```json
{
  "success": true,
  "message": "API is running"
}
```

---

## 2) Authentication

### POST `/api/auth/register` (Public)

```bash
curl -sS -X POST "$BASE_URL/api/auth/register" \
  -H "Content-Type: application/json" \
  -d '{
    "fullName": "John Doe",
    "email": "john@example.com",
    "password": "password123"
  }'
```

```json
{
  "success": true,
  "message": "Registered successfully",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.example.signature",
  "data": {
    "user": {
      "_id": "67b5a1234abc123456789001",
      "fullName": "John Doe",
      "email": "john@example.com",
      "role": "user",
      "isActive": true,
      "lastLogin": null,
      "createdAt": "2026-02-27T10:00:00.000Z",
      "updatedAt": "2026-02-27T10:00:00.000Z"
    }
  }
}
```

### POST `/api/auth/login` (Public)

```bash
curl -sS -X POST "$BASE_URL/api/auth/login" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "john@example.com",
    "password": "password123"
  }'
```

```json
{
  "success": true,
  "message": "Logged in successfully",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.example.signature",
  "data": {
    "user": {
      "_id": "67b5a1234abc123456789001",
      "fullName": "John Doe",
      "email": "john@example.com",
      "role": "user",
      "isActive": true,
      "lastLogin": "2026-02-27T10:05:00.000Z",
      "createdAt": "2026-02-27T10:00:00.000Z",
      "updatedAt": "2026-02-27T10:05:00.000Z"
    }
  }
}
```

### GET `/api/auth/verify-email/:token` (Public, stub)

```bash
curl -sS "$BASE_URL/api/auth/verify-email/sample_verification_token"
```

```json
{
  "success": true,
  "message": "Email verification endpoint (not implemented)"
}
```

### POST `/api/auth/forgot-password` (Public, stub)

```bash
curl -sS -X POST "$BASE_URL/api/auth/forgot-password" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "john@example.com"
  }'
```

```json
{
  "success": true,
  "message": "Password reset email sent (mock)"
}
```

### PUT `/api/auth/reset-password/:token` (Public, stub)

```bash
curl -sS -X PUT "$BASE_URL/api/auth/reset-password/sample_reset_token" \
  -H "Content-Type: application/json" \
  -d '{
    "password": "newpassword123"
  }'
```

```json
{
  "success": true,
  "message": "Password reset successful (mock)"
}
```

### POST `/api/auth/logout` (Protected)

```bash
curl -sS -X POST "$BASE_URL/api/auth/logout" \
  -H "Authorization: Bearer $TOKEN"
```

```json
{
  "success": true,
  "message": "Logged out successfully"
}
```

### GET `/api/auth/me` (Protected)

```bash
curl -sS "$BASE_URL/api/auth/me" \
  -H "Authorization: Bearer $TOKEN"
```

```json
{
  "success": true,
  "data": {
    "user": {
      "_id": "67b5a1234abc123456789001",
      "fullName": "John Doe",
      "email": "john@example.com",
      "role": "user",
      "isActive": true,
      "lastLogin": "2026-02-27T10:05:00.000Z",
      "createdAt": "2026-02-27T10:00:00.000Z",
      "updatedAt": "2026-02-27T10:05:00.000Z"
    }
  }
}
```

### PUT `/api/auth/update-password` (Protected)

```bash
curl -sS -X PUT "$BASE_URL/api/auth/update-password" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "currentPassword": "password123",
    "newPassword": "newpassword456"
  }'
```

```json
{
  "success": true,
  "message": "Password updated successfully",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.example.signature",
  "data": {
    "user": {
      "_id": "67b5a1234abc123456789001",
      "fullName": "John Doe",
      "email": "john@example.com",
      "role": "user",
      "isActive": true,
      "lastLogin": "2026-02-27T10:05:00.000Z",
      "createdAt": "2026-02-27T10:00:00.000Z",
      "updatedAt": "2026-02-27T10:07:00.000Z"
    }
  }
}
```

---

## 3) Trees (All Protected)

### POST `/api/trees`

```bash
curl -sS -X POST "$BASE_URL/api/trees" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "My Oak Tree",
    "species": "Oak",
    "plantedDate": "2025-06-15",
    "status": "PLANTED",
    "imageUrl": "https://example.com/images/oak.jpg",
    "notes": "Healthy young oak tree",
    "location": {
      "type": "Point",
      "coordinates": [79.8612, 6.9271]
    }
  }'
```

```json
{
  "success": true,
  "message": "Tree created successfully",
  "data": {
    "tree": {
      "_id": "67b5a1234abc123456789012",
      "name": "My Oak Tree",
      "species": "Oak",
      "plantedDate": "2025-06-15T00:00:00.000Z",
      "status": "PLANTED",
      "imageUrl": "https://example.com/images/oak.jpg",
      "notes": "Healthy young oak tree",
      "location": {
        "type": "Point",
        "coordinates": [79.8612, 6.9271],
        "address": {
          "formatted": "Colombo, Sri Lanka",
          "city": "Colombo",
          "district": "Colombo District",
          "country": "Sri Lanka"
        }
      },
      "owner": {
        "_id": "67b5a1234abc123456789001",
        "fullName": "John Doe",
        "email": "john@example.com",
        "role": "user"
      },
      "isActive": true,
      "createdAt": "2026-02-27T10:10:00.000Z",
      "updatedAt": "2026-02-27T10:10:00.000Z"
    }
  }
}
```

### GET `/api/trees` (optional query: `species`, `status`)

```bash
curl -sS "$BASE_URL/api/trees?species=Oak&status=PLANTED" \
  -H "Authorization: Bearer $TOKEN"
```

```json
{
  "success": true,
  "message": "Trees fetched successfully",
  "count": 1,
  "data": {
    "trees": [
      {
        "_id": "67b5a1234abc123456789012",
        "name": "My Oak Tree",
        "species": "Oak",
        "plantedDate": "2025-06-15T00:00:00.000Z",
        "status": "PLANTED",
        "imageUrl": "https://example.com/images/oak.jpg",
        "notes": "Healthy young oak tree",
        "location": {
          "type": "Point",
          "coordinates": [79.8612, 6.9271],
          "address": {
            "formatted": "Colombo, Sri Lanka",
            "city": "Colombo",
            "district": "Colombo District",
            "country": "Sri Lanka"
          }
        },
        "owner": {
          "_id": "67b5a1234abc123456789001",
          "fullName": "John Doe",
          "email": "john@example.com",
          "role": "user"
        },
        "isActive": true,
        "createdAt": "2026-02-27T10:10:00.000Z",
        "updatedAt": "2026-02-27T10:10:00.000Z"
      }
    ]
  }
}
```

### GET `/api/trees/all` (information view; optional query: `species`, `status`)

> For non-admin users, `GET /api/trees` returns only their own trees.  
> `GET /api/trees/all` returns all active trees for any authenticated user.

```bash
curl -sS "$BASE_URL/api/trees/all?species=Oak&status=PLANTED" \
  -H "Authorization: Bearer $TOKEN"
```

```json
{
  "success": true,
  "message": "All trees fetched successfully",
  "count": 1,
  "data": {
    "trees": [
      {
        "_id": "67b5a1234abc123456789012",
        "name": "My Oak Tree",
        "species": "Oak",
        "plantedDate": "2025-06-15T00:00:00.000Z",
        "status": "PLANTED",
        "imageUrl": "https://example.com/images/oak.jpg",
        "notes": "Healthy young oak tree",
        "location": {
          "type": "Point",
          "coordinates": [79.8612, 6.9271]
        },
        "owner": {
          "_id": "67b5a1234abc123456789001",
          "fullName": "John Doe",
          "role": "user"
        }
      }
    ]
  }
}
```

### GET `/api/trees/:id`

```bash
curl -sS "$BASE_URL/api/trees/67b5a1234abc123456789012" \
  -H "Authorization: Bearer $TOKEN"
```

```json
{
  "success": true,
  "message": "Tree fetched successfully",
  "data": {
    "tree": {
      "_id": "67b5a1234abc123456789012",
      "name": "My Oak Tree",
      "species": "Oak",
      "plantedDate": "2025-06-15T00:00:00.000Z",
      "status": "PLANTED",
      "imageUrl": "https://example.com/images/oak.jpg",
      "notes": "Healthy young oak tree",
      "location": {
        "type": "Point",
        "coordinates": [79.8612, 6.9271],
        "address": {
          "formatted": "Colombo, Sri Lanka",
          "city": "Colombo",
          "district": "Colombo District",
          "country": "Sri Lanka"
        }
      },
      "owner": {
        "_id": "67b5a1234abc123456789001",
        "fullName": "John Doe",
        "email": "john@example.com",
        "role": "user"
      },
      "isActive": true,
      "createdAt": "2026-02-27T10:10:00.000Z",
      "updatedAt": "2026-02-27T10:10:00.000Z"
    }
  }
}
```

### PUT `/api/trees/:id`

```bash
curl -sS -X PUT "$BASE_URL/api/trees/67b5a1234abc123456789012" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "status": "GROWING",
    "notes": "Tree is growing well"
  }'
```

```json
{
  "success": true,
  "message": "Tree updated successfully",
  "data": {
    "tree": {
      "_id": "67b5a1234abc123456789012",
      "name": "My Oak Tree",
      "species": "Oak",
      "plantedDate": "2025-06-15T00:00:00.000Z",
      "status": "GROWING",
      "imageUrl": "https://example.com/images/oak.jpg",
      "notes": "Tree is growing well",
      "location": {
        "type": "Point",
        "coordinates": [79.8612, 6.9271],
        "address": {
          "formatted": "Colombo, Sri Lanka",
          "city": "Colombo",
          "district": "Colombo District",
          "country": "Sri Lanka"
        }
      },
      "owner": {
        "_id": "67b5a1234abc123456789001",
        "fullName": "John Doe",
        "email": "john@example.com",
        "role": "user"
      },
      "isActive": true,
      "createdAt": "2026-02-27T10:10:00.000Z",
      "updatedAt": "2026-02-27T10:12:00.000Z"
    }
  }
}
```

### DELETE `/api/trees/:id`

```bash
curl -sS -X DELETE "$BASE_URL/api/trees/67b5a1234abc123456789012" \
  -H "Authorization: Bearer $TOKEN"
```

```json
{
  "success": true,
  "message": "Tree deleted successfully"
}
```

---

## 4) Weather Care (Protected)

> Requires `OPENWEATHER_API_KEY`.

### GET `/api/weather-care/:treeId`

```bash
curl -sS "$BASE_URL/api/weather-care/67b5a1234abc123456789012" \
  -H "Authorization: Bearer $TOKEN"
```

```json
{
  "success": true,
  "message": "Weather data fetched successfully",
  "data": {
    "treeId": "67b5a1234abc123456789012",
    "treeName": "My Oak Tree",
    "location": {
      "coordinates": [79.8612, 6.9271],
      "address": {
        "formatted": "Colombo, Sri Lanka",
        "city": "Colombo",
        "district": "Colombo District",
        "country": "Sri Lanka"
      }
    },
    "weather": {
      "temperature": 28.5,
      "humidity": 75,
      "rainfall": 0,
      "windSpeed": 3.2,
      "description": "clear sky"
    }
  }
}
```

---

## 5) Risk Assessment (All Protected)

> Uses **Sentinel Hub** (Copernicus Dataspace) for satellite analysis and **Overpass API** (OpenStreetMap) for encroachment data.  
> If `SENTINEL_HUB_CLIENT_ID` / `SENTINEL_HUB_CLIENT_SECRET` are not configured, the service falls back to mock data automatically.

### Polygon Validation Rules

The `validatePolygon` middleware enforces these rules — your request body **must** match:

- `polygon.type` must equal `"Polygon"` (top-level field on the polygon object)
- `polygon.coordinates` must be an array of rings: `[ [ [lng, lat], ... ] ]`
- The first ring must have **at least 4 points**
- The ring must be **closed** (first point === last point)
- All coordinates must be valid: longitude `−180 to 180`, latitude `−90 to 90`

### POST `/api/risk/analyze`

> 📌 **Save the `_id`** from the response — you'll need it for GET, PUT, and DELETE below.

```bash
curl -sS -X POST "$BASE_URL/api/risk/analyze" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "polygon": {
      "id": "sinharaja-001",
      "name": "Sinharaja Rain Forest",
      "type": "Polygon",
      "coordinates": [[
        [80.3833, 6.3833],
        [80.4500, 6.3833],
        [80.4500, 6.4200],
        [80.3833, 6.4200],
        [80.3833, 6.3833]
      ]]
    }
  }'
```

```json
{
  "success": true,
  "data": {
    "_id": "69a1cf77b5e686055381546b",
    "polygonId": "sinharaja-001",
    "name": "Sinharaja Rain Forest",
    "coordinates": {
      "type": "Polygon",
      "coordinates": [[
        [80.3833, 6.3833],
        [80.45,   6.3833],
        [80.45,   6.42],
        [80.3833, 6.42],
        [80.3833, 6.3833]
      ]]
    },
    "analysisDate": "2026-02-27T17:08:07.168Z",
    "riskLevel": "low",
    "riskScore": 6,
    "factors": {
      "treeCoverLoss": 1,
      "degradationRate": 3.06,
      "fireRisk": 4,
      "encroachmentRisk": 20,
      "illegalLoggingProbability": 15
    },
    "satelliteData": {
      "source": "Sentinel-2 L2A",
      "imageryDate": "2026-02-27T17:08:07.155Z",
      "confidence": 85,
      "changeDetected": false,
      "treeCoverPercentage": 99,
      "historicalComparison": {
        "fiveYearChange": 3.1,
        "tenYearChange": 3.1
      }
    },
    "actions": [],
    "metadata": {
      "createdBy": "system",
      "updatedAt": "2026-02-27T17:08:07.156Z",
      "tags": ["low", "sentinel-hub"],
      "region": "Unknown Region"
    },
    "createdAt": "2026-02-27T17:08:07.175Z",
    "updatedAt": "2026-02-27T17:08:07.175Z",
    "__v": 0
  }
}
```

### GET `/api/risk/high` (query: `page`, `limit`, `sortBy`, `order`)

```bash
curl -sS "$BASE_URL/api/risk/high?page=1&limit=20&sortBy=riskScore&order=desc" \
  -H "Authorization: Bearer $TOKEN"
```

```json
{
  "success": true,
  "data": [
    {
      "_id": "69a1cf77b5e686055381546b",
      "polygonId": "colombo-fringe-001",
      "name": "Colombo Urban Fringe - Kaduwela",
      "riskLevel": "high",
      "riskScore": 74
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 1,
    "pages": 1
  }
}
```

### GET `/api/risk/stats`

```bash
curl -sS "$BASE_URL/api/risk/stats" \
  -H "Authorization: Bearer $TOKEN"
```

```json
{
  "success": true,
  "data": {
    "byLevel": [
      { "_id": "high",   "count": 1, "avgRiskScore": 74.0, "maxRiskScore": 74 },
      { "_id": "medium", "count": 2, "avgRiskScore": 48.5, "maxRiskScore": 55 },
      { "_id": "low",    "count": 1, "avgRiskScore": 22.0, "maxRiskScore": 22 }
    ],
    "total": 4,
    "critical": 0,
    "criticalPercentage": "0.00"
  }
}
```

### GET `/api/risk/:id`

```bash
curl -sS "$BASE_URL/api/risk/69a1cf77b5e686055381546b" \
  -H "Authorization: Bearer $TOKEN"
```

```json
{
  "success": true,
  "data": {
    "_id": "69a1cf77b5e686055381546b",
    "polygonId": "sinharaja-001",
    "name": "Sinharaja Rain Forest",
    "riskLevel": "low",
    "riskScore": 22,
    "factors": {
      "treeCoverLoss": 18,
      "degradationRate": 8,
      "fireRisk": 20,
      "encroachmentRisk": 12,
      "illegalLoggingProbability": 15
    },
    "satelliteData": {
      "source": "Sentinel-2 L2A",
      "confidence": 85,
      "changeDetected": false,
      "treeCoverPercentage": 82
    }
  }
}
```

### PUT `/api/risk/update/:id`

```bash
curl -sS -X PUT "$BASE_URL/api/risk/update/69a1cf77b5e686055381546b" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "riskLevel": "medium",
    "riskScore": 45,
    "factors": {
      "treeCoverLoss": 30,
      "degradationRate": 20,
      "fireRisk": 25,
      "encroachmentRisk": 15,
      "illegalLoggingProbability": 10
    },
    "metadata": {
      "region": "Ratnapura District",
      "country": "Sri Lanka",
      "tags": ["medium", "sentinel-hub", "reviewed"]
    },
    "actions": [
      {
        "type": "inspection",
        "status": "in_progress",
        "notes": "Ranger patrol scheduled for Sinharaja buffer zone",
        "assignedTo": "ranger-team-south-01"
      }
    ]
  }'
```

```json
{
  "success": true,
  "data": {
    "_id": "69a1cf77b5e686055381546b",
    "name": "Sinharaja Rain Forest",
    "riskLevel": "medium",
    "riskScore": 45,
    "metadata": {
      "region": "Ratnapura District",
      "country": "Sri Lanka",
      "tags": ["medium", "sentinel-hub", "reviewed"]
    }
  }
}
```

### DELETE `/api/risk/:id`

```bash
curl -sS -X DELETE "$BASE_URL/api/risk/69a1cf77b5e686055381546b" \
  -H "Authorization: Bearer $TOKEN"
```

```json
{
  "success": true,
  "message": "Risk assessment deleted successfully"
}
```

---

## 6) Events

### GET `/api/events` (Public; query: `page`, `limit`, `eventType`, `startDate`, `endDate`, `city`, `status`)

```bash
curl -sS "$BASE_URL/api/events?page=1&limit=10&eventType=workshop&city=Colombo&status=upcoming"
```

```json
{
  "success": true,
  "data": [
    {
      "_id": "67b5a1234abc1234567890bb",
      "title": "Sinharaja Forest Conservation Workshop",
      "description": "Learn about Sri Lanka's rainforest ecosystem and conservation efforts.",
      "eventType": "workshop",
      "startDate": "2026-03-10T09:00:00.000Z",
      "endDate": "2026-03-10T11:00:00.000Z",
      "location": {
        "address": "Viharamahadevi Park Auditorium",
        "city": "Colombo",
        "coordinates": { "lat": 6.9171, "lng": 79.8612 }
      },
      "maxParticipants": 50,
      "currentParticipants": 1,
      "tags": ["conservation", "rainforest", "community"],
      "status": "upcoming",
      "createdBy": "67b5a1234abc123456789001",
      "createdAt": "2026-02-27T10:30:00.000Z",
      "updatedAt": "2026-02-27T10:30:00.000Z",
      "__v": 0
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 1,
    "pages": 1
  }
}
```

### GET `/api/events/:id` (Public)

```bash
curl -sS "$BASE_URL/api/events/67b5a1234abc1234567890bb"
```

```json
{
  "success": true,
  "data": {
    "_id": "67b5a1234abc1234567890bb",
    "title": "Sinharaja Forest Conservation Workshop",
    "description": "Learn about Sri Lanka's rainforest ecosystem and conservation efforts.",
    "eventType": "workshop",
    "startDate": "2026-03-10T09:00:00.000Z",
    "endDate": "2026-03-10T11:00:00.000Z",
    "location": {
      "address": "Viharamahadevi Park Auditorium",
      "city": "Colombo",
      "coordinates": { "lat": 6.9171, "lng": 79.8612 }
    },
    "maxParticipants": 50,
    "currentParticipants": 1,
    "tags": ["conservation", "rainforest", "community"],
    "status": "upcoming",
    "reminders": true,
    "createdBy": "67b5a1234abc123456789001",
    "createdAt": "2026-02-27T10:30:00.000Z",
    "updatedAt": "2026-02-27T10:30:00.000Z",
    "__v": 0
  }
}
```

### GET `/api/events/:id/participants` (Public)

```bash
curl -sS "$BASE_URL/api/events/67b5a1234abc1234567890bb/participants"
```

```json
{
  "success": true,
  "data": {
    "confirmed": [
      {
        "_id": "67b5a1234abc123456789001",
        "fullName": "John Doe",
        "email": "john@example.com",
        "role": "user",
        "isActive": true,
        "joinedAt": "2026-02-27T10:30:00.000Z"
      }
    ],
    "waitlist": [],
    "total": 1,
    "maxParticipants": 50,
    "availableSpots": 49
  }
}
```

### GET `/api/events/search/nearby` (Public; query: `lat`, `lng`, `radius`)

```bash
curl -sS "$BASE_URL/api/events/search/nearby?lat=7.2906&lng=80.6337&radius=15"
```

```json
{
  "success": true,
  "data": [
    {
      "_id": "67b5a1234abc1234567890bc",
      "title": "Knuckles Range Tree Planting Drive",
      "eventType": "tree_planting",
      "location": {
        "address": "Knuckles Mountain Range Trailhead, Deanston",
        "city": "Kandy"
      },
      "status": "upcoming"
    }
  ]
}
```

### GET `/api/events/user/created` (Protected)

```bash
curl -sS "$BASE_URL/api/events/user/created" \
  -H "Authorization: Bearer $TOKEN"
```

```json
{
  "success": true,
  "data": [
    {
      "_id": "67b5a1234abc1234567890bb",
      "title": "Sinharaja Forest Conservation Workshop",
      "eventType": "workshop",
      "createdBy": "67b5a1234abc123456789001"
    }
  ]
}
```

### GET `/api/events/user/joined` (Protected)

```bash
curl -sS "$BASE_URL/api/events/user/joined" \
  -H "Authorization: Bearer $TOKEN"
```

```json
{
  "success": true,
  "data": [
    {
      "_id": "67b5a1234abc1234567890bb",
      "title": "Sinharaja Forest Conservation Workshop",
      "eventType": "workshop",
      "status": "upcoming"
    }
  ]
}
```

### POST `/api/events` (Protected)

```bash
curl -sS -X POST "$BASE_URL/api/events" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Knuckles Range Tree Planting Drive",
    "description": "Community tree planting drive to restore native species along the Knuckles buffer zone.",
    "eventType": "tree_planting",
    "startDate": "2026-03-22T07:00:00.000Z",
    "endDate": "2026-03-22T12:00:00.000Z",
    "location": {
      "address": "Knuckles Mountain Range Trailhead, Deanston",
      "city": "Kandy",
      "coordinates": { "lat": 7.4200, "lng": 80.7900 }
    },
    "maxParticipants": 40,
    "tags": ["reforestation", "knuckles", "native-species"],
    "images": [],
    "status": "upcoming",
    "reminders": true
  }'
```

```json
{
  "success": true,
  "data": {
    "_id": "67b5a1234abc1234567890bc",
    "title": "Knuckles Range Tree Planting Drive",
    "description": "Community tree planting drive to restore native species along the Knuckles buffer zone.",
    "eventType": "tree_planting",
    "startDate": "2026-03-22T07:00:00.000Z",
    "endDate": "2026-03-22T12:00:00.000Z",
    "location": {
      "address": "Knuckles Mountain Range Trailhead, Deanston",
      "city": "Kandy",
      "coordinates": { "lat": 7.42, "lng": 80.79 }
    },
    "maxParticipants": 40,
    "currentParticipants": 1,
    "tags": ["reforestation", "knuckles", "native-species"],
    "status": "upcoming",
    "reminders": true,
    "createdBy": "67b5a1234abc123456789001",
    "createdAt": "2026-02-27T10:40:00.000Z",
    "updatedAt": "2026-02-27T10:40:00.000Z",
    "__v": 0
  },
  "message": "Event created successfully"
}
```

### PUT `/api/events/:id` (Protected; creator only)

```bash
curl -sS -X PUT "$BASE_URL/api/events/67b5a1234abc1234567890bc" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "status": "ongoing",
    "maxParticipants": 50,
    "description": "Updated: buses arranged from Kandy town. Bring water and gloves."
  }'
```

```json
{
  "success": true,
  "data": {
    "_id": "67b5a1234abc1234567890bc",
    "status": "ongoing",
    "maxParticipants": 50,
    "description": "Updated: buses arranged from Kandy town. Bring water and gloves."
  },
  "message": "Event updated successfully"
}
```

### DELETE `/api/events/:id` (Protected; creator or admin)

```bash
curl -sS -X DELETE "$BASE_URL/api/events/67b5a1234abc1234567890bc" \
  -H "Authorization: Bearer $TOKEN"
```

```json
{
  "success": true,
  "message": "Event deleted successfully"
}
```

### POST `/api/events/:id/join` (Protected)

```bash
curl -sS -X POST "$BASE_URL/api/events/67b5a1234abc1234567890bb/join" \
  -H "Authorization: Bearer $TOKEN"
```

```json
{
  "success": true,
  "data": {
    "event": {
      "_id": "67b5a1234abc1234567890bb",
      "currentParticipants": 2
    },
    "participationStatus": "confirmed"
  },
  "message": "Successfully joined event"
}
```

### POST `/api/events/:id/leave` (Protected)

```bash
curl -sS -X POST "$BASE_URL/api/events/67b5a1234abc1234567890bb/leave" \
  -H "Authorization: Bearer $TOKEN"
```

```json
{
  "success": true,
  "message": "Successfully left the event"
}
```

---

## Quick Reference - All Endpoints

| # | Method | Endpoint | Auth |
|---|--------|----------|------|
| 1 | GET | `/api/health` | No |
| 2 | POST | `/api/auth/register` | No |
| 3 | POST | `/api/auth/login` | No |
| 4 | GET | `/api/auth/verify-email/:token` | No |
| 5 | POST | `/api/auth/forgot-password` | No |
| 6 | PUT | `/api/auth/reset-password/:token` | No |
| 7 | POST | `/api/auth/logout` | Yes |
| 8 | GET | `/api/auth/me` | Yes |
| 9 | PUT | `/api/auth/update-password` | Yes |
| 10 | POST | `/api/trees` | Yes |
| 11 | GET | `/api/trees` | Yes |
| 12 | GET | `/api/trees/all` | Yes |
| 13 | GET | `/api/trees/:id` | Yes |
| 14 | PUT | `/api/trees/:id` | Yes |
| 15 | DELETE | `/api/trees/:id` | Yes |
| 16 | GET | `/api/weather-care/:treeId` | Yes |
| 17 | POST | `/api/risk/analyze` | Yes |
| 18 | GET | `/api/risk/high` | Yes |
| 19 | GET | `/api/risk/stats` | Yes |
| 20 | GET | `/api/risk/:id` | Yes |
| 21 | PUT | `/api/risk/update/:id` | Yes |
| 22 | DELETE | `/api/risk/:id` | Yes |
| 23 | GET | `/api/events` | No |
| 24 | GET | `/api/events/search/nearby` | No |
| 25 | GET | `/api/events/:id` | No |
| 26 | GET | `/api/events/:id/participants` | No |
| 27 | GET | `/api/events/user/created` | Yes |
| 28 | GET | `/api/events/user/joined` | Yes |
| 29 | POST | `/api/events` | Yes |
| 30 | PUT | `/api/events/:id` | Yes |
| 31 | DELETE | `/api/events/:id` | Yes |
| 32 | POST | `/api/events/:id/join` | Yes |
| 33 | POST | `/api/events/:id/leave` | Yes |

---

## Error Handling

Most endpoints return JSON like:

```json
{
  "success": false,
  "message": "Error description here"
}
```

Some endpoints (notably `/api/risk/*` and `/api/events/*`) use an `error` field instead of `message`.

### Common Status Codes

| Code | Meaning |
|------|---------|
| 200 | OK |
| 201 | Created |
| 400 | Bad Request |
| 401 | Unauthorized |
| 403 | Forbidden |
| 404 | Not Found |
| 409 | Conflict |
| 500 | Server Error |

---

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| PORT | Server port | 5000 |
| NODE_ENV | Environment mode | development |
| MONGO_URI | MongoDB connection string | - |
| JWT_SECRET | JWT signing secret | - |
| JWT_EXPIRES_IN | Token expiration | 7d |
| CLIENT_URL | Frontend URL for CORS | http://localhost:5173 |
| OPENWEATHER_API_KEY | OpenWeatherMap API key | - |
| SENTINEL_HUB_CLIENT_ID | Sentinel Hub OAuth client ID (optional; uses mock if missing) | - |
| SENTINEL_HUB_CLIENT_SECRET | Sentinel Hub OAuth client secret (optional; uses mock if missing) | - |
| NOMINATIM_BASE_URL | Reverse geocoding base URL | https://nominatim.openstreetmap.org |
| NOMINATIM_USER_AGENT | Reverse geocoding User-Agent header | Forisswell/1.0 (...) |
| NOMINATIM_EMAIL | Reverse geocoding contact email (optional) | - |
| NOMINATIM_ACCEPT_LANGUAGE | Reverse geocoding response language (optional) | en |
| NOMINATIM_TIMEOUT_MS | Reverse geocoding timeout (ms) | 4000 |
| EMAIL_HOST | SMTP host (optional) | smtp.gmail.com |
| EMAIL_PORT | SMTP port (optional) | 587 |
| EMAIL_USER | SMTP username (optional) | - |
| EMAIL_PASS | SMTP password/app password (optional) | - |
| EMAIL_FROM | "From" email address (optional) | noreply@plantapp.com |

---

## License

This project is part of the AF (SE3040) course - Y3S2 2026.