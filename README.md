# Forisswell - Complete API Documentation

> **Weather-Based Tree Care Management System with Automated Volunteer Alert System**

A comprehensive tree care platform that automatically monitors weather conditions, creates alerts when trees need attention, and dispatches nearby volunteers in real-time using geospatial matching.

---

## 🌟 Features

### Core Functionality
- ✅ **User Authentication** - JWT-based secure login, registration, and role-based access (User, Volunteer, Admin)
- 🌳 **Tree Management** - Complete CRUD operations for tree inventory with geolocation
- 🌤️ **Weather Integration** - Real-time weather monitoring via OpenWeatherMap API
- ⚠️ **Automated Alert System** - Weather-based automatic alert generation with threshold monitoring
- 👥 **Volunteer Management** - Profile creation, skill tracking, availability status, and statistics
- 📍 **Geospatial Matching** - Volunteers within 5km radius get notified of nearby alerts
- ⚡ **Real-time Notifications** - Socket.io WebSocket-based instant alert broadcasts
- 🎯 **First-Come-First-Served** - Race condition handling for alert acceptance
- 📊 **Statistics & Leaderboards** - Volunteer contribution tracking, hours, completion rates
- 📅 **Event Management** - Tree care event scheduling and management
- 🚨 **Risk Analysis** - Environmental risk assessment for trees
- 🗺️ **Reverse Geocoding** - Automatic address resolution from coordinates

### Advanced Features
- 🔄 **Auto-expiry System** - Unaccepted/unstarted alerts automatically released
- 📈 **Admin Monitoring** - Dashboard statistics, volunteer leaderboards, alert analytics
- 🔐 **Role-Based Access Control** - Granular permissions for different user types
- 🛡️ **Security** - Helmet, CORS, rate limiting, NoSQL injection prevention
- 📝 **Comprehensive Logging** - Winston logger for debugging and monitoring

---

## 🛠️ Tech Stack

| Category | Technologies |
|----------|-------------|
| **Runtime** | Node.js (v18+) |
| **Framework** | Express.js 5.x |
| **Database** | MongoDB with Mongoose ODM 9.x |
| **Authentication** | JWT (JSON Web Tokens) |
| **Real-time** | Socket.io 4.8+ |
| **Scheduling** | node-cron 4.2+ |
| **Weather API** | OpenWeatherMap |
| **Geocoding** | Nominatim (OpenStreetMap) |
| **Security** | Helmet, CORS, Rate Limiting |
| **Logging** | Winston |
| **Email** | Nodemailer |
| **Calendar** | iCal Generator, Google Calendar API |

---

## 📁 Project Structure

```
Backend/
├── config/
│   └── db.js                           # MongoDB connection configuration
│
├── controllers/
│   ├── authController.js               # Authentication: register, login, logout
│   ├── treeController.js               # Tree CRUD operations
│   ├── weatherCareController.js        # Weather-based care recommendations
│   ├── eventController.js              # Event management
│   ├── riskController.js               # Risk analysis
│   ├── volunteerController.js          # Volunteer profile & status management
│   └── alertController.js              # Alert lifecycle management
│
├── middleware/
│   ├── auth.js                         # JWT protection & role authorization
│   └── validation.js                   # Input validation middleware
│
├── models/
│   ├── User.js                         # User schema with role (user/volunteer/admin)
│   ├── Tree.js                         # Tree schema with geospatial data
│   ├── Event.js                        # Tree care event schema
│   ├── Risk.js                         # Environmental risk schema
│   ├── VolunteerProfile.js             # Volunteer profile with location & stats
│   └── Alert.js                        # Alert lifecycle with status transitions
│
├── routes/
│   ├── authRoutes.js                   # /api/auth/*
│   ├── treeRoutes.js                   # /api/trees/*
│   ├── weatherCareRoutes.js            # /api/weather-care/*
│   ├── eventRoutes.js                  # /api/events/*
│   ├── riskRoutes.js                   # /api/risk/*
│   ├── volunteerRoutes.js              # /api/volunteers/*
│   └── alertRoutes.js                  # /api/alerts/*
│
├── services/
│   ├── weatherService.js               # OpenWeatherMap API integration
│   ├── alertService.js                 # Automated weather monitoring & alerts
│   ├── reverseGeocodingService.js      # Nominatim geocoding
│   ├── notificationService.js          # Socket.io broadcast service
│   ├── riskAnalysisService.js          # Risk assessment logic
│   ├── sentinelHubService.js           # Sentinel Hub satellite data
│   ├── overpassService.js              # OpenStreetMap encroachment data
│   ├── calenderService.js              # Calendar integration
│   └── pushNotificationService.js      # PWA push (currently disabled)
│
├── utils/
│   └── logger.js                       # Winston logger configuration
│
├── logs/                               # Application logs (auto-generated)
├── .env                                # Environment variables (DO NOT COMMIT)
├── .gitignore                          # Git ignore rules
├── app.js                              # Express app configuration
├── Server.js                           # Server entry point
├── package.json                        # Dependencies
└── README_FINAL.md                     # This file
```

