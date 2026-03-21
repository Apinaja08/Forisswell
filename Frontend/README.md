# Forisswell Frontend

React frontend for Assignment Part 2 that consumes the existing backend API.

## Setup

```bash
cd Frontend
npm install
cp .env.example .env
npm run dev
```

## Environment Variables

- `VITE_API_BASE_URL` - Backend API base URL (default `http://localhost:5000/api`)

## Current Foundation

- React functional component architecture
- React Router based navigation
- Auth/session context with protected routes
- Axios API client with token interceptor
- Tailwind CSS setup
- Starter pages for dashboard, trees, events, alerts, and profile
