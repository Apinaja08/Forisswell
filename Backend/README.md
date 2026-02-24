# Forisswell Backend API

A RESTful API backend for the Forisswell application - a Weather-Based Tree Care management system.

## Project Overview

Forisswell is a comprehensive tree care management platform that provides:
- **User Authentication** - Secure registration, login, and JWT-based authorization
- **Weather-Based Tree Care** - Intelligent tree care recommendations based on weather conditions
- **Tree Management** - CRUD operations for managing trees
- **Event Management** - Community events with participation and calendar sync
- **Risk Analysis** - Area-based risk assessment and monitoring
- **Volunteer Management** - Uber-style volunteer registration, matching, and lifecycle management
- **Alert System** - Weather-threshold and Google-Calendar triggered alerts with real-time Socket.io notifications
- **Admin Panel** - Centralized volunteer oversight, alert cancellation, and manual monitoring triggers

## Tech Stack

- **Runtime:** Node.js
- **Framework:** Express.js 5.x
- **Database:** MongoDB with Mongoose ODM
- **Authentication:** JWT (JSON Web Tokens)
- **Security:** Helmet, CORS, Rate Limiting, NoSQL Injection Prevention
- **Real-Time:** Socket.io (shared HTTP port)
- **Scheduling:** node-cron (weather check every 15 min, alert retry every 2 min)

## Project Structure

```
Backend/
├── config/
│   └── db.js                    # MongoDB connection
├── controllers/
│   ├── authController.js           # Authentication logic
│   ├── eventController.js          # Event logic
│   ├── riskController.js           # Risk analysis logic
│   ├── treeController.js           # Tree CRUD logic
│   ├── weatherCareController.js    # Weather care logic
│   ├── volunteerController.js      # Volunteer CRUD + auth
│   ├── alertController.js          # Alert lifecycle
│   └── weatherMonitorController.js # Manual monitoring triggers
├── middleware/
│   └── auth.js                     # JWT protection (supports Volunteer + User)
├── models/
│   ├── User.js                     # User schema
│   ├── Tree.js                     # Tree schema
│   ├── Volunteer.js                # Volunteer schema (GeoJSON, bcrypt)
│   └── Alert.js                    # Alert schema (weather/calendar)
├── routes/
│   ├── authRoutes.js               # Auth endpoints
│   ├── eventRoutes.js              # Event endpoints
│   ├── riskRoutes.js               # Risk endpoints
│   ├── treeRoutes.js               # Tree endpoints
│   ├── weatherCareRoutes.js        # Weather care endpoints
│   ├── volunteerRoutes.js          # Volunteer endpoints
│   ├── alertRoutes.js              # Alert endpoints
│   └── adminRoutes.js              # Admin panel endpoints
├── services/
│   ├── calenderService.js              # Google Calendar integrations
│   ├── reverseGeocodingService.js      # Reverse geocoding (Nominatim)
│   ├── riskAnalysisService.js          # Risk analysis service
│   ├── weatherService.js               # OpenWeatherMap API service
│   ├── socketService.js                # Socket.io emit helpers
│   ├── volunteerService.js             # Volunteer business logic
│   ├── alertService.js                 # Alert creation, matching, retry
│   ├── weatherThresholdService.js      # Threshold evaluation + cron
│   └── calendarAlertService.js         # Calendar-based alert detection
├── .env                         # Environment variables
├── app.js                       # Express app configuration
├── Server.js                    # Server entry point
└── package.json                 # Dependencies
```

## Getting Started

### Prerequisites
- Node.js (v18 or higher)
- MongoDB (local or Atlas)
- Postman (for API testing)

### Installation

1. **Navigate to Backend folder:**
   ```bash
   cd Backend
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Configure environment variables:**
   Create a `.env` file with:
   ```env
   PORT=5000
   NODE_ENV=development
   MONGO_URI=your_mongodb_connection_string
   JWT_SECRET=your_super_secure_secret_key_here
   JWT_EXPIRES_IN=7d
   OPENWEATHER_API_KEY=your_openweathermap_api_key
   # Volunteer / Alert thresholds
   THRESHOLD_TEMP_HIGH=35
   THRESHOLD_WIND_HIGH=60
   THRESHOLD_RAIN_LOW=5
   STORM_KEYWORDS=thunderstorm,tornado,hurricane
   # Google Calendar (for calendar-based alerts)
   GOOGLE_CLIENT_ID=your_google_client_id
   GOOGLE_CLIENT_SECRET=your_google_client_secret
   GOOGLE_SYSTEM_REFRESH_TOKEN=your_refresh_token
   ```

4. **Start the server:**
   ```bash
   node Server.js
   ```

5. **Server will run on:** `http://localhost:5000`