---

## 🚀 Getting Started

### Prerequisites

- **Node.js** v18 or higher ([Download](https://nodejs.org/))
- **MongoDB** local instance or Atlas cloud ([Setup Guide](https://www.mongodb.com/docs/manual/installation/))
- **Postman** for API testing ([Download](https://www.postman.com/downloads/))
- **OpenWeatherMap API Key** ([Get Free Key](https://openweathermap.org/api))

### Installation

1. **Clone the repository:**
   ```bash
   cd c:\APINAJA\AFProject\Af_Forisswell\Forisswell\Backend
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Configure environment variables:**
   
   Create a `.env` file in the Backend folder:
   ```env
   # Server Configuration
   PORT=5000
   NODE_ENV=development
   CLIENT_URL=http://localhost:5173
   
   # Database
   MONGO_URI=mongodb://localhost:27017/FORISSWELL
   
   # JWT Authentication
   JWT_SECRET=your_super_secure_secret_key_change_this_in_production
   JWT_EXPIRES_IN=7d
   JWT_REFRESH_SECRET=your_refresh_secret_here
   JWT_REFRESH_EXPIRES_IN=30d
   
   # OpenWeatherMap API
   OPENWEATHER_API_KEY=your_openweathermap_api_key_here
   
   # Weather Alert Thresholds
   ALERT_TEMP_THRESHOLD=35              # Temperature in °C
   ALERT_RAIN_THRESHOLD=50              # Rainfall in mm/h
   ALERT_WIND_THRESHOLD=40              # Wind speed in km/h
   
   # Volunteer Matching Configuration
   VOLUNTEER_MATCH_RADIUS=5             # Radius in kilometers
   ALERT_CHECK_INTERVAL=300000          # Check every 5 minutes (in ms)
   ALERT_ACCEPT_TIMEOUT=30              # Minutes before alert expires
   
   # Sentinel Hub (Risk Analysis - optional, uses mock data if missing)
   SENTINEL_HUB_CLIENT_ID=your_sentinel_hub_client_id
   SENTINEL_HUB_CLIENT_SECRET=your_sentinel_hub_client_secret
   
   # Push Notifications (Optional - currently disabled)
   VAPID_PUBLIC_KEY=your_public_key_here
   VAPID_PRIVATE_KEY=your_private_key_here
   VAPID_SUBJECT=mailto:your-email@forisswell.com
   ```

4. **Start MongoDB:**
   ```bash
   # If using local MongoDB
   mongod
   ```

5. **Start the server:**
   ```bash
   npm start
   # or for development with auto-reload:
   npm run dev
   ```

6. **Verify server is running:**
   ```
   Server: http://localhost:5000
   Health Check: http://localhost:5000/api/health
   ```

---

## 📚 API Endpoints

### Base URL
```
http://localhost:5000/api
```

---

## 🔐 Authentication Endpoints

### Register User
```http
POST /api/auth/register
Content-Type: application/json

{
  "fullName": "John Doe",
  "email": "john@example.com",
  "password": "password123",
  "role": "user"  // "user" | "volunteer" | "admin"
}
```

**Response:**
```json
{
  "success": true,
  "message": "User registered successfully",
  "data": {
    "user": {
      "_id": "...",
      "fullName": "John Doe",
      "email": "john@example.com",
      "role": "user"
    },
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

### Login
```http
POST /api/auth/login
Content-Type: application/json

{
  "email": "john@example.com",
  "password": "password123"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "user": { ... },
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

### Get Current User
```http
GET /api/auth/me
Authorization: Bearer {token}
```

### Logout
```http
POST /api/auth/logout
Authorization: Bearer {token}
```

---

## 🌳 Tree Management Endpoints

### Create Tree
```http
POST /api/trees
Authorization: Bearer {token}
Content-Type: application/json

{
  "name": "Mango Tree",
  "species": "Mango",
  "plantedDate": "2024-01-15",
  "status": "GROWING",
  "location": {
    "type": "Point",
    "coordinates": [79.8612, 6.9271]  // [longitude, latitude]
  }
}
```

### Get All Trees
```http
GET /api/trees
Authorization: Bearer {token}
```

### Get Single Tree
```http
GET /api/trees/{treeId}
Authorization: Bearer {token}
```

### Update Tree
```http
PUT /api/trees/{treeId}
Authorization: Bearer {token}
Content-Type: application/json

{
  "name": "Updated Tree Name",
  "status": "HEALTHY"
}
```

### Delete Tree
```http
DELETE /api/trees/{treeId}
Authorization: Bearer {token}
```

### Get My Trees (User's own trees)
```http
GET /api/trees/my-trees
Authorization: Bearer {token}
```

---

## 🌤️ Weather Care Endpoints

### Get Weather Recommendations for Tree
```http
GET /api/weather-care/tree/{treeId}
Authorization: Bearer {token}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "tree": { ... },
    "weather": {
      "temperature": 28.5,
      "humidity": 75,
      "rainfall": 0,
      "windSpeed": 12.3,
      "description": "partly cloudy"
    },
    "recommendations": [
      "Water the tree regularly due to high temperature",
      "Monitor for pests in humid conditions"
    ],
    "action": "WATER"
  }
}
```

### Get Weather for Coordinates
```http
POST /api/weather-care/weather
Authorization: Bearer {token}
Content-Type: application/json

{
  "latitude": 6.9271,
  "longitude": 79.8612
}
```

---

## 👥 Volunteer Management Endpoints

### Create Volunteer Profile
```http
POST /api/volunteers/profile
Authorization: Bearer {token}
Content-Type: application/json

{
  "phone": "+94771234567",
  "skills": ["watering", "pruning", "first_aid"],
  "location": {
    "coordinates": [79.8612, 6.9271]
  },
  "preferredRadius": 5,
  "emergencyContact": {
    "name": "Jane Doe",
    "phone": "+94777654321",
    "relationship": "Spouse"
  }
}
```

### Get My Profile
```http
GET /api/volunteers/profile
Authorization: Bearer {token}
```

### Update Volunteer Status
```http
PATCH /api/volunteers/status
Authorization: Bearer {token}
Content-Type: application/json

{
  "status": "available",  // "available" | "busy" | "offline"
  "isAvailable": true
}
```

### Get My Statistics
```http
GET /api/volunteers/stats
Authorization: Bearer {token}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "stats": {
      "totalAlerts": 15,
      "acceptedAlerts": 12,
      "completedAlerts": 10,
      "cancelledAlerts": 2,
      "totalHours": 24.5,
      "averageCompletionTime": 147.2,
      "completionRate": 83.3
    }
  }
}
```

---

## ⚠️ Alert Management Endpoints

### Get Nearby Alerts (Volunteer)
```http
GET /api/alerts/nearby
Authorization: Bearer {token}
```

Returns all pending alerts within volunteer's preferred radius.

### Get My Alerts
```http
GET /api/alerts/my-alerts?status=assigned
Authorization: Bearer {token}
```

Query params: `status` (pending|assigned|in_progress|completed|cancelled)

### Get Current Active Alert
```http
GET /api/alerts/my-active
Authorization: Bearer {token}
```

Returns the single alert currently assigned to or in-progress by volunteer.

### Accept Alert (First-Come-First-Served)
```http
POST /api/alerts/{alertId}/accept
Authorization: Bearer {token}
```

**Success Response:**
```json
{
  "success": true,
  "message": "Alert accepted successfully",
  "data": {
    "alert": {
      "_id": "...",
      "status": "assigned",
      "tree": { ... },
      "weatherData": { ... }
    }
  }
}
```

**Error if already taken:**
```json
{
  "success": false,
  "message": "Alert not available. It may have been accepted by another volunteer."
}
```

### Start Work on Alert
```http
POST /api/alerts/{alertId}/start
Authorization: Bearer {token}
```

Changes status from `assigned` → `in_progress`.

### Complete Alert
```http
POST /api/alerts/{alertId}/complete
Authorization: Bearer {token}
Content-Type: application/json

{
  "notes": "Watered the tree thoroughly and provided shade cover. Tree responded well.",
  "photoUrls": [
    "https://example.com/photo1.jpg",
    "https://example.com/photo2.jpg"
  ]
}
```

**Response:**
```json
{
  "success": true,
  "message": "Great work! You contributed 2.3 hours.",
  "data": {
    "alert": { ... },
    "contributionHours": 2.3
  }
}
```

### Cancel Alert
```http
POST /api/alerts/{alertId}/cancel
Authorization: Bearer {token}
Content-Type: application/json

{
  "reason": "Emergency came up, can't complete"
}
```

Releases alert back to pending for other volunteers.

### Get All Alerts (Admin)
```http
GET /api/alerts?status=pending&priority=critical&page=1&limit=20
Authorization: Bearer {admin_token}
```

**Query Parameters:**
- `status` - pending|assigned|in_progress|completed|cancelled
- `priority` - critical|high|medium|low
- `type` - high_temperature|heavy_rain|strong_wind|multiple_threats
- `dateFrom` - ISO date
- `dateTo` - ISO date
- `volunteerId` - Filter by volunteer
- `treeId` - Filter by tree
- `page` - Page number
- `limit` - Results per page

### Get Alert Statistics (Admin)
```http
GET /api/alerts/statistics
Authorization: Bearer {admin_token}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "overview": {
      "total": 150,
      "pending": 5,
      "assigned": 3,
      "inProgress": 2,
      "completed": 135,
      "cancelled": 5,
      "critical": 10,
      "high": 30
    },
    "averageResponseTimeMinutes": 87.5
  }
}
```

### Get Volunteer Leaderboard (Admin)
```http
GET /api/alerts/leaderboard?limit=10
Authorization: Bearer {admin_token}
```

### Get Alerts Map Data (Admin)
```http
GET /api/alerts/map?status=pending&priority=critical
Authorization: Bearer {admin_token}
```

Returns geospatial data for visualizing alerts on a map.

---

## 📅 Event Management Endpoints

### GET `/api/events` (Public; query: `page`, `limit`, `eventType`, `startDate`, `endDate`, `city`, `status`)

```http
GET /api/events?page=1&limit=10&eventType=workshop&city=Colombo&status=upcoming
```

**Response:**
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

```http
GET /api/events/67b5a1234abc1234567890bb
```

**Response:**
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

```http
GET /api/events/67b5a1234abc1234567890bb/participants
```

**Response:**
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

```http
GET /api/events/search/nearby?lat=7.2906&lng=80.6337&radius=15
```

**Response:**
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

```http
GET /api/events/user/created
Authorization: Bearer {token}
```

**Response:**
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

```http
GET /api/events/user/joined
Authorization: Bearer {token}
```

**Response:**
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

```http
POST /api/events
Authorization: Bearer {token}
Content-Type: application/json

{
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
}
```

**Response:**
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

```http
PUT /api/events/67b5a1234abc1234567890bc
Authorization: Bearer {token}
Content-Type: application/json

{
  "status": "ongoing",
  "maxParticipants": 50,
  "description": "Updated: buses arranged from Kandy town. Bring water and gloves."
}
```

**Response:**
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

```http
DELETE /api/events/67b5a1234abc1234567890bc
Authorization: Bearer {token}
```

**Response:**
```json
{
  "success": true,
  "message": "Event deleted successfully"
}
```

### POST `/api/events/:id/join` (Protected)

```http
POST /api/events/67b5a1234abc1234567890bb/join
Authorization: Bearer {token}
```

**Response:**
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

```http
POST /api/events/67b5a1234abc1234567890bb/leave
Authorization: Bearer {token}
```

**Response:**
```json
{
  "success": true,
  "message": "Successfully left the event"
}
```

---

## 🚨 Risk Assessment Endpoints

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

```http
POST /api/risk/analyze
Authorization: Bearer {token}
Content-Type: application/json

{
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
}
```

**Response:**
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

```http
GET /api/risk/high?page=1&limit=20&sortBy=riskScore&order=desc
Authorization: Bearer {token}
```

**Response:**
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

```http
GET /api/risk/stats
Authorization: Bearer {token}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "byLevel": [
      { "_id": "high",   "count": 1, "avgRiskScore": 74.0, "maxRiskScore": 74 },
      { "_id": "medium", "count": 2, "avgRiskScore": 48.5, "maxRiskScore": 55 },
      { "_id": "low",    "count": 1, "avgRiskScore": 6.0,  "maxRiskScore": 6  }
    ],
    "total": 4,
    "critical": 0,
    "criticalPercentage": "0.00"
  }
}
```

### GET `/api/risk/:id`

```http
GET /api/risk/69a1cf77b5e686055381546b
Authorization: Bearer {token}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "_id": "69a1cf77b5e686055381546b",
    "polygonId": "sinharaja-001",
    "name": "Sinharaja Rain Forest",
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
      "confidence": 85,
      "changeDetected": false,
      "treeCoverPercentage": 99
    }
  }
}
```

### PUT `/api/risk/update/:id`

```http
PUT /api/risk/update/69a1cf77b5e686055381546b
Authorization: Bearer {token}
Content-Type: application/json

