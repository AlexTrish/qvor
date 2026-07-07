<p align="center"><img src="https://i.ibb.co/GYGz2BK/Banner.png" alt="QVOR Banner" width="726"></p>

<p align="center">
  <a href="https://nextjs.org/"><img alt="Next.js" src="https://img.shields.io/badge/framework-Next.js%2016-black?style=flat&logo=next.js"></a>
  <a href="https://www.typescriptlang.org/"><img alt="TypeScript" src="https://img.shields.io/badge/language-TypeScript%205-blue?style=flat&logo=typescript"></a>
  <a href="https://www.postgresql.org/"><img alt="PostgreSQL" src="https://img.shields.io/badge/database-PostgreSQL%2014+-336791?style=flat&logo=postgresql&logoColor=white"></a>
  <a href="https://github.com/AlexTrish/pams-app/releases"><img alt="Version" src="https://img.shields.io/badge/version-v0.5.1-yellowgreen?style=flat"></a>
  <a href="LICENSE"><img alt="License" src="https://img.shields.io/badge/license-MIT-green?style=flat"></a>
</p>

---

**QVOR** is a secure end-to-end encrypted messenger. The server never sees the content of your messages — that's not a promise, it's mathematics.

**QVOR** — защищённый мессенджер с end-to-end шифрованием. Сервер никогда не видит содержимое ваших сообщений — это не обещание, это математика.

---

## Stack / Стек

### Frontend

| Technology | Why it was chosen |
|---|---|
| **Next.js 16 (App Router)** | Server Components by default — minimal JS on the client. File-based routing, built-in API Routes, Edge Middleware. The most mature React framework for production. |
| **React 19** | Latest stable with concurrent features, `useOptimistic` for instant UI feedback on message send. |
| **TypeScript 5 (strict)** | Zero `any`. Catches bugs at compile time, not in production. Strict mode forces explicit types everywhere. |
| **Tailwind CSS 4** | Utility-first, no CSS files to maintain. v4 uses native CSS variables — works perfectly with dynamic theming. |
| **shadcn/ui** | Unstyled accessible components (Radix UI under the hood). We own the code, not a dependency. |
| **Syne + Geist fonts** | Syne for headings — geometric, bold, distinctive. Geist for UI — clean, technical, readable at small sizes. |
| **lucide-react** | Consistent icon set, tree-shakeable, `strokeWidth={1.5}` gives a modern thin look. |

### Backend

| Technology | Why it was chosen |
|---|---|
| **Next.js API Routes** | Co-located with the frontend, no separate server process. Edge Runtime support for middleware. Zero-config deployment. |
| **PostgreSQL 14+** | Battle-tested relational DB. ACID transactions for message delivery guarantees. `DISTINCT ON` for efficient conversation queries. |
| **Prisma ORM** | Type-safe DB client generated from schema. Migrations as SQL files for full control. `$queryRaw` for backward-compatible schema changes. |
| **SSE (Server-Sent Events)** | One-directional push from server to client. Simpler than WebSocket, works through proxies and load balancers, no handshake overhead. In-memory broker via `globalThis` singleton. |
| **JWT (jose)** | Edge Runtime compatible (no Node.js crypto). `access_token` 15 min + `refresh_token` 30 days, both httpOnly cookies. Rolling session on every refresh. |
| **argon2 + bcrypt** | argon2 for passwords (memory-hard, resistant to GPU attacks). bcrypt for phone hashes (stable, widely audited). |

### Security & Encryption

| Technology | Why it was chosen |
|---|---|
| **X25519 (ECDH)** | Fast, secure elliptic curve Diffie-Hellman. `@noble/curves` — audited, zero dependencies, runs in browser. |
| **AES-256-GCM** | Authenticated encryption — detects tampering. Web Crypto API — native browser implementation, no JS overhead. |
| **PBKDF2 (310k iterations)** | Derives encryption key from user password. 310k iterations makes brute-force impractical even with leaked DB. |
| **IndexedDB** | Stores encrypted private key blob in browser. Survives page reloads, cleared on logout. Never sent to server. |
| **VAPID + Web Push** | Push notifications without a third-party service. Server sends directly to browser push service. |

### Infrastructure

