# Volunteer Alert System - Setup Guide

## Quick Start

Complete guide to setting up and testing the Forisswell Volunteer Alert System from scratch.

---

## Prerequisites

Before you begin, ensure you have:

- **Node.js** v18 or higher ([Download](https://nodejs.org/))
- **MongoDB** (Local or Atlas) ([Download](https://www.mongodb.com/try/download/community))
- **Postman** (for API testing) ([Download](https://www.postman.com/downloads/))
- **Git** (for version control)
- A code editor (VS Code recommended)

---

## Step 1: Install Dependencies

Navigate to the Backend directory and install required packages:

```bash
cd Backend
npm install
```

Additional packages for the alert system:

```bash
npm install socket.io node-cron
```

**What each package does:**
- `socket.io` - Real-time WebSocket communication for instant notifications
- `node-cron` - Scheduled tasks for automated weather monitoring

**Note:** PWA push notifications (`web-push`) have been disabled per user preference. The system uses Socket.io for real-time notifications only.

---

## Step 2: Configure Environment Variables (No VAPID Keys Needed)

Update your `.env` file with the following configuration:

```env
# Server Configuration
PORT=5000
NODE_ENV=development
CLIENT_URL=http://localhost:5173

# Database
MONGO_URI=mongodb://localhost:27017/FORISSWELL

# Authentication
JWT_SECRET=your_super_secure_secret_key_here
JWT_EXPIRES_IN=7d
JWT_REFRESH_SECRET=your_refresh_secret_here
JWT_REFRESH_EXPIRES_IN=30d

# Weather API
OPENWEATHER_API_KEY=your_openweathermap_api_key

# Weather Alert Thresholds
ALERT_TEMP_THRESHOLD=35
ALERT_RAIN_THRESHOLD=50
ALERT_WIND_THRESHOLD=40

# Volunteer Matching Configuration
VOLUNTEER_MATCH_RADIUS=5
ALERT_CHECK_INTERVAL=300000
ALERT_ACCEPT_TIMEOUT=30
```

**Note:** VAPID keys for PWA push notifications have been removed as push notifications are disabled. The system uses Socket.io for real-time notifications.

### Configuration Explanations:

| Variable | Description | Default | Notes |
|----------|-------------|---------|-------|
| `ALERT_TEMP_THRESHOLD` | Temperature threshold (°C) | 35 | Alerts trigger when exceeded |
| `ALERT_RAIN_THRESHOLD` | Rainfall threshold (mm/h) | 50 | Measured per hour |
| `ALERT_WIND_THRESHOLD` | Wind speed threshold (km/h) | 40 | Converted from m/s |
| `VOLUNTEER_MATCH_RADIUS` | Max distance to match volunteers (km) | 5 | Geospatial search radius |
| `ALERT_CHECK_INTERVAL` | How often to check weather (ms) | 300000 | 5 minutes default |
| `ALERT_ACCEPT_TIMEOUT` | Time before alert expires (min) | 30 | If volunteer doesn't start |

### Getting OpenWeatherMap API Key:

1. Go to [OpenWeatherMap](https://openweathermap.org/api)
2. Sign up for a free account
3. Navigate to **API Keys** section
4. Copy your API key
5. Add to `.env` file

---

## Step 3: Run Database Migration

If you have existing users with the misspelled "volentieer" role, run the migration script:

```bash
node Backend/scripts/fixVolunteerRole.js
```

**Expected Output:**
```
Connecting to MongoDB...
✅ Connected to MongoDB

Searching for users with misspelled 'volentieer' role...
Found 2 users with misspelled role

Updating user: volunteer1@test.com (Test Volunteer 1)
Updating user: volunteer2@test.com (Test Volunteer 2)

✅ Successfully updated 2 user(s)
Migration completed successfully!

✅ Database connection closed
```

---

## Step 4: Start the Server

Start the development server with nodemon:

```bash
npm run dev
```

**Expected Output:**
```
✅ Database connected
✅ Socket.io initialized
✅ Server running on port 5000
✅ Weather monitoring started
Weather monitoring started with interval: 300000ms (*/5 * * * *)
```

**Note:** Push notification service initialization has been removed.

**Verify Everything is Running:**
- ✅ Database connection successful
- ✅ Socket.io initialized
- ✅ Weather monitoring started (cron job)
- ✅ Server listening on port 5000

---

## Step 5: Import Postman Collection

1. Open Postman
2. Click **Import** button (top left)
3. Select **File** tab
4. Browse to: `Backend/postman/Volunteer_Alert_System.postman_collection.json`
5. Click **Import**

The collection includes:
- ✅ Authentication (Register/Login)
- ✅ Volunteer Profile Management
- ✅ Alert Actions (Accept/Start/Complete)
- ✅ Admin Monitoring
- ✅ Automatic token management

---

## Step 6: Test the Complete Workflow

### 7.1 Register Volunteer Account

**Request:** `POST {{base_url}}/api/auth/register`

**Body:**
```json
{
  "fullName": "Test Volunteer",
  "email": "volunteer@forisswell.com",
  "password": "password123",
  "role": "volunteer"
}
```

**Expected Response:**
```json
{
  "success": true,
  "message": "Registered successfully",
  "token": "eyJhbGciOiJIUzI1NiIs...",
  "data": {
    "user": {
      "_id": "...",
      "fullName": "Test Volunteer",
      "email": "volunteer@forisswell.com",
      "role": "volunteer"
    }
  }
}
```

✅ **Token saved automatically** by Postman script!

---

### 7.2 Create Volunteer Profile

**Request:** `POST {{base_url}}/api/volunteers/profile`

**Headers:**
```
Authorization: Bearer {{volunteer_token}}
```

**Body:**
```json
{
  "phone": "+94771234567",
  "skills": ["watering", "pruning", "first_aid"],
  "location": {
    "coordinates": [79.8612, 6.9271]
  },
  "preferredRadius": 5,
  "emergencyContact": {
    "name": "Emergency Contact",
    "phone": "+94777654321",
    "relationship": "Friend"
  }
}
```

**Key Points:**
- `coordinates` format: `[longitude, latitude]` (GeoJSON standard)
- Colombo coordinates example: `[79.8612, 6.9271]`
- `preferredRadius` is in kilometers

---

### 7.3 Create Test Tree (As Tree Owner)

First, register a tree owner account:

**Request:** `POST {{base_url}}/api/auth/register`

**Body:**
```json
{
  "fullName": "Tree Owner",
  "email": "owner@forisswell.com",
  "password": "password123"
}
```

Then create a tree near the volunteer:

**Request:** `POST {{base_url}}/api/trees`

**Headers:**
```
Authorization: Bearer {{user_token}}
```

**Body:**
```json
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

**Distance Calculation:**
- Volunteer location: `[79.8612, 6.9271]`
- Tree location: `[79.8615, 6.9275]`
- Distance: ~0.5 km (within 5km radius ✅)

---

### 7.4 Wait for Automated Alert (or Trigger Manually)

The weather monitoring service checks all trees every 5 minutes. To test immediately:

**Option A: Lower Threshold (Easy)**

Edit `.env` temporarily:
```env
ALERT_TEMP_THRESHOLD=20  # Much lower for testing
```

Restart server. Next weather check will create alert.

**Option B: Manual Alert Creation (For Testing)**

Use MongoDB Compass or shell:

```javascript
db.alerts.insertOne({
  tree: ObjectId("your_tree_id_here"),
  type: "high_temperature",
  priority: "critical",
  status: "pending",
  description: "Test alert: Temperature exceeds threshold",
  weatherData: {
    temperature: 40,
    humidity: 75,
    rainfall: 0,
    windSpeed: 5.5,
    conditions: "clear sky"
  },
  thresholdViolations: [
    {
      type: "high_temperature",
      threshold: "35°C",
      actualValue: 40,
      excessAmount: 5
    }
  ],
  location: {
    type: "Point",
    coordinates: [79.8615, 6.9275]
  },
  isActive: true,
  createdAt: new Date()
});
```

---

### 7.5 Get Nearby Alerts

**Request:** `GET {{base_url}}/api/alerts/nearby`

**Headers:**
```
Authorization: Bearer {{volunteer_token}}
```

**Expected Response:**
```json
{
  "success": true,
  "message": "Nearby alerts fetched successfully",
  "count": 1,
  "data": {
    "alerts": [
      {
        "_id": "...",
        "type": "high_temperature",
        "priority": "critical",
        "status": "pending",
        "description": "Test Mango Tree requires immediate attention...",
        "tree": {
          "_id": "...",
          "name": "Test Mango Tree",
          "species": "Mango"
        },
        "weatherData": { ... }
      }
    ],
    "radius": 5
  }
}
```

---

### 7.6 Accept Alert (First-Come-First-Served)

**Request:** `POST {{base_url}}/api/alerts/{{alert_id}}/accept`

**Headers:**
```
Authorization: Bearer {{volunteer_token}}
```

**Expected Response:**
```json
{
  "success": true,
  "message": "Alert accepted successfully",
  "data": {
    "alert": {
      "_id": "...",
      "status": "assigned",
      "assignedTo": "your_volunteer_profile_id",
      "acceptedAt": "2026-02-27T12:34:56.789Z"
    }
  }
}
```

**What Happens:**
1. ✅ Alert status changes to `assigned`
2. ✅ Your volunteer status changes to `busy`
3. ✅ Other nearby volunteers get `alert-accepted` Socket.io event
4. ✅ Alert removed from their nearby list

**Note:** Push notification confirmation has been removed. You'll receive real-time updates via Socket.io only.

---

### 7.7 Start Work

**Request:** `POST {{base_url}}/api/alerts/{{alert_id}}/start`

**Expected Response:**
```json
{
  "success": true,
  "message": "Work started. Good luck!",
  "data": {
    "alert": {
      "status": "in_progress",
      "startedAt": "2026-02-27T12:40:00.000Z"
    }
  }
}
```

---

### 7.8 Complete Alert

**Request:** `POST {{base_url}}/api/alerts/{{alert_id}}/complete`

**Body:**
```json
{
  "notes": "Successfully watered the tree thoroughly and provided shade cover. The tree showed immediate positive response. Temperature was extremely high, so I also added mulch around the base to retain moisture.",
  "photoUrls": [
    "https://example.com/photo1.jpg",
    "https://example.com/photo2.jpg"
  ]
}
```

**Expected Response:**
```json
{
  "success": true,
  "message": "Great work! You contributed 0.8 hours.",
  "data": {
    "alert": {
      "status": "completed",
      "completedAt": "2026-02-27T12:47:00.000Z",
      "volunteerNotes": "Successfully watered..."
    },
    "contributionHours": 0.83
  }
}
```

**What Happens:**
1. ✅ Alert status = `completed`
2. ✅ Your status = `available` (ready for next alert)
3. ✅ Stats updated:
   - `completedAlerts` +1
   - `totalHours` + calculated hours
   - `averageCompletionTime` recalculated
4. ✅ Socket.io event to admin dashboard

**Note:** Push notification on completion has been removed.

---

### 7.9 Check Your Stats

**Request:** `GET {{base_url}}/api/volunteers/stats`

**Expected Response:**
```json
{
  "success": true,
  "message": "Statistics fetched successfully",
  "data": {
    "stats": {
      "totalAlerts": 1,
      "acceptedAlerts": 1,
      "completedAlerts": 1,
      "cancelledAlerts": 0,
      "totalHours": 0.83,
      "averageCompletionTime": 50.0,
      "completionRate": 100.0
    }
  }
}
```

---

## Step 7: Testing Socket.io Real-Time Notifications

### Backend (Already Done)

Socket.io is initialized in `Server.js` and configured in `config/socket.js`. It's running on the same port as your Express server.

### Frontend Integration Example

```javascript
import io from 'socket.io-client';

// Get JWT token from your auth state
const token = localStorage.getItem('volunteer_token');

// Connect to Socket.io
const socket = io('http://localhost:5000', {
  auth: {
    token: token
  }
});

// Connection handlers
socket.on('connect', () => {
  console.log('✅ Connected to Socket.io:', socket.id);
});

socket.on('connect_error', (error) => {
  console.error('❌ Connection error:', error);
});

// Listen for new alerts
socket.on('new-alert', (alert) => {
  console.log('🔔 New alert received:', alert);
  
  // Show notification to user
  showNotification({
    title: `${alert.priority.toUpperCase()} Alert!`,
    body: alert.description,
    onClick: () => navigateTo(`/alerts/${alert.id}`)
  });
  
  // Update UI (add to alerts list)
  addAlertToList(alert);
});

// Listen for alerts being accepted by others
socket.on('alert-accepted', ({ alertId }) => {
  console.log('Alert taken by another volunteer:', alertId);
  // Remove from available alerts list
  removeAlertFromList(alertId);
});

// Listen for alert expiry
socket.on('alert-expired', ({ alertId }) => {
  console.log('⏰ Your alert expired:', alertId);
  alert('Your assigned alert was released due to inactivity');
});

```

### Testing Socket.io in Browser Console

1. Open your frontend application
2. Open browser DevTools (F12)
3. Go to Console tab
4. Paste this code:

```javascript
const socket = io('http://localhost:5000', {
  auth: { token: 'your_jwt_token_here' }
});

socket.on('connect', () => console.log('Connected!'));
socket.on('new-alert', data => console.log('New alert:', data));
```

5. Create an alert (via MongoDB or wait for automated)
6. Watch console for real-time notification

---

## Step 8: Admin Dashboard Testing

### Register Admin Account

**Request:** `POST {{base_url}}/api/auth/register`

**Body:**
```json
{
  "fullName": "Admin User",
  "email": "admin@forisswell.com",
  "password": "admin123",
  "role": "admin"
}
```

### Test Admin Endpoints

1. **Get All Alerts:**
   ```
   GET /api/alerts?page=1&limit=20&status=completed
   ```

2. **Get Statistics:**
   ```
   GET /api/alerts/statistics
   ```

3. **Get Leaderboard:**
   ```
   GET /api/alerts/leaderboard?limit=10
   ```

4. **Get Map Data:**
   ```
   GET /api/alerts/map?status=pending
   ```

---

## Troubleshooting

### Issue: Weather monitoring not starting

**Symptoms:**
- No "Weather monitoring started" message in console
- No alerts being created

**Solutions:**
1. Check `ALERT_CHECK_INTERVAL` is valid number in .env
2. Verify `OPENWEATHER_API_KEY` is configured
3. Check server logs for errors
4. Restart server

### Issue: No alerts created despite high temperature

**Possible Causes:**
1. **Thresholds too high:** Lower `ALERT_TEMP_THRESHOLD` temporarily
2. **No trees:** Create test tree with valid coordinates
3. **Actually not hot:** Check real weather for your test coordinates
4. **Existing alert:** System doesn't create duplicate alerts for same tree

**Quick Test:**
```env
ALERT_TEMP_THRESHOLD=1  # Will always trigger
```

### Issue: Volunteers not receiving socket notifications

**Checklist:**
- [ ] Frontend connected to Socket.io (`socket.on('connect')` fires)
- [ ] Valid JWT token provided in connection auth
- [ ] Volunteer has completed profile
- [ ] Volunteer status is "available"
- [ ] Alert matches geospatial criteria (within radius)

**Debug Socket Connection:**
```javascript
socket.on('connect', () => console.log('Connected'));
socket.on('disconnect', () => console.log('Disconnected'));
socket.on('connect_error', err => console.error(err));
```

---

## Troubleshooting

This is **expected behavior** - only first volunteer to accept gets the alert. Others receive:
```json
{
  "success": false,
  "message": "Alert not available. It may have been accepted by another volunteer."
}
```

---

## Production Deployment Considerations

### Security

1. **Change default secrets:**
   ```env
   JWT_SECRET=use_strong_random_string_here
   JWT_REFRESH_SECRET=another_strong_random_string
   ```

2. **Use HTTPS** (recommended for secure WebSocket connections)

3. **Rate limiting** is already configured (100 requests / 10 min)

4. **CORS:** Update `CLIENT_URL` to your production frontend URL

### Persistence

1. **Replace node-cron** with a persistent job queue (Bull, Agenda) for production
2. Current cron jobs stop when server restarts

### Monitoring

1. Add logging service (e.g., Winston to file/cloud)
2. Monitor alert creation rate
3. Track volunteer response times
4. Set up error alerting (Sentry, etc.)

### Scaling

1. **MongoDB indexes** are already optimized (2dsphere for geospatial)
2. Consider Redis for Socket.io adapter if running multiple server instances
3. Cache weather API responses (5-minute TTL)

---

## Next Steps

1. ✅ Complete this setup guide
2. ✅ Test all endpoints in Postman
3. ✅ Integrate Socket.io in frontend
4. ✅ Build volunteer dashboard UI
5. ✅ Create admin monitoring dashboard
6. Test with real weather data
7. Deploy to production

**Note:** PWA push notification implementation has been removed per user preference.

---

## Support & Resources

- **API Documentation:** See `Alert_README.md`
- **Postman Collection:** `postman/Volunteer_Alert_System.postman_collection.json`
- **Database Schema:** Check models folder for detailed schemas

## License

Part of the AF (SE3040) course - Y3S2 2026.