{
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
}
```

**Response:**
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

```http
DELETE /api/risk/69a1cf77b5e686055381546b
Authorization: Bearer {token}
```

**Response:**
```json
{
  "success": true,
  "message": "Risk assessment deleted successfully"
}
```

---

## 🔌 Socket.io Real-Time Events

### Client Connection

```javascript
import io from 'socket.io-client';

const socket = io('http://localhost:5000', {
  auth: {
    token: 'your_jwt_token'
  }
});

socket.on('connect', () => {
  console.log('Connected:', socket.id);
});
```

### Events from Server → Client

#### `new-alert`
Broadcast to nearby volunteers when new alert is created.

```javascript
socket.on('new-alert', (data) => {
  console.log('New alert:', data);
  // {
  //   id: "...",
  //   type: "high_temperature",
  //   priority: "critical",
  //   description: "...",
  //   tree: { ... },
  //   location: { ... },
  //   weatherData: { ... }
  // }
});
```

#### `alert-accepted`
Sent when another volunteer accepts an alert.

```javascript
socket.on('alert-accepted', (data) => {
  console.log('Alert taken:', data.alertId);
  // Remove from available alerts list
});
```

#### `alert-completed`
Sent when an alert is completed.

```javascript
socket.on('alert-completed', (data) => {
  console.log('Alert completed:', data);
});
```

#### `alert-expired`
Sent to assigned volunteer if they don't start work in time.

```javascript
socket.on('alert-expired', (data) => {
  alert('Your assigned alert expired due to inactivity');
});
```

---

## 🔄 Alert Lifecycle

```
┌─────────┐
│ PENDING │ ◄──── Alert Created (Automated by cron job)
└────┬────┘       ↓ Broadcast to nearby volunteers via Socket.io
     │            ↓ 30-minute auto-expiry if not accepted
     ▼