---

## API Documentation

### Base URL
```
http://localhost:5000
```

---

## Endpoints

### Health Check
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/health` | No | Check if API is running |

```
GET http://localhost:5000/api/health
Body: None
```

---

### Authentication Routes

#### 1. Register User
```
POST http://localhost:5000/api/auth/register
```
**Body (raw JSON):**
```json
{
  "fullName": "John Doe",
  "email": "john@example.com",
  "password": "password123"
}
```
**Response:**
```json
{
  "success": true,
  "message": "Registered successfully",
  "token": "eyJhbGciOiJIUzI1NiIs...",
  "data": {
    "user": {
      "_id": "...",
      "fullName": "John Doe",
      "email": "john@example.com"
    }
  }
}
```

---

#### 2. Login User
```
POST http://localhost:5000/api/auth/login
```
**Body (raw JSON):**
```json
{
  "email": "john@example.com",
  "password": "password123"
}
```
**Response:**
```json
{
  "success": true,
  "message": "Logged in successfully",
  "token": "eyJhbGciOiJIUzI1NiIs...",
  "data": {
    "user": { ... }
  }
}
```

---

#### 3. Verify Email
```
GET http://localhost:5000/api/auth/verify-email/:token
```
**Params:** Replace `:token` with the verification token

---

#### 4. Forgot Password
```
POST http://localhost:5000/api/auth/forgot-password
```
**Body (raw JSON):**
```json
{
  "email": "john@example.com"
}
```

---

#### 5. Reset Password
```
PUT http://localhost:5000/api/auth/reset-password/:token
```
**Params:** Replace `:token` with the reset token

**Body (raw JSON):**
```json
{
  "password": "newpassword123"
}
```

---

### Protected Routes (Require Authentication)

> **Note:** Add `Authorization` header with `Bearer <your_token>` for all protected routes.

#### 6. Get Current User
```
GET http://localhost:5000/api/auth/me
```
**Headers:**
```
Authorization: Bearer eyJhbGciOiJIUzI1NiIs...
```
**Body:** None

---

#### 7. Update Password
```
PUT http://localhost:5000/api/auth/update-password
```
**Headers:**
```
Authorization: Bearer eyJhbGciOiJIUzI1NiIs...
```
**Body (raw JSON):**
```json
{
  "currentPassword": "password123",
  "newPassword": "newpassword456"
}
```

---

#### 8. Logout
```
POST http://localhost:5000/api/auth/logout
```
**Headers:**
```
Authorization: Bearer eyJhbGciOiJIUzI1NiIs...
```
**Body:** None

---

### Tree Routes (Protected - Require Authentication)

> **Note:** All tree routes require `Authorization: Bearer <token>` header.

#### 9. Create Tree
```
POST http://localhost:5000/api/trees
```
**Headers:**
```
Authorization: Bearer eyJhbGciOiJIUzI1NiIs...
Content-Type: application/json
```
**Body (raw JSON):**
```json
{
  "name": "My Oak Tree",
  "species": "Oak",
  "plantedDate": "2025-06-15",
  "status": "PLANTED",
  "notes": "Planted in backyard",
  "location": {
    "type": "Point",
    "coordinates": [79.8612, 6.9271],
    "address": {}
  }
}
```
**Response:**
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
      "location": { ... },
      "owner": { ... }
    }
  }
}
```

---

#### 10. Get All Trees
```
GET http://localhost:5000/api/trees
```
**Headers:**
```
Authorization: Bearer eyJhbGciOiJIUzI1NiIs...
```
**Query Parameters (optional):**
- `species` - Filter by species
- `status` - Filter by status (PLANTED, GROWING, MATURE, DEAD)

**Example:** `GET /api/trees?species=Oak&status=PLANTED`

**Response:**
```json
{
  "success": true,
  "message": "Trees fetched successfully",
  "count": 2,
  "data": {
    "trees": [ ... ]
  }
}
```

---

#### 11. Get Single Tree
```
GET http://localhost:5000/api/trees/:id
```
**Headers:**
```
Authorization: Bearer eyJhbGciOiJIUzI1NiIs...
```
**Params:** Replace `:id` with the tree's `_id`

