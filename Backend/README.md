# Forisswell Backend API

A RESTful API backend for the Forisswell application - a Weather-Based Tree Care management system.

## Project Overview

Forisswell is a comprehensive tree care management platform that provides:
- **User Authentication** - Secure registration, login, and JWT-based authorization
- **Weather-Based Tree Care** - Intelligent tree care recommendations based on weather conditions
- **Tree Management** - CRUD operations for managing trees

## Tech Stack

- **Runtime:** Node.js
- **Framework:** Express.js 5.x
- **Database:** MongoDB with Mongoose ODM
- **Authentication:** JWT (JSON Web Tokens)
- **Security:** Helmet, CORS, Rate Limiting, NoSQL Injection Prevention

## Project Structure

```
Backend/
├── config/
│   └── db.js                    # MongoDB connection
├── controllers/
│   ├── authController.js        # Authentication logic
│   ├── treeController.js        # Tree CRUD logic
│   └── weatherCareController.js # Weather care logic
├── middleware/
│   └── auth.js                  # JWT protection middleware
├── models/
│   ├── User.js                  # User schema
│   └── Tree.js                  # Tree schema
├── routes/
│   ├── authRoutes.js            # Auth endpoints
│   ├── treeRoutes.js            # Tree endpoints
│   └── weatherCareRoutes.js     # Weather care endpoints
├── services/
│   └── weatherService.js        # OpenWeatherMap API service
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
    "address": {
      "formatted": "Colombo, Sri Lanka",
      "city": "Colombo",
      "country": "Sri Lanka"
    }
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

---

## License

This project is part of the AF (SE3040) course - Y3S2 2026.
