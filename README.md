# Smart Online Auction Platform

A full-stack online auction platform built with Node.js, React, and SQLite. Features real-time bidding via WebSockets, admin product management, and responsive design.

## Features

- **Live Auctions** - Real-time bidding with WebSocket (Socket.IO)
- **Product Management** - Full CRUD (Add, Update, Archive, Delete)
- **Admin Dashboard** - Stats, recent bids, quick actions
- **Countdown Timers** - Real-time auction countdowns
- **Responsive Design** - Works on desktop & mobile
- **Rate Limiting** - Handles 1000+ concurrent users
- **Auto Scheduling** - Auctions start/end automatically

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18, Vite, TailwindCSS |
| Backend | Node.js, Express |
| Database | SQLite (better-sqlite3) |
| Real-time | Socket.IO |
| Auth | JWT |

## Quick Start

### Prerequisites
- Node.js 18+ installed

### Installation

```bash
# Install all dependencies
npm install
npm run install:all
```

### Seed Demo Data (Optional)

```bash
npm run seed
```

### Run in Development

```bash
npm run dev
```

This starts both the backend (port 3001) and frontend (port 5173).

- **Frontend**: http://localhost:5173
- **Backend API**: http://localhost:3001

### Production Build

```bash
npm run build
npm start
```

Then visit http://localhost:3001

## Admin Access

- **URL**: http://localhost:5173/admin (dev) or http://localhost:3001/admin (prod)
- **Username**: `admin`
- **Password**: `admin123`

## API Endpoints

### Auth
- `POST /api/auth/login` - Admin login

### Products
- `GET /api/products` - List products (filters: status, category_id, search)
- `GET /api/products/:id` - Get product
- `POST /api/products` - Create product (admin, multipart/form-data)
- `PUT /api/products/:id` - Update product (admin)
- `PATCH /api/products/:id/archive` - Archive product (admin)
- `PATCH /api/products/:id/restore` - Restore product (admin)
- `DELETE /api/products/:id` - Delete product (admin)

### Auctions
- `GET /api/auctions` - List auctions (filters: status)
- `GET /api/auctions/:id` - Get auction with bid history
- `POST /api/auctions` - Create auction (admin)
- `PUT /api/auctions/:id` - Update auction (admin)
- `PATCH /api/auctions/:id/end` - End auction (admin)
- `DELETE /api/auctions/:id` - Delete auction (admin)

### WebSocket Events
- `join-auction` - Join auction room
- `place-bid` - Place bid (bidderName, amount, auctionId)
- `new-bid` - Broadcast new bid
- `auction-started` / `auction-ended` - Status changes
- `viewer-count` - Live viewer count

## Architecture

```
SmartOnlineAuction/
├── server/                 # Backend
│   ├── src/
│   │   ├── index.js       # Express server + Socket.IO
│   │   ├── database.js    # SQLite setup
│   │   ├── socket.js      # WebSocket handlers
│   │   ├── seed.js        # Demo data seeder
│   │   ├── middleware/
│   │   │   └── auth.js    # JWT middleware
│   │   └── routes/
│   │       ├── auth.js
│   │       ├── products.js
│   │       ├── auctions.js
│   │       ├── bids.js
│   │       └── categories.js
│   └── uploads/           # Product images
├── client/                 # Frontend
│   ├── src/
│   │   ├── App.jsx
│   │   ├── components/
│   │   ├── pages/
│   │   ├── context/
│   │   └── lib/
│   └── index.html
└── package.json
```

## Performance

Designed to handle **1000 concurrent users** at peak:
- SQLite WAL mode for concurrent reads
- Socket.IO WebSocket transport (reduces HTTP polling)
- In-memory bid rate limiting (1 bid/sec per user)
- Transaction-based bid placement (optimistic concurrency)
- Express compression & helmet for security
- API rate limiting (200 req/min per IP)

## Deployment (GitHub Pages + API Host)

GitHub Pages can host only the **frontend** (static files).  
This project also includes a Node.js + Socket.IO backend, so you must deploy:

- `client/` to GitHub Pages
- `server/` to another platform (Render, Railway, Fly.io, VPS, etc.)

### 1) Deploy frontend to GitHub Pages

A workflow is included at `.github/workflows/deploy-client-gh-pages.yml`.

1. Push to `main`
2. In GitHub repo settings:
	- **Pages** → Source: **GitHub Actions**
3. Add repository secrets:
	- `VITE_API_URL` = `https://your-backend-domain.com/api`
	- `VITE_SOCKET_URL` = `https://your-backend-domain.com`

The workflow builds `client/` and publishes `client/dist` to Pages.

### 2) Deploy backend separately

Set these backend environment variables on your server host:

- `NODE_ENV=production`
- `PORT=3001` (or host-provided port)
- `JWT_SECRET=<strong-secret>`
- `CLIENT_URLS=https://<your-username>.github.io,http://localhost:5173`

Use `CLIENT_URLS` as a comma-separated list of allowed frontend origins.

### Railway note (monorepo)

This repo uses a monorepo structure (`client/` + `server/`).  
If Railway deploys from repo root, it may fail because backend dependencies are in `server/`.

This project includes `nixpacks.toml` to force Railway to:
- install: `npm --prefix server ci --omit=dev`
- start: `npm --prefix server start`

After pulling latest commit in Railway, redeploy the service.

### 3) Frontend env example

See `client/.env.production.example` for required variables.
