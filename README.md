# SplitWise AI

Smart group expense and budget manager with AI-powered expense entry. Built for **TCS Zeta Innovate**.

- Split expenses with friends, roommates and trips (equal, exact or percentage splits)
- **Debt simplification**: settle a group's debts with the minimum number of payments
- Personal monthly budgets and a spending dashboard
- **AI Quick-Add**: describe an expense in plain English or scan a receipt

**Stack:** MongoDB · Express · React (Vite + Tailwind) · Node.js · Claude API

## Status

| Feature | State |
|---|---|
| Auth (JWT httpOnly cookies, refresh + revoke) | ✅ |
| Groups (create, list, join by invite code) | ✅ |
| Expenses (equal, exact, percentage splits) | ✅ |
| Balances, debt simplification, settle up | ✅ |
| Budgets, alerts and spending dashboard | ✅ |
| AI quick-add, receipt scan, insights (Claude Haiku 5.5) | ✅ |

## Getting started

Requires Node.js 20+.

```bash
# API
cd server
cp .env.example .env        # set MONGO_URI to a local or Atlas database
npm install
npm run dev                 # http://localhost:5000
# or, with no MongoDB installed:
npm run dev:memory          # throwaway in-memory database

# Web app (in a second terminal)
cd client
npm install
npm run dev                 # http://localhost:5173
```

## AI features

The AI features use **Claude Haiku 5.5** through the Anthropic API:

- **Quick add:** type "Paid 1200 for dinner with Rahul and Priya yesterday" and the expense form fills itself in.
- **Receipt scan:** snap a bill; the total, merchant, date, category and line items are read for you.
- **Insights:** a short, plain-English read on your month's spending and budgets.

AI never saves anything by itself: it fills in the normal form and you confirm. Insights send only your
aggregate totals (no names or descriptions), and receipt photos are not stored.

To turn them on, add `ANTHROPIC_API_KEY` to `server/.env` (create a key at console.anthropic.com; API usage
is billed separately from a Claude Pro subscription and costs a fraction of a cent per request with Haiku).
Without a key the app shows that AI is off and everything else works normally.

## Tests

```bash
cd server
npm test                    # API tests against an in-memory MongoDB
```

## Project structure

```
server/   Express + Mongoose REST API (src/{models,routes,controllers,middleware,services})
client/   React + Vite + Tailwind single-page app (src/{pages,components,api,store})
```