┌──────────┐
│ ASSIGNED │ ◄──── First volunteer accepts (race condition handled)
└────┬─────┘      ↓ Volunteer status = BUSY
     │            ↓ 30-minute timeout to start work
     ▼
┌──────────────┐
│ IN_PROGRESS  │ ◄──── Volunteer arrives & starts work
└────┬─────────┘      ↓ Working on tree care
     │
     ▼
┌───────────┐
│ COMPLETED │ ◄──── Volunteer submits notes & photos
└───────────┘       ↓ Volunteer status = AVAILABLE
                    ↓ Stats updated (hours, completion rate)

Alternative paths:
ASSIGNED ──[timeout]──> PENDING (released back)
ASSIGNED ──[cancel]───> PENDING (volunteer cancels)
PENDING ──[expires]──> EXPIRED (no volunteers available)
```

---

## ⚙️ System Configuration

### Weather Alert Thresholds

Configured in `.env` file:

| Threshold | Default | Description |
|-----------|---------|-------------|
| `ALERT_TEMP_THRESHOLD` | 35°C | Temperature above triggers alert |
| `ALERT_RAIN_THRESHOLD` | 50 mm/h | Heavy rainfall threshold |
| `ALERT_WIND_THRESHOLD` | 40 km/h | Strong wind threshold |

### Alert Priority Calculation

| Condition | Priority |
|-----------|----------|
| 2+ thresholds exceeded | **CRITICAL** |
| 1 threshold exceeded by >50% | **CRITICAL** |
| 1 threshold exceeded by 30-50% | **HIGH** |
| 1 threshold exceeded by 15-30% | **MEDIUM** |
| 1 threshold exceeded by <15% | **LOW** |

### Automated Weather Monitoring

- **Cron Schedule**: Configurable via `ALERT_CHECK_INTERVAL` (default: 5 minutes)
- **Minimum Interval**: 1 minute (60000ms)
- **Process**: 
  1. Fetches all trees from database
  2. Gets current weather for each tree's location
  3. Evaluates thresholds
  4. Creates alerts if thresholds exceeded
  5. Finds volunteers within radius
  6. Broadcasts via Socket.io

### Volunteer Matching

- **Default Radius**: 5km (configurable via `VOLUNTEER_MATCH_RADIUS`)
- **Geospatial Query**: Uses MongoDB 2dsphere index for efficient location queries
- **Status Filter**: Only `available` and `isAvailable: true` volunteers get notifications

---

## 🧪 Testing Guide

### 1. Test Authentication

**Register as Volunteer:**
```http
POST http://localhost:5000/api/auth/register
Content-Type: application/json