**Example:** `GET /api/trees/67b5a1234abc123456789012`

---

#### 12. Update Tree
```
PUT http://localhost:5000/api/trees/:id
```
**Headers:**
```
Authorization: Bearer eyJhbGciOiJIUzI1NiIs...
Content-Type: application/json
```
**Body (raw JSON):**
```json
{
  "status": "GROWING",
  "notes": "Tree is growing well"
}
```

---

#### 13. Delete Tree
```
DELETE http://localhost:5000/api/trees/:id
```
**Headers:**
```
Authorization: Bearer eyJhbGciOiJIUzI1NiIs...
```
**Params:** Replace `:id` with the tree's `_id`

---

### Weather-Based Tree Care Routes (Protected)

#### 14. Get Weather for Tree
```
GET http://localhost:5000/api/weather-care/:treeId
```
**Headers:**
```
Authorization: Bearer eyJhbGciOiJIUzI1NiIs...
```
**Params:** Replace `:treeId` with the tree's `_id`

**Example:** `GET /api/weather-care/67b5a1234abc123456789012`

**Response:**
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

### Event Routes

#### Public Endpoints
- `GET /api/events` (supports `page`, `limit`, `eventType`, `startDate`, `endDate`, `city`, `status`)
- `GET /api/events/search/nearby?lat=6.9271&lng=79.8612&radius=10`
- `GET /api/events/:id`
- `GET /api/events/:id/participants`

#### Protected Endpoints (Require Authentication)
```
POST http://localhost:5000/api/events
```
**Body (raw JSON):**
```json
{
  "title": "Community Tree Planting",
  "description": "Join us for a community tree planting event",
  "eventType": "tree_planting",
  "startDate": "2026-03-10T09:00:00.000Z",
  "endDate": "2026-03-10T12:00:00.000Z",
  "location": {
    "address": "Independence Square",
    "city": "Colombo",
    "coordinates": { "lat": 6.9271, "lng": 79.8612 }
  },
  "maxParticipants": 50,
  "tags": ["community", "planting"],
  "status": "upcoming",
  "reminders": true
}
```

Other protected endpoints:
- `PUT /api/events/:id`
- `DELETE /api/events/:id`
- `POST /api/events/:id/join`
- `POST /api/events/:id/leave`
- `GET /api/events/user/created`
- `GET /api/events/user/joined`

---

### Risk Analysis Routes (Protected)

#### Analyze Risk for Polygon
```
POST http://localhost:5000/api/risk/analyze
```
**Body (raw JSON):**
```json
{
  "polygon": {
    "type": "Polygon",
    "coordinates": [
      [
        [79.8600, 6.9270],
        [79.8650, 6.9270],
        [79.8650, 6.9300],
        [79.8600, 6.9300],
        [79.8600, 6.9270]
      ]
    ]
  }
}
```

Other protected endpoints:
- `GET /api/risk/high`
- `GET /api/risk/stats`
- `GET /api/risk/:id`
- `PUT /api/risk/update/:id`
- `DELETE /api/risk/:id`

---

### Volunteer Routes

> Public routes need no token. Protected routes require `Authorization: Bearer <volunteer_token>`.
> Token payload carries `userType: "volunteer"` — auth middleware routes it to the Volunteer collection.

#### Register Volunteer
```
POST http://localhost:5000/api/volunteers/register
```
**Body (raw JSON):**
```json
{
  "name": "Test Volunteer",
  "email": "volunteer@test.com",
  "password": "password123",
  "phone": "+94771234567",
  "location": {
    "type": "Point",
    "coordinates": [80.2707, 6.9271]
  }
}
```
> `coordinates` is `[longitude, latitude]`. Returns `201` + `token`.

---

#### Login Volunteer
```
POST http://localhost:5000/api/volunteers/login
```
**Body (raw JSON):**
```json
{
  "email": "volunteer@test.com",
  "password": "password123"
}
```
> Returns `200` + `token`. Save this as your **volunteer token**.

---

#### Get My Profile
```
GET http://localhost:5000/api/volunteers/me
```
**Headers:** `Authorization: Bearer <volunteer_token>`

---

#### Update My Profile
```
PUT http://localhost:5000/api/volunteers/me
```
**Headers:** `Authorization: Bearer <volunteer_token>`, `Content-Type: application/json`

