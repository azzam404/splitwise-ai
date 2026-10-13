# SplitWise AI

Smart group expense and budget manager with AI-powered expense entry..

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
| Expenses and split types | 🚧 next |
| Balances, debt simplification, settle up | ⏳ |
| Budgets and dashboard | ⏳ |
| AI quick-add, receipt scan, insights | ⏳ |

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