{
  "fullName": "Test Volunteer",
  "email": "volunteer@test.com",
  "password": "password123",
  "role": "volunteer"
}
```

Save the returned `token` for subsequent requests.

### 2. Create Volunteer Profile

```http
POST http://localhost:5000/api/volunteers/profile
Authorization: Bearer {token}
Content-Type: application/json

{
  "phone": "+94771234567",
  "skills": ["watering", "pruning"],
  "location": {
    "coordinates": [79.8612, 6.9271]
  },
  "preferredRadius": 5
}
```

### 3. Create Test Tree

Register as regular user first, then:

```http
POST http://localhost:5000/api/trees
Authorization: Bearer {user_token}
Content-Type: application/json

{
  "name": "Test Mango Tree",
  "species": "Mango",
  "plantedDate": "2024-01-15",
  "status": "GROWING",
  "location": {
    "type": "Point",
    "coordinates": [79.8615, 6.9275]
  }
}
```

### 4. Trigger Alerts (For Testing)

**Option A: Lower threshold temporarily**

In `.env`:
```env
ALERT_TEMP_THRESHOLD=20  # Much lower than normal
```

Restart server. Alerts will be created automatically.

**Option B: Check nearby alerts**

```http
GET http://localhost:5000/api/alerts/nearby
Authorization: Bearer {volunteer_token}
```

### 5. Test Alert Flow

```http
# Step 1: Accept
POST http://localhost:5000/api/alerts/{alertId}/accept
Authorization: Bearer {volunteer_token}

