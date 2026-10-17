# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Primary audience right now: **recruiters and interviewers evaluating the build** as a portfolio
project. They skim the live demo, the README and the demo video, and they judge both the engineering
and whether the product would hold up in real use.

Secondary audience: real people in India who share money.
- **Trip groups.** Short, busy stretches with many expenses over a few days, settled at the end (the Goa Trip demo).
- **Flatmates.** Shared bills that come back every month: rent, groceries, utilities (the Flat 302 demo).
- **Individuals tracking their own budget.** Monthly spending checked against category limits.

All of them often log a bill **on a phone, at that moment**: at the restaurant table, at the checkout, in a cab.

## Product Purpose

A group expense splitter with personal budgets, where entering an expense is quick because Claude
reads a typed sentence or a receipt photo. It exists because shared money gets messy and
people stop logging bills halfway through a trip. Success: logging an expense takes seconds, and
settling up takes the fewest payments the app can find.

## Positioning

- **Fewest payments to settle.** Debt simplification nets everyone's balances and settles in at most N−1 payments
  (the Goa demo: 4 payments instead of 10). This is not guaranteed to be the true minimum, which is NP-hard. Say exactly that.
- **AI drafts, the human confirms.** A sentence (including Hinglish) or a receipt fills in the normal expense
  form. The AI never writes to the database.
- **Privacy built into the AI.** Group members are sent to the model as opaque keys (`m1`, `m2`…). Insights send only
  aggregate totals, never names or descriptions.

## Operating Context

- Evaluators: they open the live demo on the free hosting tier, where the first load can take up to a minute while the
  API wakes up. They also read the README screenshots, the pitch deck and the demo video.
- Users: groups, expenses with equal, exact or percentage splits, balances, settle up, an activity feed per group,
  a monthly budget dashboard, AI quick-add, receipt scan, and AI insights.
- Currency is INR. Money is integer paise end to end and displayed with Indian number formatting.

## Capabilities and Constraints

- Web app (React 19 + Vite + Tailwind v4), deployed on Vercel with the API on Render and the database on MongoDB Atlas.
- Must work on a 390px phone with no horizontal scroll.
- When no Anthropic API key is set, the AI features are switched off: the UI hides them or explains why, and
  nothing breaks. **Status: there is no API key yet**, so the AI has only been shown with scripted responses.
- Months are `YYYY-MM` in UTC. Split shares always add up exactly to the expense amount.
- Charts: a single series hue for magnitude, no dual axes. A status colour always comes with an icon and a text label.

## Brand Commitments

- Name: **SplitWise AI**.
- Voice: **crisp and neutral**. Precise and practical, like a finance tool, with little personality. Clear money
  language. No jokes or slang in the UI copy.

## Evidence on Hand

- Live demo: https://splitwise-ai-mu.vercel.app
- Screenshots: `docs/screenshots/` (balances, dashboard, ai-review, activity, budgets, mobile-balances).
- Pitch deck (claude.ai Slides): https://claude.ai/artifact/6uLg2ZjMbH4AMQe7u99hVr
- Demo data: 5-person "Goa Trip" (12 expenses → 4 payments instead of 10) and "Flat 302".
- Test suite: 66 server tests.
- **Absent, do not fabricate:** real users, testimonials, usage numbers, live AI accuracy or cost figures
  (the AI is not yet tested against the real API), pricing.

## Product Principles

1. **Prove it in 30 seconds.** An evaluator should see the key result (fewest payments, AI fills the form) without having to explore.
2. **Money must be exact and believable.** Correct amounts, consistent formatting, and no rounding surprises.
3. **The human confirms, the machine drafts.** AI output is always shown as a draft the user can edit.
4. **Phone-first speed.** Logging an expense one-handed at the table should be the shortest path in the app.
5. **Honest claims only.** Say what the algorithm and the AI actually guarantee, nothing more.

## Accessibility & Inclusion

- A status is never shown by colour alone; it always has an icon and text.
- The layout must work at 390px with no horizontal scroll.
