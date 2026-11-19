# FUDORA

**3D pop-up menu book and real-time food delivery platform.**

FUDORA is a full-stack web app where customers browse an interactive 3D menu, order, and follow their delivery live from the kitchen to the doorstep. It includes an AI culinary assistant, delivery quality checks, and an analytics dashboard for operations teams.

---

## Features

- **3D pop-up menu book.** Browse dishes in an interactive 3D menu with 360° previews, plus calorie, protein and allergen details for every item.
- **Cart and checkout.** Build an order and check out in a guided flow.
- **Live delivery tracking.** Follow the courier on a map with route, ETA and delivery milestones. Replay the path the courier took, monitor food temperature in transit, and rate the order on arrival.
- **Delivery quality scan.** Get a quality report on delivery covering seal integrity, temperature compliance and presentation.
- **Real-time order status.** Status updates are pushed over WebSockets, with automatic polling as a fallback.
- **AI culinary assistant.** Chat about dishes, nutrition and allergens; ask by voice; or talk to the assistant in a real-time voice conversation.
- **Operations analytics.** Demand forecasts, fleet allocation, route optimization insights, customer behavior segments and a city demand heatmap.
- **Accounts.** Google sign-in, personal settings and order history.
- **Sharing.** Share dishes and meals with friends.

## Tech Stack

| Layer    | Technologies                                                        |
| -------- | ------------------------------------------------------------------- |
| Frontend | React 19, TypeScript, Vite 8, Tailwind CSS 4, Three.js, Motion, D3  |
| Backend  | Node.js, Express 4, WebSockets (`ws`)                               |
| Auth     | Firebase Authentication (Google sign-in), Firebase Admin SDK        |
| Data     | PostgreSQL, Drizzle ORM                                             |
| Maps     | Google Maps JavaScript API and Routes API (`@vis.gl/react-google-maps`) |

---

## Getting Started

### Prerequisites

- **Node.js** 20.19+ or 22.12+
- **npm**

### 1. Install dependencies

```bash
npm install
```

### 2. Configure environment variables

Create a file named `.env.local` in the project root, using `.env.example` as the template. The exact variable names are listed in `.env.example`.

| Setting                    | Required            | Description                                                                                                                                             |
| -------------------------- | ------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| AI API key                 | For AI features     | Powers the culinary assistant, voice features, analytics and the delivery quality scan. Without it, these features show built-in sample responses.     |
| `VITE_GOOGLE_MAPS_API_KEY` | Optional            | Enables the live Google Map. The key needs the Maps JavaScript API and Routes API enabled. Without it, tracking uses a built-in animated route view. |
| `APP_URL`                  | Yes                 | The URL where the app runs. Use `http://localhost:3000` locally.                                                                                        |
| `PORT`                     | Optional            | Server port. Defaults to `3000`.                                                                                                                        |

> `.env.local` is git-ignored. Never commit API keys.

### 3. Run the app

```bash
npm run dev
```

Open **http://localhost:3000**.

To confirm the server is up and see which integrations are configured, visit `http://localhost:3000/api/health`.

---

## Available Scripts

| Command         | Description                                                                  |
| --------------- | ---------------------------------------------------------------------------- |
| `npm run dev`   | Starts the development server (API and frontend) on port 3000.              |
| `npm run build` | Builds the frontend for production into `dist/`.                           |
| `npm start`     | Serves the production build and the API. Run `npm run build` first.          |
| `npm test`      | Runs the unit tests for the delivery logic.                                 |
| `npm run lint`  | Type-checks the project with TypeScript.                                    |

> **Windows:** `npm start` uses Unix-style environment syntax. In PowerShell, run the production server with:
>
> ```powershell
> $env:NODE_ENV="production"; node --import tsx server.ts
> ```

---

## Optional Setup

### Database (order history)

Signed-in users' order history is stored in PostgreSQL. Without a database the app still runs normally, but order history is not saved.

To enable it, add these to `.env.local`:

| Variable                                   | Purpose                                     |
| ------------------------------------------ | ------------------------------------------- |
| `SQL_HOST`, `SQL_DB_NAME`                  | Database host and name                      |
| `SQL_USER`, `SQL_PASSWORD`                 | Credentials the app uses at runtime         |
| `SQL_ADMIN_USER`, `SQL_ADMIN_PASSWORD`     | Credentials used to apply the schema        |

Then create the tables:

```bash
npx drizzle-kit push --config src/db/drizzle.config.ts
```

### Authentication

Google sign-in uses the Firebase project defined in `firebase-applet-config.json`. To use your own Firebase project:

1. Replace the values in that file with your project's web app config.
2. Enable the **Google** sign-in provider in Firebase Authentication.
3. Add your domain (for example `localhost`) to the authorized domains.

---

## API Overview

| Endpoint                     | Method     | Description                                                        |
| ---------------------------- | ---------- | ------------------------------------------------------------------ |
| `/api/health`                | GET        | Service status and configured integrations                         |
| `/api/ai/chat`               | POST       | Culinary assistant chat                                            |
| `/api/ai/transcribe`         | POST       | Converts recorded voice to text                                    |
| `/api/ai/analytics`          | POST       | Demand, route and customer behavior analytics                      |
| `/api/ai/food-scan`          | POST       | Delivery quality report                                            |
| `/api/orders/status`         | GET / POST | Read or update order status                                        |
| `/api/orders`                | GET        | Signed-in user's order history (requires a Firebase ID token)      |
| `/api/orders/sync`           | POST       | Saves a signed-in user's orders (requires a Firebase ID token)     |
| `/ws/orders`                 | WebSocket  | Real-time order status updates                                     |
| `/live`                      | WebSocket  | Real-time voice assistant                                          |

---

## Project Structure

```
.
├── server.ts              # Express server: API routes, WebSockets, dev middleware
├── index.html             # HTML entry point
├── src/
│   ├── main.tsx           # Client entry
│   ├── App.tsx            # App shell and tab navigation
│   ├── components/        # Feature UI: menu, checkout, tracking, assistant, analytics, account
│   ├── data/              # Menu catalog and sample order data
│   ├── utils/             # Delivery domain logic and unit tests
│   ├── lib/               # Firebase client and admin setup
│   ├── middleware/        # Authentication for protected API routes
│   └── db/                # PostgreSQL schema, Drizzle client and queries
├── public/assets/         # Dish images and preview videos
└── scripts/               # Scripts used to generate the dish preview videos
```
