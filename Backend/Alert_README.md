# Volunteer Alert System - Documentation

## Overview

The Forisswell Volunteer Alert System is a fully **automated, weather-based alert management system** that works like Uber for tree care. When weather conditions exceed configured thresholds (temperature, rainfall, wind), the system automatically creates alerts and broadcasts them to nearby volunteers. The first volunteer to accept gets the task - no admin intervention required.

## Key Features

- ✅ **Fully Automated** - No admin control; alerts auto-generated based on weather
- 🌍 **Geospatial Matching** - Volunteers within 5km radius get notified
- ⚡ **Real-time Notifications** - Socket.io + PWA push notifications
- 🏆 **First-Come-First-Served** - Race to accept alerts
- 📊 **Volunteer Statistics** - Track hours, completion rates, leaderboards
- 🔄 **Auto-expiry** - Unstarted alerts released after 30 minutes
- 📱 **Mobile-friendly** - Location updates, push notifications

---

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Weather Monitoring (Cron)                │
│          Checks all trees every 5 minutes                   │
└─────────────────────┬───────────────────────────────────────┘
                      │
                      ▼
         ┌────────────────────────────┐
         │  Weather API                │
         │  (OpenWeatherMap)           │
         └────────────┬────────────────┘
                      │
                      ▼
         ┌────────────────────────────┐
         │  Threshold Evaluation       │
         │  (Temp/Rain/Wind)           │
         └────────────┬────────────────┘
                      │
                      ▼
         ┌────────────────────────────┐
         │  Alert Creation             │
         │  (Automatic)                │
         └────────────┬────────────────┘
                      │
           ┌──────────┴──────────┐
           │                     │
           ▼                     ▼
    ┌─────────────┐      ┌─────────────┐
    │  Socket.io  │      │ Push        │
    │  Broadcast  │      │ Notification│
    └─────────────┘      └─────────────┘
           │                     │
           └──────────┬──────────┘
                      │
                      ▼
         ┌────────────────────────────┐
         │  Nearby Volunteers         │
         │  (Within 5km radius)       │
         └────────────┬───────────────┘
                      │
           ┌──────────┴──────────┐
           │First to Accept Wins │
           └──────────┬──────────┘
                      ▼
         ┌────────────────────────────┐
         │  Assigned → In Progress    │
         │  → Completed               │
         └────────────────────────────┘
```

---

## Alert Lifecycle

### State Machine

```
┌─────────┐
│ PENDING │ ◄──── Alert Created (Automated)
└────┬────┘       ↓ Broadcast to volunteers
     │            ↓ 30-minute auto-expiry if not accepted
     ▼
┌──────────┐
│ ASSIGNED │ ◄──── First volunteer accepts
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
                    ↓ Stats updated

Alternative paths:
ASSIGNED ──[timeout]──> PENDING (released back)
ASSIGNED ──[cancel]───> PENDING (volunteermakes them available)
```

### Status Descriptions

| Status | Description |
|--------|-------------|
| **PENDING** | Alert available for volunteers to accept |
| **ASSIGNED** | Volunteer accepted but hasn't started work yet |
| **IN_PROGRESS** | Volunteer actively working on the tree |
| **COMPLETED** | Work finished with notes/photos submitted |
| **CANCELLED** | Volunteer couldn't complete (released back to pending) |
| **EXPIRED** | Timeout occurred, released back to pending |

---

## Weather Thresholds

Configured in `.env` file:

```env
ALERT_TEMP_THRESHOLD=35     # Temperature in °C
ALERT_RAIN_THRESHOLD=50     # Rainfall in mm/h
ALERT_WIND_THRESHOLD=40     # Wind speed in km/h
```

### Alert Priority Calculation

| Condition | Priority |
|-----------|----------|
| 2+ thresholds exceeded | **CRITICAL** |
| 1 threshold exceeded by >50% | **CRITICAL** |
| 1 threshold exceeded by 30-50% | **HIGH** |
| 1 threshold exceeded by 15-30% | **MEDIUM** |
| 1 threshold exceeded by <15% | **LOW** |

### Alert Types

- `high_temperature` - Temp > threshold
- `heavy_rain` - Rain > threshold
- `strong_wind` - Wind > threshold
- `multiple_threats` - 2+ thresholds exceeded

---

## API Endpoints

### Volunteer Profile Management

#### Create Profile
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
    "name": "John Doe",
    "phone": "+94777654321",
    "relationship": "Friend"
  }
}
```