**Body (raw JSON):** _(only send fields you want to change — password/email/role are stripped server-side)_
```json
{
  "name": "Updated Name",
  "phone": "+94779876543",
  "location": {
    "type": "Point",
    "coordinates": [80.2710, 6.9275]
  }
}
```

---

#### Delete My Account
```
DELETE http://localhost:5000/api/volunteers/me
```
**Headers:** `Authorization: Bearer <volunteer_token>`
> Returns `400` if volunteer is currently `busy` on an active alert.

---

#### Get My Alert History
```
GET http://localhost:5000/api/volunteers/me/alerts
```
**Headers:** `Authorization: Bearer <volunteer_token>`
> Returns all alerts ever assigned to this volunteer.

---

### Alert Routes

> Alert lifecycle: `searching` → `accepted` → `in_progress` → `resolved`

#### Create Alert (Admin / System)
```
POST http://localhost:5000/api/alerts
```
**Headers:** `Authorization: Bearer <admin_token>`, `Content-Type: application/json`

**Body (raw JSON) — weather triggered:**
```json
{
  "treeId": "<tree_id>",
  "alertType": "high_temperature",
  "alertSource": "weather",
  "weatherSnapshot": {
    "temperature": 38.5,
    "windSpeed": 15,
    "humidity": 65,
    "rainfall": 0,
    "description": "clear sky, extreme heat"
  },
  "thresholdBreached": {
    "field": "temperature",
    "value": 38.5,
    "threshold": 35
  }
}
```

**Body (raw JSON) — calendar triggered:**
```json
{
  "treeId": "<tree_id>",
  "alertType": "calendar_event",
  "alertSource": "calendar",
  "calendarEventId": "google_event_abc123",
  "thresholdBreached": {
    "field": "calendar_event",
    "value": "Tree Pruning — Oak Tree",
    "threshold": "Scheduled care: pruning"
  }
}
```

Valid `alertType` values: `high_temperature` `high_wind` `drought` `storm` `calendar_event`
Valid `alertSource` values: `weather` `calendar`

> On creation the system automatically finds volunteers within **5 km** via `$near` and emits a Socket.io `new_alert` event to each. Returns `notifiedCount`.

---

#### Get All Alerts (Admin only)
```
GET http://localhost:5000/api/alerts
```
**Headers:** `Authorization: Bearer <admin_token>`

**Optional query parameters:**
- `?status=searching|accepted|in_progress|resolved|cancelled`
- `?alertSource=weather|calendar`
- `?treeId=<id>`

---

#### Get Single Alert
```
GET http://localhost:5000/api/alerts/:id
```
**Headers:** `Authorization: Bearer <any_token>`

---

#### Accept Alert (Volunteer only)
```
PUT http://localhost:5000/api/alerts/:id/accept
```
**Headers:** `Authorization: Bearer <volunteer_token>`
**Body:** None

> Atomic operation — returns `400` if another volunteer accepted first (race condition guard).
> Sets alert `status: "accepted"` and volunteer `availabilityStatus: "busy"`.

---

#### Start Work (Volunteer only)
```
PUT http://localhost:5000/api/alerts/:id/start
```
**Headers:** `Authorization: Bearer <volunteer_token>`
**Body:** None

> Sets alert `status: "in_progress"`.

---

#### Resolve Alert (Volunteer only)
```
PUT http://localhost:5000/api/alerts/:id/resolve
```
**Headers:** `Authorization: Bearer <volunteer_token>`
**Body:** None

> Sets alert `status: "resolved"`. Resets volunteer to `availabilityStatus: "available"`.
> Emits `alert_resolved` Socket.io event so the tree care team can update tree health status.

---

### Admin Routes

> **All routes require:** `Authorization: Bearer <admin_token>` (role must be `admin`)

#### Get All Volunteers
```
GET http://localhost:5000/api/admin/volunteers
GET http://localhost:5000/api/admin/volunteers?availabilityStatus=available
GET http://localhost:5000/api/admin/volunteers?availabilityStatus=busy
```

---

#### Get All Alerts (Admin view)
```
GET http://localhost:5000/api/admin/alerts
GET http://localhost:5000/api/admin/alerts?status=searching
GET http://localhost:5000/api/admin/alerts?alertSource=weather
```

---

#### Cancel Alert
```
PUT http://localhost:5000/api/admin/alerts/:id/cancel
```
**Body:** None