| Technology | Why it was chosen |
|---|---|
| **Telegram Bot (grammY)** | OTP delivery via Telegram — more reliable than SMS, no carrier fees. grammY is the most modern TS-first Telegram framework. |
| **PM2** | Process manager with auto-restart, cluster mode, zero-downtime reload. Runs Next.js app + Telegram bot as separate processes. |
| **Nginx** | Reverse proxy with `X-Accel-Buffering: no` for SSE. Handles SSL termination, static file caching, gzip. |
| **nodemailer (SMTP)** | Email OTP delivery as fallback. Works with any SMTP provider (Yandex Mail, Gmail, custom). |

---

## Architecture / Архитектура

```
app/
├── (auth)/           — Auth pages (login, register, recover)
├── api/
│   ├── auth/         — Auth endpoints (OTP, JWT, sessions)
│   ├── messages/     — Messages CRUD + read receipts
│   ├── channels/     — Channels & groups
│   ├── users/        — Profiles, search, friends, keys
│   ├── admin/        — Admin panel API (SUPER_ADMIN only)
│   ├── push/         — Web Push (VAPID)
│   ├── upload/       — File attachments
│   ├── voice/        — Voice messages
│   ├── calls/        — WebRTC signaling via SSE
│   └── sse/          — SSE stream endpoint
├── admin/            — Admin panel UI
├── messages/         — Main chat interface
├── profile/          — Own profile
├── [username]/       — Public profiles
└── search/           — Global search

components/           — Reusable UI components
hooks/                — Custom React hooks
lib/
├── auth/             — JWT, OTP, password hashing, cookies
├── bot/              — Telegram bot (grammY)
├── crypto/           — E2E encryption (X25519 + AES-256-GCM)
├── sse/              — SSE broker (in-memory, globalThis)
├── api/              — apiFetch with auto-refresh + dedup
├── cache/            — LRU message cache
└── email/            — SMTP mailer + HTML templates
translations/
├── default/en.json   — English (base)
└── default/ru.json   — Russian
```

### E2E Encryption Flow

```
Registration:
  phone → OTP → password + passphrase + hint
  → generate X25519 keypair
  → blob         = AES-256-GCM(PBKDF2(password,    310k), privateKey)
  → blobRecovery = AES-256-GCM(PBKDF2(passphrase,  310k), privateKey)
  → store: phone_hash, password_hash, blob, blobRecovery, publicKey

Sending message A → B:
  publicKey_B  = GET /api/users/B/key
  sharedSecret = X25519(privateKey_A, publicKey_B)
  iv           = crypto.getRandomValues(12 bytes)   ← fresh per message
  ciphertext   = AES-256-GCM(sharedSecret, iv, plaintext)
  POST /api/messages { ciphertext, iv }             ← plaintext never leaves device
```

---

## Production Setup / Продакшн

### Requirements

- Node.js 20+
- PostgreSQL 14+
- Telegram Bot Token (for OTP delivery)
- SMTP credentials (optional, for email OTP)

### Production (PM2 + Nginx)

```bash
npm run build
pm2 start ecosystem.config.js
bash scripts/deploy.sh   # zero-downtime redeploy
```

---

## Environment Variables / Переменные окружения

| Variable | Description |
|---|---|
| `DATABASE_URL` | PostgreSQL connection string |
| `JWT_SECRET` | JWT signing secret (min 32 chars) |
| `ROLE_SALT` | HMAC salt for role encoding in JWT |
| `TELEGRAM_BOT_TOKEN` | Token from @BotFather |
| `TELEGRAM_BOT_USERNAME` | Bot username (without @) |
| `TELEGRAM_PROXY_URL` | HTTP proxy for Telegram API (optional) |
| `TELEGRAM_WEBHOOK_SECRET` | Webhook verification secret (optional) |
| `VAPID_PUBLIC_KEY` | VAPID public key for Web Push |
| `VAPID_PRIVATE_KEY` | VAPID private key |
| `VAPID_SUBJECT` | mailto: or URL for VAPID |
| `SMTP_URL` | SMTP connection string (optional, for email OTP) |
| `NEXT_PUBLIC_SENTRY_DSN` | Sentry DSN (optional) |
| `NEXT_PUBLIC_TURN_URL` | TURN server URL for WebRTC (optional) |
| `NEXT_PUBLIC_TURN_USERNAME` | TURN credentials (optional) |
| `NEXT_PUBLIC_TURN_CREDENTIAL` | TURN credentials (optional) |
| `MOCK_AUTH` | `true` to enable mock users in dev |

Generate VAPID keys: `npx web-push generate-vapid-keys`

---

## License / Лицензия

MIT — see `LICENSE` file.
