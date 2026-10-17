---
name: SplitWise AI
description: Group expense splitter and personal budgets; a precise pocket tool for shared money.
colors:
  ledger-blue: "#1f57d1"
  ledger-blue-deep: "#1a46a8"
  ledger-blue-bright: "#2f6fed"
  ledger-blue-mist: "#d9eaff"
  ledger-blue-wash: "#eef6ff"
  series-1: "#2a78d6"
  status-good: "#0ca30c"
  status-warning: "#fab219"
  status-critical: "#d03b3b"
  owed-green: "#047857"
  owed-green-bar: "#10b981"
  owes-orange: "#c2410c"
  owes-orange-bar: "#fb923c"
  error-red: "#dc2626"
  page-slate: "#f8fafc"
  surface-white: "#ffffff"
  track-slate: "#f1f5f9"
  hairline-slate: "#e2e8f0"
  field-border-slate: "#cbd5e1"
  muted-slate: "#64748b"
  secondary-slate: "#475569"
  label-slate: "#334155"
  ink-slate: "#1e293b"
typography:
  headline:
    fontFamily: "ui-sans-serif, system-ui, sans-serif"
    fontSize: "1.5rem"
    fontWeight: 700
    lineHeight: 1.333
  title:
    fontFamily: "ui-sans-serif, system-ui, sans-serif"
    fontSize: "1.125rem"
    fontWeight: 600
    lineHeight: 1.556
  section:
    fontFamily: "ui-sans-serif, system-ui, sans-serif"
    fontSize: "1rem"
    fontWeight: 600
    lineHeight: 1.5
  body:
    fontFamily: "ui-sans-serif, system-ui, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 400
    lineHeight: 1.429
  label:
    fontFamily: "ui-sans-serif, system-ui, sans-serif"
    fontSize: "0.75rem"
    fontWeight: 500
    lineHeight: 1.333
  amount:
    fontFamily: "ui-sans-serif, system-ui, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 600
    lineHeight: 1.429
    fontFeature: "tnum"
rounded:
  sm: "6px"
  md: "8px"
  lg: "12px"
  xl: "16px"
  full: "9999px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "12px"
  lg: "16px"
  card: "20px"
  section: "24px"
  page: "32px"
components:
  button-primary:
    backgroundColor: "{colors.ledger-blue}"
    textColor: "{colors.surface-white}"
    typography: "{typography.body}"
    rounded: "{rounded.md}"
    padding: "8px 16px"
  button-primary-hover:
    backgroundColor: "{colors.ledger-blue-deep}"
    textColor: "{colors.surface-white}"
  button-secondary:
    backgroundColor: "{colors.surface-white}"
    textColor: "{colors.label-slate}"
    typography: "{typography.body}"
    rounded: "{rounded.md}"
    padding: "8px 16px"
  button-secondary-hover:
    backgroundColor: "{colors.page-slate}"
  button-ghost:
    textColor: "{colors.secondary-slate}"
    typography: "{typography.body}"
    rounded: "{rounded.md}"
    padding: "8px 16px"
  button-ghost-hover:
    backgroundColor: "{colors.track-slate}"
  input:
    backgroundColor: "{colors.surface-white}"
    textColor: "{colors.ink-slate}"
    typography: "{typography.body}"
    rounded: "{rounded.md}"
    padding: "8px 12px"
  card:
    backgroundColor: "{colors.surface-white}"
    rounded: "{rounded.lg}"
    padding: "{spacing.card}"
  nav-link:
    textColor: "{colors.secondary-slate}"
    typography: "{typography.body}"
    rounded: "{rounded.sm}"
    padding: "6px 12px"
  nav-link-active:
    backgroundColor: "{colors.ledger-blue-wash}"
    textColor: "{colors.ledger-blue-deep}"
  pill-savings:
    backgroundColor: "{colors.ledger-blue-wash}"
    textColor: "{colors.ledger-blue-deep}"
    typography: "{typography.label}"
    rounded: "{rounded.full}"
    padding: "2px 8px"
  modal:
    backgroundColor: "{colors.surface-white}"
    rounded: "{rounded.xl}"
    padding: "{spacing.card}"
---

# Design System: SplitWise AI

## Overview

**Creative North Star: "The Pocket Accountant"**

SplitWise AI is the precise little tool you take out at the table, settle the bill with and put away. Every
screen answers one money question: who paid, who owes, and how much is left. The interface stays calm and
exact so the numbers can carry each screen. One blue does the work of the brand. Slate neutrals hold the
structure. Other colours appear only when they carry meaning: a budget's status, or which way money is
flowing between people.