> Can cancel any alert regardless of status. Frees the assigned volunteer if one is attached.

---

#### Trigger Weather Check (Manual)
```
POST http://localhost:5000/api/admin/weather-check
```
**Body:** None

> Immediately runs the weather threshold scan across all active trees (same logic as the 15-minute cron job).

---

#### Trigger Calendar Check (Manual)
```
POST http://localhost:5000/api/admin/calendar-check
```
**Body:** None

> Scans Google Calendar for upcoming events on all active trees within the next 7 days and creates alerts where needed.

---

### Real-Time Socket.io Events

> Socket.io shares the same port as the HTTP server (`http://localhost:5000`).
> Authenticate by passing the JWT in the handshake:

```javascript
const socket = io('http://localhost:5000', {
  auth: { token: '<volunteer_or_admin_token>' }
});
```

**Rooms:**
- Volunteers automatically join `volunteer:<id>` for targeted alerts.
- Admins and users join the `admins` broadcast room.

**Events to listen for:**

| Event | Emitted to | Payload |
|-------|-----------|----------|
| `new_alert` | Nearby volunteers | `{ alertId, alertType, treeId, treeName, thresholdBreached }` |
| `alert_accepted` | All other notified volunteers | `{ alertId, message }` — dismiss the popup |
| `alert_resolved` | `admins` room (global) | `{ alertId, treeId, message }` — trigger tree health update |
| `no_volunteer_found` | `admins` room | `{ alertId, treeId, retryCount }` — after 3 failed retries |

---

## Postman Testing Guide

### Step 1: Test Health Check
1. Open Postman
2. Create new request: `GET http://localhost:5000/api/health`
3. Click **Send**
4. Expected: `{"success": true, "message": "API is running"}`

### Step 2: Register a User
1. Create new request: `POST http://localhost:5000/api/auth/register`
2. Go to **Body** tab → Select **raw** → Choose **JSON**
3. Enter:
   ```json
   {
     "fullName": "Test User",
     "email": "test@example.com",
     "password": "password123"
   }
   ```
4. Click **Send**
5. **Save the token from the response!**

### Step 3: Login
1. Create new request: `POST http://localhost:5000/api/auth/login`
2. Body → raw → JSON:
   ```json
   {
     "email": "test@example.com",
     "password": "password123"
   }
   ```
3. Click **Send**
4. **Copy the token** from response

### Step 4: Access Protected Routes
1. Create new request (e.g., `GET http://localhost:5000/api/auth/me`)
2. Go to **Headers** tab
3. Add new header:
   - **Key:** `Authorization`
   - **Value:** `Bearer <paste_your_token_here>`
4. Click **Send**

---

## Quick Reference - All Endpoints