**Response:**
```json
{
  "success": true,
  "message": "Volunteer profile created successfully",
  "data": {
    "profile": {
      "_id": "...",
      "phone": "+94771234567",
      "location": { ... },
      "status": "available"
    }
  }
}
```

#### Get My Profile
```http
GET /api/volunteers/profile
Authorization: Bearer {token}
```

#### Update Status
```http
PATCH /api/volunteers/status
Authorization: Bearer {token}

{
  "status": "available",  // available | busy | offline
  "isAvailable": true
}
```

#### Get My Stats
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

### Alert Management (Volunteer Actions)

#### Get Nearby Alerts
```http
GET /api/alerts/nearby
Authorization: Bearer {token}
```

Returns all pending alerts within volunteer's preferred radius.

#### Get My Alerts
```http
GET /api/alerts/my-alerts?status=assigned
Authorization: Bearer {token}
```

#### Get Current Active Alert
```http
GET /api/alerts/my-active
Authorization: Bearer {token}
```

#### Accept Alert (First-Come-First-Served)
```http
POST /api/alerts/{alertId}/accept
Authorization: Bearer {token}
```

**Response:**
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

#### Start Work
```http
POST /api/alerts/{alertId}/start
Authorization: Bearer {token}
```

Changes status from `assigned` to `in_progress`.

#### Complete Alert
```http
POST /api/alerts/{alertId}/complete
Authorization: Bearer {token}

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

#### Cancel Alert
```http
POST /api/alerts/{alertId}/cancel
Authorization: Bearer {token}

{
  "reason": "Emergency came up, can't complete"
}
```

Releases alert back to pending for other volunteers.

---

### Admin Monitoring (Read-Only)

#### Get All Alerts
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

#### Get Statistics
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

#### Get Volunteer Leaderboard
```http
GET /api/alerts/leaderboard?limit=10
Authorization: Bearer {admin_token}
```

#### Get Map Data
```http
GET /api/alerts/map?status=pending&priority=critical
Authorization: Bearer {admin_token}
```

Returns geospatial data for visualizing alerts on a map.

---

## Socket.io Events

### Client Connection

```javascript
import io from 'socket.io-client';