Density is compact but not cramped. Body copy is 14px, cards are white on a pale slate page, and there is one
clear primary action per view. The system is **quick and confident**: the next thing to do always has the
strongest contrast on the screen, feedback comes straight away, and nothing decorative gets in the way of a
number. It is built for a 390px phone first and opens out into two to four columns on larger screens.

This look rejects three things. Fintech flash: no gradients, glass, neon or glow. Emoji used as UI. And any
second brand hue.

**Key Characteristics:**
- A single Ledger Blue accent; any other colour is semantic: status or money direction.
- System sans type, with numbers in semibold and tabular figures.
- Flat white cards with a hairline border and a barely visible lift.
- Gently rounded corners: 8px for controls, 12px for cards, 16px for sheets.
- Mobile first. Modals become bottom sheets on phones.

## Colors

A cool, restrained palette: one confident blue on slate, with green, amber, red and orange used only for meaning.

### Primary
- **Ledger Blue** (`ledger-blue`): the one action colour. Primary buttons, the logo wordmark, links and
  "Settle" actions. **Ledger Blue Deep** is its hover/pressed state and the text colour on the blue tints.
  **Ledger Blue Bright** is the focus border on inputs. **Ledger Blue Mist** is the focus ring, the spinner
  track and the border of the AI panel. **Ledger Blue Wash** fills the active nav link, the "4 instead of 10
  payments" pill and the AI quick-add panel.

### Secondary
- **Series Blue** (`series-1`): the only colour for magnitude in charts (category bars, the monthly trend).
  It is a data colour, not an action colour. Never use it for a button.

### Tertiary (semantic only)
- **Status Good / Warning / Critical** (`status-good`, `status-warning`, `status-critical`): budget health
  only. Used for budget progress bars only. The status label and its icon use the darker
  emerald-700, amber-700 and red-700.
- **Owed Green** (`owed-green`, bar `owed-green-bar`): money coming back to someone ("gets back",
  "You are owed", recorded payments).
- **Owes Orange** (`owes-orange`, bar `owes-orange-bar`): money someone has to pay ("owes", "You owe").
- **Error Red** (`error-red`): validation messages, alert banners (on a red-50 fill with a red-200 border) and
  destructive text buttons.

### Neutral
- **Page Slate** (`page-slate`): the app background behind every card.
- **Surface White** (`surface-white`): cards, the header, inputs, modals and secondary buttons.
- **Track Slate** (`track-slate`): empty progress tracks, ghost-button hover and the chart hover cursor.
- **Hairline Slate** (`hairline-slate`): card and header borders, dividers.
- **Field Border Slate** (`field-border-slate`): input and secondary-button borders, chart axis lines.
- **Muted Slate** (`muted-slate`): helper text, timestamps, empty states, chart ticks.
- **Secondary Slate** (`secondary-slate`): inactive nav, ghost buttons, secondary metadata.
- **Label Slate** (`label-slate`): form labels, secondary-button text.
- **Ink Slate** (`ink-slate`): body text and amounts.

### Named Rules
**The One Blue Rule.** Ledger Blue is the only brand hue. If a new element wants a colour and isn't an
action, a status or a direction of money, it stays slate.

**The Two Semantics Rule.** Budget status (green / amber / red) and money direction (green / orange) are separate
vocabularies. Owing money is not an error, so balances never use the critical red.

**The Text Shade Rule.** Semantic colour on text is always the 700 shade (owed-green, owes-orange,
emerald/amber/red-700). The brighter bar shades fail 4.5:1 as text and live only in bars and dots. Muted text never
goes lighter than Muted Slate; placeholders use it too.

**The Never Colour Alone Rule.** A status colour always comes with an icon (circle-check, triangle-alert, circle-x) and a text label ("On track",
"Close to limit", "Over budget"). Money direction always comes with words ("gets back", "owes").

## Typography

**Display Font:** none. The system has no display face.
**Body Font:** System UI sans (`ui-sans-serif, system-ui, sans-serif`), Tailwind's default stack.

**Character:** The device's own sans: familiar, quick to load and instantly legible. Hierarchy comes from
weight and size steps, not from a decorative typeface.

### Hierarchy
- **Headline** (700, 24px, 32px line): one page title per screen ("Your groups", the group name, "Budgets").
- **Title** (600, 18px, 28px line): modal titles and the balance summary line ("You are owed ₹4,250").
- **Section** (600, 16px, 24px line): card headings ("Balances", "Suggested payments", "Recent expenses").
- **Body** (400, 14px, 20px line): almost all UI text, including inputs, buttons, list rows and nav.
- **Label** (500, 12px, 16px line): helper text, badges, status labels, timestamps, field errors.
- **Amount** (600, 14px, tabular figures): rupee amounts in lists and charts. Columns of numbers line up.

