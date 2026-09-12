# Location Consent Hub

**Location Consent Hub** is an informed-consent, privacy-first location sharing system designed for care teams, families, and safety escorts. It enables administrators and caregivers to generate secure, transparent location-sharing links for participants on **Android and iPhone mobile browsers**, without covert tracking, hidden permissions, or deceptive patterns.

---

## Key Privacy & Safety Features

1. **Explicit Recipient Identity**: The participant clearly sees the identity of the caregiver or organization that will receive their location.
2. **Declared Purpose**: Every session specifies a concrete reason for collection (e.g., *"Safe transit check-in"*).
3. **Strict Data Retention**: Coordinates are automatically pruned after the retention period (default 24 hours, configurable up to 30 days).
4. **Visible Active Sharing State**: When GPS coordinates are transmitting, an unambiguous green badge, pulsing indicator, and screen-reader status (`aria-live="polite"`) announce active sharing.
5. **Instant Revocation Control**: An accessible, prominent *"Stop Sharing / Revoke Consent"* button allows participants to immediately terminate sharing and revoke access.
6. **256-Bit Cryptographic Tokens**: Links utilize high-entropy, URL-safe random tokens. Database IDs and secrets are never exposed publicly.
7. **No Covert Tracking**: Built without hidden tracking, fake terms, or background permission bypasses.

---

## Technical Limitation: Web Browser vs. Native Tracking

> [!IMPORTANT]
> **Mobile Browser Sandboxing (iOS Safari & Android Chrome)**:
> In standard web browsers, geolocation stops or is paused by the operating system when the browser tab is closed, screen is locked, or app is backgrounded to preserve device battery and user privacy.
>
> If 24/7 background tracking is required when the screen is locked:
> - **iOS**: Requires a native iOS application built with `CoreLocation` requesting *"Always Allow"* location authorization with the `UIBackgroundModes` location capability.
> - **Android**: Requires a native Android application using a `ForegroundService` with a persistent notification bar item and `ACCESS_BACKGROUND_LOCATION` permission.

---

## Routes

| Route | Description |
|---|---|
| `/` | Product overview, transparency safeguards, and technical disclosures |
| `/share/:token` | Participant consent flow and active location sharing page |
| `/share/demo-aria` | Pre-seeded sample participant flow for immediate evaluation |
| `/admin` | Care team dashboard with real-time short-polling session management, map view, and audit trail |
| `/login` | Administrator authentication with 1-click Demo Admin sign-in |

---

## Local Setup & Quick Start

### Prerequisites
- Node.js `>= 18.0.0` (tested on Node v24)
- `pnpm` package manager

### 1. Install Dependencies
```bash
pnpm install
```

### 2. Run Locally in Development
```bash
pnpm dev
```
The application will be available at [http://localhost:3000](http://localhost:3000).

### 3. Run Automated Tests
```bash
pnpm test -- --run
```

### 4. Type Check
```bash
pnpm tsc --noEmit
```

### 5. Production Build
```bash
pnpm build
```

---

## Environment Variables

| Variable | Description | Default |
|---|---|---|
| `PORT` | Server port | `3000` |
| `DATABASE_URL` | Database connection URL | `file:local.db` |
| `JWT_SECRET` | Secret key used for signing admin JWT sessions | `location-consent-hub-dev-secret-key-2026` |
| `NODE_ENV` | Runtime environment (`development` or `production`) | `development` |

---

## Database & Migrations

The database is managed with **Drizzle ORM** with LibSQL / SQLite:

```bash
# Generate SQL migrations based on drizzle/schema.ts
pnpm db:generate

# Push schema directly to database
pnpm db:push
```

---

## Admin Credentials

- **Username**: `admin`
- **Password**: `admin123`
- Alternatively, click **"1-Click Demo Admin Sign In"** on the `/login` page.

---

## Accessibility Compliance (WCAG 2.1 AA)

- Semantic HTML landmarks (`<main>`, `<header>`, `<nav>`, `<section>`)
- Visible focus rings (`focus:ring-2 focus:ring-emerald-600`)
- Accessible ARIA labels on icon buttons
- `aria-live="polite"` announcements for real-time location status
- Touch targets compliant with standard 44?44px / 48?48px mobile touch targets
- Fully responsive and tested at 390px mobile viewport width (standard iPhone screen)