# Step 2: Start
POST http://localhost:5000/api/alerts/{alertId}/start
Authorization: Bearer {volunteer_token}

# Step 3: Complete
POST http://localhost:5000/api/alerts/{alertId}/complete
Authorization: Bearer {volunteer_token}
Content-Type: application/json

{
  "notes": "Watered the tree and provided shade cover.",
  "photoUrls": []
}
```

### 6. Check Statistics

```http
GET http://localhost:5000/api/volunteers/stats
Authorization: Bearer {volunteer_token}
```

---

## 🔧 Troubleshooting

### Server won't start

**Error: `EADDRINUSE: address already in use`**
```bash
# Find and kill process on port 5000
netstat -ano | findstr :5000
taskkill /PID <PID> /F
```

**Error: `Cannot connect to MongoDB`**
- Verify MongoDB is running: `mongod`
- Check `MONGO_URI` in `.env` is correct
- For MongoDB Atlas, ensure IP whitelist includes your IP

### No alerts being created

**Check:**
1. Server logs show: `"Weather monitoring started - checking every X minutes"`
2. Trees exist in database with valid coordinates
3. `OPENWEATHER_API_KEY` is valid in `.env`
4. Thresholds are set appropriately (not too high)

**Test weather API manually:**
```http
POST http://localhost:5000/api/weather-care/weather
Authorization: Bearer {token}
Content-Type: application/json

