# NEPSE Tracker

A capital gain tax calculator and portfolio tracker for the Nepal Stock Exchange (NEPSE).

Track your BUY and SELL transactions, see computed broker commissions, DP charges, SEBON fees, and CGT — all stored at save time so historical records are never affected by future rate changes. Holdings can be synced directly from MeroShare, edited in place to fix mistakes, and Realised P/L is tracked separately from money still tied up in shares you haven't sold yet.

---

## Setup Instructions

### Prerequisites

- [Bun](https://bun.sh/) v1.3+
- A [Neon](https://neon.tech/) (or any other) PostgreSQL database
- A [Google Cloud](https://console.cloud.google.com/) OAuth 2.0 client (for sign-in)

### 1. Clone and install

```bash
git clone <repo-url>
cd nepsegain
bun install
```

### 2. Configure environment variables

**.env.local** — OAuth keys + public NEPSE fee constants:

```env
DATABASE_URL=postgresql://...
BETTER_AUTH_SECRET=...
BETTER_AUTH_URL=http://localhost:3000

# Google OAuth (from Google Cloud Console)
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret

# App URL (used by auth client)
NEXT_PUBLIC_APP_URL=http://localhost:3000

# NEPSE fee constants — edit these when NEPSE changes the schedule
NEXT_PUBLIC_CGT_SHORT_TERM=0.075
NEXT_PUBLIC_CGT_LONG_TERM=0.05
NEXT_PUBLIC_DP_CHARGE=25
NEXT_PUBLIC_SEBON_RATE=0.00015
NEXT_PUBLIC_BROKER_RATE_UPTO_50K=0.004
NEXT_PUBLIC_BROKER_RATE_50K_500K=0.0037
NEXT_PUBLIC_BROKER_RATE_ABOVE_500K=0.0034
```

### 3. Set up Google OAuth

1. Go to [Google Cloud Console](https://console.cloud.google.com/) → APIs & Services → Credentials
2. Create an OAuth 2.0 Client ID (Web application)
3. Add `http://localhost:3000/api/auth/callback/google` as an Authorized redirect URI
4. Copy the Client ID and Secret into `.env.local`

### 4. Run database migrations

```bash
bun run prisma migrate dev
```

This creates all required tables in your PostgreSQL database.

### 5. Start the dev server

```bash
bun dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## Changing CGT Rates and Broker Commission

All fee constants live in `.env.local` as `NEXT_PUBLIC_*` variables. They are safe to expose to the browser (they are public regulatory constants). Edit them whenever NEPSE updates the fee schedule — existing transaction records are unaffected because charges are stored at save time.

| Variable | Default | Description |
|---|---|---|
| `NEXT_PUBLIC_CGT_SHORT_TERM` | `0.075` | 7.5% CGT for shares held ≤ 365 days |
| `NEXT_PUBLIC_CGT_LONG_TERM` | `0.05` | 5.0% CGT for shares held > 365 days |
| `NEXT_PUBLIC_DP_CHARGE` | `25` | NPR 25 flat DP charge per transaction |
| `NEXT_PUBLIC_SEBON_RATE` | `0.00015` | 0.015% SEBON fee on transaction value |
| `NEXT_PUBLIC_BROKER_RATE_UPTO_50K` | `0.004` | 0.40% broker commission up to NPR 50,000 |
| `NEXT_PUBLIC_BROKER_RATE_50K_500K` | `0.0037` | 0.37% broker commission NPR 50,000–500,000 |
| `NEXT_PUBLIC_BROKER_RATE_ABOVE_500K` | `0.0034` | 0.34% broker commission above NPR 500,000 |

---

## How Charges Are Calculated

All calculations live in `src/lib/nepse-calc.ts` and run on both client (live preview) and server (when saving).

### Transaction value

```
txValue = quantity × pricePerUnit
```

### Primary market purchases are charge-free

Any BUY from a primary-market source — **Primary Market (IPO)**, **Bonus Shares**, or a MeroShare-imported IPO/FPO/Rights/Bonus/Merger/Demat lot — pays **zero** broker commission, DP charge, and SEBON fee. The charges below only apply to ordinary secondary-market trades (and auctions). This reflects that primary allotments come directly from the company/registrar, not through a broker trade on the exchange.

### Broker commission (tiered, non-stacked)

The entire `txValue` is multiplied by one applicable rate (`0` for primary-market sources, see above):
- `txValue ≤ 50,000` → 0.40%
- `50,000 < txValue ≤ 500,000` → 0.37%
- `txValue > 500,000` → 0.34%

### SEBON fee

```
sebon = txValue × 0.00015   (0.015%, or 0 for primary-market sources)
```

### DP charge

```
dpCharge = NPR 25 flat per secondary-market transaction, or 0 for primary-market sources
```

### Capital Gain Tax (SELL only)

CGT applies to **profit only** — no tax on losses. It's computed purely on the SELL side and is unaffected by what source the original shares came from.

```
capitalGain    = max(0, (sellPrice − buyPrice) × quantity)
cgtRate        = 7.5% if daysHeld ≤ 365, else 5.0%
capitalGainTax = capitalGain × cgtRate
```

### Net amount

**BUY** — total cash out:
```
netAmount = txValue + brokerCommission + sebon + dpCharge
```

**SELL** — net cash received:
```
netAmount = txValue − brokerCommission − sebon − dpCharge − capitalGainTax
```

### Bonus shares

Bonus shares (free shares issued as a stock dividend) can be recorded as a BUY with source "Bonus Shares." Price per unit is locked to `0` since no money changes hands, and — like other primary-market sources — no broker commission, DP charge, or SEBON applies. They still correctly dilute your average cost basis downward when you later sell, which lowers the capital gain (and tax) on that sale, same as the real tax treatment.

---

## Realised P/L vs. Holdings

The dashboard and each portfolio page show two distinct figures, deliberately kept separate:

- **Net P/L** — *realised* profit or loss only, calculated from shares you've actually sold against their cost basis. Shares you're still holding never appear here as a "loss," even though their purchase cost has already left your account.
- **In Hold** — the raw value of shares you're still holding (quantity × actual price paid, no fees), across all open positions. This is capital that's invested, not lost — it only becomes part of Net P/L once you sell.

Each stock in the Holdings table also shows two related but different numbers: **Buy Price** (the raw price you actually paid per unit) and **Avg Cost** (that price plus broker commission/DP/SEBON rolled in — the cost basis used for capital gains tax). Avg Cost will always be slightly higher than Buy Price; that's expected, not a bug.

---

## Common Commands

```bash
bun dev                        # Start dev server
bun run prisma migrate dev     # Create and apply a new migration
bun run prisma studio          # Open Prisma Studio (DB GUI)
bunx better-auth generate      # Regenerate BetterAuth types
bunx shadcn@latest add <name>  # Add a shadcn component
```