### Named Rules
**The Numbers Lead Rule.** In a row, the amount is the heaviest text. Names are 500, amounts 600, and
surrounding words regular.

**The Tabular Money Rule.** Any amount that sits in a column or might be compared uses `tabular-nums`. Amounts
are always formatted by `formatINR`, never by hand.

## Layout

One centred column, at most 1024px wide (`max-w-5xl`), with 16px side gutters and 32px vertical page padding.
Inside a page, sections stack 24px apart (`space-y-6`) and card groups sit on 16px gaps.

Grids start as **`grid-cols-1`** and step up at `md` (768px) to two columns, and at `lg` (1024px) to three or
four. The single column on phones is required: implicit grid columns grow to the width of their content and
break the 390px no-scroll rule.

The header wraps on phones. The logo and "Log out" share the first row, and the nav drops to a full-width
second row. Rows inside cards use `flex flex-wrap` with `min-w-0` text and `shrink-0` actions, so long names
truncate and buttons never get squeezed.

Spacing steps are 4, 8, 12, 16, 20 (the inside of a card), 24 and 32px. Most rows use 8 or 12px gaps.

## Elevation & Depth

The surfaces are flat with a slight lift. Depth comes mainly from tone, white cards on a pale slate page plus
a hairline border. Each card adds a barely visible shadow so it reads as a sheet of paper. Real elevation is
reserved for things that float above the page.

### Shadow Vocabulary
- **Card rest** (`box-shadow: 0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)`, Tailwind
  `shadow-sm`): every card, always together with the hairline border.
- **Tooltip** (`box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)`, Tailwind
  `shadow-md`): chart tooltips.
- **Sheet** (`box-shadow: 0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)`, Tailwind
  `shadow-xl`): modals and bottom sheets, over a `slate-900/40` scrim.

### Named Rules
**The Float-Only-When-Floating Rule.** Only overlays get more than the card-rest shadow. Hover never lifts a
card. Hover changes the fill colour instead.

## Shapes

Gently rounded, never pill-shaped except where a shape means "measure" or "tag". Controls, list rows and
alerts use 8px. Cards use 12px. Modals use 16px, and on phones only the top corners are rounded so the sheet
sits on the bottom edge. Nav links and small icon buttons use 6px. Fully rounded shapes are kept for progress
tracks and their fills, the savings pill and member avatars. Chart bars round only their outer end: 4px on
the top of vertical bars, and the right end of horizontal ones.

## Components

### Buttons
Quick and confident: one filled button per view, everything else quieter.
- **Shape:** gently rounded (8px), 14px medium label, 8px × 16px padding, `gap-2` for an icon.
- **Primary:** Ledger Blue fill, white text. Hover is Ledger Blue Deep. When disabled, a Hairline Slate fill
  with Muted Slate text and a not-allowed cursor, so it never reads as a second live primary.
- **Secondary:** white with a Field Border Slate border and Label Slate text. Hover fills Page Slate. Used for
  "Settle up" and "Scan receipt".
- **Ghost:** no fill, Secondary Slate text. Hover fills Track Slate. Used for "Log out" and inline row actions;
  "Settle" is a ghost button tinted with Ledger Blue Deep.
- **Transitions:** colours only, 150ms. No movement, no change of scale.

### Inputs / Fields
- **Style:** white, Field Border Slate border, 8px corners, 8px × 12px padding, 14px text. The label sits
  above in 14px medium Label Slate.
- **Focus:** the border turns Ledger Blue Bright, with a 2px Ledger Blue Mist ring. The browser outline is
  removed in favour of this ring.
- **Error:** a 12px Error Red message under the field.
- **To check (AI-filled):** Ledger Blue Wash fill with a half-strength Ledger Blue Bright border, on any field an
  AI draft filled in. It clears as soon as the user edits that field. Never used for anything but "please check this".

### Cards / Containers
- **Corner Style:** 12px.
- **Background:** Surface White on Page Slate.
- **Shadow Strategy:** card rest (see Elevation).
- **Border:** 1px Hairline Slate.
- **Internal Padding:** 20px. Inner rows, such as suggested payments, are Page Slate tiles with 8px corners
  and 8px × 12px padding.

### Navigation
A white header with a hairline bottom border. The "SplitWise" wordmark is 18px bold Ledger Blue Deep, with
"AI" in Ink Slate. Nav links are 14px medium Secondary Slate with 6px corners. Hover darkens to slate-900.
The active link is Ledger Blue Deep text on Ledger Blue Wash. On phones the nav wraps to its own full-width
row.