{
  "latitude": 6.9271,
  "longitude": 79.8612
}
```

### Volunteers not receiving notifications

**Check:**
1. Volunteer profile created with location
2. Volunteer status is `"available"` and `isAvailable: true`
3. Volunteer is within 5km of alert location
4. Socket.io connected (check browser console)

**Test Socket.io connection:**
```javascript
socket.on('connect', () => {
  console.log('Connected:', socket.id);
});

socket.on('connect_error', (error) => {
  console.error('Connection error:', error);
});
```

### Alert not found or not assigned to you

**This error means:**
- Alert isn't assigned to your volunteer profile ID
- You're using wrong token/account
- Alert status isn't "assigned" or "in_progress"

**Solution:**
1. Verify your volunteer profile ID matches alert's `assignedTo`
2. Follow the workflow: accept → start → complete (in order)
3. Check alert details: `GET /api/alerts/{alertId}`

### Race condition: Multiple volunteers accepting same alert

This is **handled correctly** by MongoDB's atomic `findOneAndUpdate`. Only the first request succeeds; others get error: `"Alert not available"`.

---

## 📊 Database Schema Overview

### User Model
```javascript
{
  fullName: String,
  email: String (unique),
  password: String (hashed),
  role: String (user | volunteer | admin),
  isActive: Boolean,
  createdAt: Date
}
```

### Tree Model
```javascript
{
  name: String,
  species: String,
  plantedDate: Date,
  status: String,
  location: {
    type: "Point",
    coordinates: [longitude, latitude],
    address: { formatted, city, district, country }
  },
  owner: ObjectId (ref: User),
  createdAt: Date
}
```

### VolunteerProfile Model
```javascript
{
  user: ObjectId (ref: User),
  phone: String,
  skills: [String],
  location: {
    coordinates: [longitude, latitude]
  },
  preferredRadius: Number (default: 5),
  status: String (available | busy | offline),
  isAvailable: Boolean,
  stats: {
    totalAlerts: Number,
    completedAlerts: Number,
    totalHours: Number,
    averageCompletionTime: Number,
    completionRate: Number
  },
  emergencyContact: { name, phone, relationship }
}
```

### Alert Model
```javascript
{
  tree: ObjectId (ref: Tree),
  type: String (high_temperature | heavy_rain | strong_wind | multiple_threats),
  priority: String (critical | high | medium | low),
  status: String (pending | assigned | in_progress | completed | cancelled | expired),
  assignedTo: ObjectId (ref: VolunteerProfile),
  weatherData: { temperature, humidity, rainfall, windSpeed, conditions },
  thresholdViolations: [{ type, threshold, actualValue, excessAmount }],
  actionRequired: [String],
  location: { type: "Point", coordinates, address },
  acceptedAt: Date,
  startedAt: Date,
  completedAt: Date,
  expiresAt: Date,
  volunteerNotes: String,
  photoUrls: [String]
}
```

---

## 🔒 Security Best Practices

### Production Checklist

- [ ] Change `JWT_SECRET` to a strong random string (min 32 characters)
- [ ] Change `ALERT_TEMP_THRESHOLD` back to 35°C (currently 1°C for testing)
- [ ] Set `NODE_ENV=production` in `.env`
- [ ] Enable MongoDB authentication
- [ ] Configure CORS `CLIENT_URL` to your production domain
- [ ] Set up SSL/TLS for HTTPS
- [ ] Configure rate limiting appropriately for production traffic
- [ ] Set up monitoring and error tracking (e.g., Sentry)
- [ ] Regular backups of MongoDB
- [ ] Environment variables managed securely (not in code)

### API Security Features

✅ **Helmet** - Sets security HTTP headers  
✅ **CORS** - Controlled cross-origin access  
✅ **Rate Limiting** - 100 requests per 10 minutes per IP  
✅ **NoSQL Injection Prevention** - Strips MongoDB operators from input  
✅ **JWT Authentication** - Stateless token-based auth  
✅ **Password Hashing** - bcrypt with salt rounds  
✅ **Role-Based Access Control** - Granular permissions  

---

## 📈 Performance & Scalability

### Database Indexes

Ensure MongoDB indexes for optimal performance:

```javascript
// Tree location (geospatial)
db.trees.createIndex({ "location": "2dsphere" })

