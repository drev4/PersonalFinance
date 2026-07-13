# Personal Finance App

[![CI](https://github.com/drev4/PersonalFinance/actions/workflows/ci.yml/badge.svg)](https://github.com/drev4/PersonalFinance/actions/workflows/ci.yml)

A full-stack personal finance manager: accounts, transactions, budgets, savings goals, investment holdings, debt payoff planning, financial simulators, and reporting — shared across a web app and a native mobile app.

pnpm monorepo with 4 packages sharing types through `@finanzas/shared`.

## Stack

| Package           | Role                           | Tech                                                      |
| ----------------- | ------------------------------ | --------------------------------------------------------- |
| `packages/api`    | Backend, port `3001`           | Fastify 4 · MongoDB (Mongoose) · Redis · BullMQ · Zod     |
| `packages/web`    | SPA, port `5173`               | React 18 · Vite · TanStack Query · Zustand · Tailwind CSS |
| `packages/mobile` | iOS/Android app                | React Native · Expo Router · TanStack Query · Zustand     |
| `packages/shared` | Types & validation, no runtime | Zod schemas, inferred TypeScript types                    |

### Why this stack

- **pnpm workspaces monorepo** — one source of truth for domain types (`@finanzas/shared`) consumed by API, web and mobile. No client/server type drift, no duplicated validation logic.
- **Fastify over Express** — schema-based validation and serialization built into the request lifecycle, lower overhead, first-class async/await support. A good fit for a JSON API with no templating needs.
- **MongoDB + Mongoose** — the domain is naturally document-shaped (a transaction, a holding, a budget each stand alone with occasional embedded sub-documents) rather than heavily relational, and the schema evolves often during early product iteration. Mongoose adds schema validation and middleware on top of the flexibility.
- **Redis + BullMQ** — rate limiting, refresh-token rotation and cached net-worth reads need a fast key-value store; the same Redis instance backs BullMQ for scheduled jobs (price updates, recurring transactions, notification alerts) without adding another moving part.
- **Zod end-to-end** — one schema definition in `@finanzas/shared` drives runtime validation on the API, static types on every package, and form validation on the web client (`@hookform/resolvers`). Invalid data is rejected at the boundary instead of trusted implicitly.
- **JWT + httpOnly refresh cookie (web) / body (mobile)** — stateless access tokens keep API requests cheap to verify; the refresh token is stored where each client can protect it best (httpOnly cookie in the browser, secure storage on mobile).
- **React + Vite for web** — fast HMR and a minimal build config compared to a metaframework the SPA doesn't need (no SSR requirement here).
- **TanStack Query over a hand-rolled data layer** — server state (caching, retries, invalidation) is a solved problem; keeping it out of Zustand keeps the store limited to genuine client state (auth session, UI preferences).
- **Zustand over Redux** — the client state surface is small (auth, theme, a few UI toggles); Zustand gives that without boilerplate.
- **Tailwind CSS** — utility classes plus a token-based theme (`tailwind.config.ts`) keep light/dark theming consistent without a separate CSS-in-JS runtime.
- **Expo + Expo Router for mobile** — managed native builds and file-based routing let the mobile app reuse the same API clients and query hooks pattern as the web app, without maintaining native Xcode/Android Studio project files by hand.
- **TypeScript strict mode everywhere** (`strict`, `noUncheckedIndexedAccess`, `noImplicitAny`) — the domain involves money and dates; the type checker catches an entire class of `undefined`/off-by-one bugs before they reach a test.

## Architecture

```
UI / screens
    ↓
hooks (TanStack Query) / stores (Zustand)
    ↓
API clients (Axios)
    ↓
@finanzas/shared (Zod schemas, types)
```

Dependencies point inward only. `web` and `mobile` never import from each other; `api` never imports from `web` or `mobile`.

Inside the API, each domain module follows `routes → service → repository → model`: routes validate input and translate domain errors to HTTP, services hold business logic, repositories are Mongoose queries with no branching, models define schema and indexes.

## Features

- Accounts (checking, savings, credit card, mortgage, loan, crypto, investment) with net-worth tracking
- Transactions with recurring templates, transfers, CSV bulk import, and rule-based auto-categorization
- Budgets with progress and threshold alerts
- Savings goals with deposit tracking
- Investment holdings (stocks, ETFs, crypto, bonds) with live pricing via Finnhub / CoinMarketCap
- Debt payoff planning (avalanche vs. snowball strategies)
- Financial simulators: mortgage, loan, investment growth, early repayment, retirement
- Monthly/yearly reports (PDF/CSV export) and a financial health score
- Push/email notifications, 2FA (TOTP), multi-currency with live FX rates

## Getting started

Requirements: Node.js ≥ 20, pnpm ≥ 9, MongoDB, Redis.

```bash
pnpm install
cp packages/api/.env.example packages/api/.env
# fill in MONGO_URI, REDIS_URL, JWT_SECRET, JWT_REFRESH_SECRET, ENCRYPTION_KEY

pnpm dev          # runs api (3001) + web (5173) in parallel
```

See `packages/api/.env.example` for the full list of environment variables (external API keys for Binance, CoinMarketCap, Finnhub, Plaid are optional).

## Scripts

```bash
pnpm dev          # api + web in parallel
pnpm build        # build all packages
pnpm lint         # eslint
pnpm typecheck    # TypeScript across all packages
pnpm test         # vitest across all packages
pnpm ios          # Expo iOS
pnpm android      # Expo Android
```

Pre-commit hooks (Husky + lint-staged) run ESLint, Prettier and a TypeScript check on staged files.

## Testing

- API: unit tests for services with mocked repositories, integration tests against `mongodb-memory-server` and `ioredis-mock` (no mocked database in integration tests — a mock would hide broken migrations).
- Web: component/hook tests with Testing Library, API mocked via MSW.

## Security

`packages/api/SECURITY.md` documents the API's threat model, OWASP Top 10 control mapping, secret rotation procedure and incident response runbook.