| # | Method | Endpoint | Auth | Body Fields |
|---|--------|----------|------|-------------|
| 1 | GET | `/api/health` | No | - |
| 2 | POST | `/api/auth/register` | No | fullName, email, password |
| 3 | POST | `/api/auth/login` | No | email, password |
| 4 | GET | `/api/auth/verify-email/:token` | No | - |
| 5 | POST | `/api/auth/forgot-password` | No | email |
| 6 | PUT | `/api/auth/reset-password/:token` | No | password |
| 7 | GET | `/api/auth/me` | Yes | - |
| 8 | PUT | `/api/auth/update-password` | Yes | currentPassword, newPassword |
| 9 | POST | `/api/auth/logout` | Yes | - |
| 10 | POST | `/api/trees` | Yes | name, species, plantedDate, status, notes, location |
| 11 | GET | `/api/trees` | Yes | - |
| 12 | GET | `/api/trees/:id` | Yes | - |
| 13 | PUT | `/api/trees/:id` | Yes | (any tree fields) |
| 14 | DELETE | `/api/trees/:id` | Yes | - |
| 15 | GET | `/api/weather-care/:treeId` | Yes | - |
| 16 | GET | `/api/events` | No | - |
| 17 | GET | `/api/events/search/nearby` | No | lat, lng, radius |
| 18 | GET | `/api/events/:id` | No | - |
| 19 | GET | `/api/events/:id/participants` | No | - |
| 20 | POST | `/api/events` | Yes | title, description, eventType, startDate, endDate, location, maxParticipants, tags, status, reminders |
| 21 | PUT | `/api/events/:id` | Yes | (updatable event fields) |
| 22 | DELETE | `/api/events/:id` | Yes | - |
| 23 | POST | `/api/events/:id/join` | Yes | - |
| 24 | POST | `/api/events/:id/leave` | Yes | - |
| 25 | GET | `/api/events/user/created` | Yes | - |
| 26 | GET | `/api/events/user/joined` | Yes | - |
| 27 | POST | `/api/risk/analyze` | Yes | polygon |
| 28 | GET | `/api/risk/high` | Yes | - |
| 29 | GET | `/api/risk/stats` | Yes | - |
| 30 | GET | `/api/risk/:id` | Yes | - |
| 31 | PUT | `/api/risk/update/:id` | Yes | (risk fields) |
| 32 | DELETE | `/api/risk/:id` | Yes | - |
| **Volunteer Routes** |
| 33 | POST | `/api/volunteers/register` | No | name, email, password, phone, location |
| 34 | POST | `/api/volunteers/login` | No | email, password |
| 35 | GET | `/api/volunteers/me` | Volunteer | - |
| 36 | PUT | `/api/volunteers/me` | Volunteer | name, phone, location |
| 37 | DELETE | `/api/volunteers/me` | Volunteer | - |
| 38 | GET | `/api/volunteers/me/alerts` | Volunteer | - |
| **Alert Routes** |
| 39 | POST | `/api/alerts` | Admin | treeId, alertType, alertSource, weatherSnapshot, thresholdBreached |
| 40 | GET | `/api/alerts` | Admin | ?status, ?alertSource, ?treeId |
| 41 | GET | `/api/alerts/:id` | Any | - |
| 42 | PUT | `/api/alerts/:id/accept` | Volunteer | - |
| 43 | PUT | `/api/alerts/:id/start` | Volunteer | - |
| 44 | PUT | `/api/alerts/:id/resolve` | Volunteer | - |
| **Admin Routes** |
| 45 | GET | `/api/admin/volunteers` | Admin | ?availabilityStatus |
| 46 | GET | `/api/admin/alerts` | Admin | ?status, ?alertSource, ?treeId |
| 47 | PUT | `/api/admin/alerts/:id/cancel` | Admin | - |
| 48 | POST | `/api/admin/weather-check` | Admin | - |
| 49 | POST | `/api/admin/calendar-check` | Admin | - |

---

## Error Handling

The API returns consistent error responses:

```json
{
  "success": false,
  "message": "Error description here"
}
```

### Common Status Codes
| Code | Description |
|------|-------------|
| 200 | Success |
| 201 | Created |
| 400 | Bad Request |
| 401 | Unauthorized |
| 404 | Not Found |
| 409 | Conflict (Duplicate) |
| 500 | Server Error |

---

## Security Features

- **Helmet** - Sets security HTTP headers
- **CORS** - Cross-Origin Resource Sharing configuration
- **Rate Limiting** - 100 requests per 10 minutes per IP
- **NoSQL Injection Prevention** - Sanitizes MongoDB operators
- **Password Hashing** - bcrypt with salt rounds
- **JWT Authentication** - Secure token-based auth

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
| NOMINATIM_BASE_URL | Reverse geocoding base URL | https://nominatim.openstreetmap.org |
| NOMINATIM_USER_AGENT | Reverse geocoding User-Agent header | Forisswell/1.0 (...) |
| NOMINATIM_EMAIL | Reverse geocoding contact email (optional) | - |
| NOMINATIM_ACCEPT_LANGUAGE | Reverse geocoding response language (optional) | en |
| NOMINATIM_TIMEOUT_MS | Reverse geocoding timeout (ms) | 4000 |
| THRESHOLD_TEMP_HIGH | High temperature alert threshold (°C) | 35 |
| THRESHOLD_WIND_HIGH | High wind speed alert threshold (km/h) | 60 |
| THRESHOLD_RAIN_LOW | Low rainfall drought threshold (mm) | 5 |
| STORM_KEYWORDS | Comma-separated weather description keywords | thunderstorm,tornado,hurricane |
| WEATHER_POLL_INTERVAL | Cron expression for weather threshold check | */15 * * * * |
| GOOGLE_CLIENT_ID | Google OAuth2 client ID (calendar alerts) | - |
| GOOGLE_CLIENT_SECRET | Google OAuth2 client secret | - |
| GOOGLE_SYSTEM_REFRESH_TOKEN | Google refresh token for calendar scanning | - |

---

## License

This project is part of the AF (SE3040) course - Y3S2 2026.