// Volunteer location (geospatial)
db.volunteerprofiles.createIndex({ "location.coordinates": "2dsphere" })

// Alert queries
db.alerts.createIndex({ status: 1, createdAt: -1 })
db.alerts.createIndex({ assignedTo: 1, status: 1 })
db.alerts.createIndex({ tree: 1 })

// User email (unique)
db.users.createIndex({ email: 1 }, { unique: true })
```

### Recommended Production Settings

- **ALERT_CHECK_INTERVAL**: `300000` (5 minutes) - balance between responsiveness and API limits
- **VOLUNTEER_MATCH_RADIUS**: `5` (5km) - adjust based on volunteer density
- **MongoDB Connection Pool**: Configure in `config/db.js` for concurrent requests
- **Socket.io Adapter**: Use Redis adapter for horizontal scaling across multiple servers

---

## 📝 License

This project is part of the **AF (SE3040) course - Y3S2 2026**.

---

## 👥 Contributors

- Development Team: Forisswell Project Team
- Course: SE3040 - Advanced Software Engineering
- Academic Year: 2026

---

## 📞 Support

For issues or questions:
1. Check this documentation first
2. Review server logs in `Backend/logs/`
3. Test endpoints using Postman
4. Contact project team

---

## 🎯 Quick Start Commands

```bash
# Install dependencies
npm install

# Start server (production)
npm start

# Start server (development with auto-reload)
npm run dev

# Test health endpoint
curl http://localhost:5000/api/health

# Check MongoDB connection
mongosh mongodb://localhost:27017/FORISSWELL
```

---

**Last Updated:** February 27, 2026  
**Version:** 1.0.0  
**Node.js Version:** 18+  
**MongoDB Version:** 6.0+