const socket = io('http://localhost:5000', {
  auth: {
    token: 'your_jwt_token'
  }
});
```

### Events from Server → Client

#### `new-alert`
Sent to all nearby volunteers when a new alert is created.

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
Sent to nearby volunteers when someone else accepts an alert.

```javascript
socket.on('alert-accepted', (data) => {
  console.log('Alert taken:', data.alertId);
  // Remove from your nearby alerts list
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
Sent to the assigned volunteer if they don't start work in time.

```javascript
socket.on('alert-expired', (data) => {
  alert('Your assigned alert expired due to inactivity');
});
```

### Events from Client → Server

#### `update-status`
```javascript
socket.emit('update-status', { status: 'available' });
```

#### `join-alert`
Join a room for specific alert updates.

```javascript
socket.emit('join-alert', alertId);
```

---

## Push Notifications (PWA)

### Get VAPID Public Key
```http
GET /api/volunteers/vapid-public-key
```

### Subscribe to Push
```http
POST /api/volunteers/push-subscribe
Authorization: Bearer {token}

{
  "subscription": {
    "endpoint": "https://fcm.googleapis.com/fcm/send/...",
    "keys": {
      "p256dh": "...",
      "auth": "..."
    }
  }
}
```

### Frontend Service Worker Example

```javascript
// Register service worker
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('/sw.js');
}

// Request push permission
async function subscribeToPush() {
  const registration = await navigator.serviceWorker.ready;
  
  // Get VAPID public key from server
  const response = await fetch('/api/volunteers/vapid-public-key');
  const { data } = await response.json();
  
  const subscription = await registration.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: urlBase64ToUint8Array(data.publicKey)
  });
  
  // Send subscription to server
  await fetch('/api/volunteers/push-subscribe', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({ subscription })
  });
}

function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding)
    .replace(/-/g, '+')
    .replace(/_/g, '/');
  
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}
```

---

## Troubleshooting

### No alerts being created

**Check:**
1. Weather monitoring started: Check server logs for "Weather monitoring started"
2. Trees exist with valid coordinates in database
3. Weather API key configured: `OPENWEATHER_API_KEY` in `.env`
4. Thresholds are reasonable (not too high)

**Test manually:**
```bash
# Lower threshold temporarily
ALERT_TEMP_THRESHOLD=20  # Much lower for testing

# Restart server
npm run dev
```

### Volunteers not receiving notifications

**Check:**
1. Volunteer has completed profile with location
2. Volunteer status is "available" and `isAvailable: true`
3. Volunteer is within 5km of alert location
4. Socket.io connected: Check browser console for connection logs
5. Push subscription registered (for PWA push)

**Test Socket.io connection:**
```javascript
socket.on('connect', () => {
  console.log('Connected:', socket.id);
});

socket.on('connect_error', (error) => {
  console.error('Connection error:', error);
});
```

### Alert stuck in "assigned" status

**Check:**
- Volunteer may have closed app without starting
- Auto-expiry job runs every 5 minutes
- Check `expiresAt` field on alert document

**Manual fix:**
```javascript
// In MongoDB shell
db.alerts.updateOne(
  { _id: ObjectId("..."), status: "assigned" },
  { $set: { status: "pending", assignedTo: null, expiresAt: null } }
);
```

### Race condition: Multiple volunteers accepting same alert

This is handled by MongoDB's atomic `findOneAndUpdate` operation. Only the first request succeeds; others receive "Alert not available" error.

---

## Testing Guide

### 1. Setup Test Environment

```bash
# Install dependencies
npm install socket.io web-push node-cron

# Generate VAPID keys
npx web-push generate-vapid-keys

# Add to .env
# VAPID_PUBLIC_KEY=...
# VAPID_PRIVATE_KEY=...

# Run migration (if needed)
node Backend/scripts/fixVolunteerRole.js

# Start server
npm run dev
```

### 2. Create Test Volunteer

```bash
# Register volunteer account
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "fullName": "Test Volunteer",
    "email": "volunteer@test.com",
    "password": "password123",
    "role": "volunteer"
  }'

# Create volunteer profile
curl -X POST http://localhost:5000/api/volunteers/profile \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer {token}" \
  -d '{
    "phone": "+94771234567",
    "skills": ["watering", "pruning"],
    "location": {
      "coordinates": [79.8612, 6.9271]
    },
    "preferredRadius": 5
  }'
```

### 3. Create Test Tree

```bash
# Create tree near volunteer
curl -X POST http://localhost:5000/api/trees \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer {user_token}" \
  -d '{
    "name": "Test Mango Tree",
    "species": "Mango",
    "plantedDate": "2024-01-15",
    "status": "GROWING",
    "location": {
      "type": "Point",
      "coordinates": [79.8615, 6.9275]
    }
  }'
```

### 4. Trigger Alert (Manual for Testing)

Option A: Lower thresholds in `.env`:
```env
ALERT_TEMP_THRESHOLD=20
```

Option B: Create alert directly in MongoDB:
```javascript
db.alerts.insertOne({
  tree: ObjectId("your_tree_id"),
  type: "high_temperature",
  priority: "critical",
  status: "pending",
  description: "Test alert",
  weatherData: { temperature: 40, ... },
  location: { type: "Point", coordinates: [79.8615, 6.9275] },
  createdAt: new Date()
});
```

### 5. Test Workflow

1. **Get nearby alerts:**
   ```http
   GET /api/alerts/nearby
   ```

2. **Accept alert:**
   ```http
   POST /api/alerts/{alertId}/accept
   ```

3. **Start work:**
   ```http
   POST /api/alerts/{alertId}/start
   ```

4. **Complete:**
   ```http
   POST /api/alerts/{alertId}/complete
   Body: { "notes": "Test completion", "photoUrls": [] }
   ```

5. **Check stats:**
   ```http
   GET /api/volunteers/stats
   ```

---

## License

Part of the AF (SE3040) course - Y3S2 2026.