### Icons
- **Library:** lucide-react only, line icons. Never emoji or Unicode glyphs.
- **Stroke:** 1.75 for content icons (categories, activity, close), 2 for small status icons next to 12px labels.
- **Size:** 16px inline with text, 20px inside 40px category tiles and the modal close button.
- **Colour:** Secondary Slate in neutral tiles (slate-100 fill); a status icon takes its label's 700 shade.
- **Accessibility:** always `aria-hidden`; the adjacent text or the control's `aria-label` carries the meaning.
- **Category set:** Utensils, ShoppingCart, Plane, CarTaxiFront, House, Lightbulb, Clapperboard, ShoppingBag, Pill,
  Receipt (`client/src/utils/categories.js`). Category select options are text only.

### Modal / Bottom Sheet
A white sheet, at most 512px wide and 92vh tall, that scrolls internally. On phones it is pinned to the
bottom with 16px top corners. From 640px up it is centred with 16px corners all round. The title is 18px
semibold, with a Muted Slate ✕ close button. Escape and a click on the backdrop both close it, and the page
behind stops scrolling.

### Undo Toast
The only confirmation pattern for deletes; the browser's `confirm()` is never used. An Ink-dark (slate-900) bar,
12px corners, sheet shadow, pinned 16px above the bottom edge and at most 448px wide, so it sits in thumb reach.
White 14px message ("Deleted “Fuel”") and a Ledger Blue Mist "Undo" text button. The item disappears at once; the
server delete waits 5 seconds, and starting another delete or leaving the page sends it immediately.

### Settle-up Preview
Inside the Settle up sheet, a Page Slate panel headed "After this payment" lists the payer and receiver with their
resulting balance ("settled", "gets back ₹X", "owes ₹X") in the money-direction colours. Unprefilled, the sheet
starts from the current user's largest suggested payment, never from a direction that would be wrong for them.

### Balance Bar (signature)
Each member gets a row: their name on the left, and "gets back ₹X" in Owed Green or "owes ₹X" in Owes Orange
on the right. Below sits an 8px fully rounded Track Slate bar whose fill length is proportional to the
largest balance in the group. A settled member's label is "settled" in slate-400, with an empty bar.

### Savings Pill (signature)
A Ledger Blue Wash pill with 12px medium Ledger Blue Deep text, "4 instead of 10 payments", on the "Suggested
payments" card. It is the product's main claim, shown as a quiet fact. It never glows, pulses or gets an icon.

### Budget Progress (signature)
An 8px status-coloured bar on a Track Slate track, with `role="progressbar"`. Underneath, a 12px line reads
"₹spent of ₹limit · %", followed by the status badge (a 16px status icon in the label colour, plus the label) and "₹X left" or
"₹X over".

### AI Quick-Add Panel (the expense composer)
The only way to add an expense on a group page, shown on the Expenses tab only. A Ledger Blue Wash panel (60%
opacity) with a Ledger Blue Mist border and 12px corners. It holds the sentence input, the page's one primary
button ("Quick add") and a secondary "Scan receipt". Under them, a 12px Secondary Slate line says that nothing is
saved until the user confirms, ending in an underlined "add it manually" link that opens the plain form. When AI
is disabled, a dashed-border row explains why and carries a primary "Add expense" button instead.

## Do's and Don'ts

### Do:
- **Do** use Ledger Blue for actions and the active state only. Charts use Series Blue.
- **Do** pair every status colour with its icon and label, and every balance colour with "owes" or
  "gets back".
- **Do** show amounts with `formatINR` in semibold with `tabular-nums` wherever they sit in a column.
- **Do** start every grid at `grid-cols-1`, and check it at 390px with no horizontal scroll.
- **Do** keep one filled primary button per view. Everything else is secondary or ghost.
- **Do** use a white card with a hairline border, 12px corners, 20px padding and `shadow-sm` for any new
  content block.

### Don't:
- **Don't** use emoji or Unicode glyphs (✓ ✕ → ←) as UI. Use words, or a lucide icon if one is really needed.
- **Don't** add a second brand hue (purple for AI, teal for groups and so on). AI surfaces use Ledger Blue Wash.
- **Don't** use gradients, glassmorphism, neon or glow effects. Every fill is a solid colour.
- **Don't** colour a debt in critical red. Owing money is Owes Orange, not an error.
- **Don't** use `window.confirm()` for deletes. Delete at once and offer Undo.
- **Don't** lift cards on hover or give them shadows heavier than `shadow-sm`. Only overlays float.
- **Don't** use dual axes or several series hues in a chart. Magnitude is shown in Series Blue only.
