# Phase 4: Web Application - Agent Handoff Document

> **Purpose**: This document provides everything needed for an agent to build the Vietnam PIT Calculator web application independently.

---

## Project Location

```
c:\Users\Oron Culzac\antigravity_general\projects\vietnam-pit-calculator\src\web\
```

**GitHub**: [oronculzac/vietnam-pit-calculator](https://github.com/oronculzac/vietnam-pit-calculator)

---

## Tech Stack (Pre-configured)

| Component | Technology | Status |
|-----------|------------|--------|
| Framework | Next.js 15 (App Router) | ✅ Installed |
| Language | TypeScript | ✅ Configured |
| Styling | Tailwind CSS v4 | ✅ Installed |
| Components | shadcn/ui | ✅ Initialized |
| Forms | react-hook-form + @hookform/resolvers | ✅ Installed |
| Validation | Zod | ✅ Installed |
| AI | Vercel AI SDK (@ai-sdk/openai) | ✅ Installed |

**Installed shadcn/ui components**: button, card, input, label, form, tabs, tooltip

---

## Start Development

```bash
cd c:\Users\Oron Culzac\antigravity_general\projects\vietnam-pit-calculator\src\web
npm run dev
```

---

## Pages to Build

### 1. Landing Page (`/`)

**Hero Section**:
- Headline: "Estimate Vietnam Personal Income Tax (PIT) — Expats — 2026 rules"
- Subheadline: "Audit-friendly breakdowns with legal citations"
- Primary CTA: "Start PIT Estimate" → `/calculator`
- Secondary CTA: "Check Residency" → `/residency`

**Trust Strip** (3 cards):
- "Estimates only — not legal advice"
- "Shows calculations + citations"
- "Rule-set versioned by tax year"

**Quick Links**:
- "What changed in 2026?" → `/changelog`
- "Resident vs Non-resident?" → `/residency`

---

### 2. Residency Checker (`/residency`)

**Multi-step wizard flow**:

**Step 1: Travel & Presence**
- First entry date (date picker)
- Days present in Vietnam (number input OR calendar selector)
- Tooltip: "Counting method help"

**Step 2: Housing Indicators (optional)**
- Has registered permanent residence? (Y/N radio)
- Has VN rental contract ≥183 days? (Y/N radio)

**Output Panel**:
- Status badge: "Resident" / "Non-resident" / "Likely resident (needs more info)"
- Confidence indicator (High/Medium/Low)
- "What would change this" explanation text
- Button: "Use this result in calculator" → navigates to `/calculator` with residency pre-filled

---

### 3. PIT Calculator (`/calculator`)

**Multi-step wizard with progress indicator**:

**Step 1: Profile**
- Tax year selector (dropdown, default: 2026)
- Residency status (radio: Resident / Non-resident, OR auto-filled from residency checker)

**Step 2: Income**
- Monthly gross salary (currency input, VND)
- Bonuses section:
  - Bonus amount (VND)
  - Month paid (dropdown)
  - [+ Add another bonus]
- Taxable allowances:
  - Line item description
  - Amount (VND)
  - [+ Add allowance]

**Step 3: Deductions (Resident only)**
- Number of dependents (number input, 0-10)
- Insurance contributions (VND or percentage toggle)
- Charity/donations (optional, VND)

**Step 4: Results**
Display as tabbed interface:

| Tab | Content |
|-----|---------|
| **Summary** | Monthly PIT + Annualized PIT (large display), Effective rate |
| **Breakdown** | Step-by-step: Gross → Exemptions → Deductions → Assessable → Brackets → Tax |
| **Assumptions** | List of what the calculator assumed (e.g., "All allowances taxable") |
| **Legal Basis** | Citations per rule used, with links to sources |
| **FAQ** | Common questions for this calculation |

**Key UX Requirements**:
- Every number in breakdown has "ⓘ" tooltip showing: rule name + effective date + citation
- "Download breakdown" button (PDF/JSON export - can be future)
- "Share calculation" button (URL with params - can be future)

---

### 4. Explain / FAQ Page (`/explain`)

**Question-based navigation**:
- "Why did my tax jump this month?"
- "Is overtime taxed?"
- "Non-resident vs resident — what changes?"
- "I'm paid abroad — how is income allocated?"

Each question expands to show:
- Plain language answer
- Legal basis citation
- Link to relevant source

**AI Chat (optional enhancement)**:
- Text input: "Ask a question about Vietnam PIT..."
- Streaming responses using Vercel AI SDK
- Responses cite rules and sources

---

### 5. Legal Basis / Sources (`/sources`)

**Structured page organized by topic**:

| Section | Key Sources |
|---------|-------------|
| Residency | Law on Personal Income Tax, Article X |
| Rates & Brackets | Baker McKenzie 2026 Summary |
| Family Deductions | Resolution 110/2025/UBTVQH15 |
| Non-resident Treatment | Circular guidance |
| Withholding (10%) | Circular 111/2013 |
| Exempt Income | Overtime premium rules |

Each source shows:
- Title
- URL (external link)
- Effective date
- Brief description

---

### 6. Changelog (`/changelog`)

**Timeline format** (newest first):
```
2026-01-01
├─ Family deductions updated: 15.5m / 6.2m VND
├─ Salary/wage brackets simplified to 5 levels
└─ Source: Resolution 110/2025/UBTVQH15

2025-XX-XX
└─ Previous version rules...
```

---

## Navigation Structure

```
Header (sticky)
├─ Logo: "VN PIT Calculator"
├─ Nav Links: Home | Residency | Calculator | FAQ | Sources | Changelog
└─ Theme Toggle (light/dark)

Footer
├─ Disclaimer: "Estimate only — not legal advice"
├─ Copyright
└─ Links: Privacy | Terms | GitHub
```

---

## Design System

### Generate with ui-ux-pro-max skill:
```bash
cd c:\Users\Oron Culzac\antigravity_general
python .agent\skills\ui-ux-pro-max\scripts\search.py "fintech tax calculator professional dashboard dark" --design-system -p "Vietnam PIT Calculator" --persist
```

### Design Direction:
- **Style**: Professional, trustworthy, fintech-inspired
- **Mode**: Dark mode default (with toggle)
- **Colors**: Blues/teals for trust, greens for positive results, amber for warnings
- **Typography**: Clean, modern (Inter or similar)
- **Cards**: Glassmorphism subtle, good contrast
- **Animations**: Subtle micro-animations, smooth transitions

### Critical UI Rules (from ui-ux-pro-max):
- No emoji icons — use Lucide/Heroicons SVGs
- All clickable elements have `cursor-pointer`
- Hover states don't cause layout shift
- Light mode text has 4.5:1 minimum contrast
- Glass elements visible in both modes

---

## Calculator API Contract

The deterministic calculator engine will expose these TypeScript functions. For now, **mock these** until the engine is built:

```typescript
// src/engine/types.ts (create this)

export interface ResidencyInput {
  firstEntryDate: Date;
  daysPresent: number;
  hasPermanentResidence?: boolean;
  hasRentalContract183Days?: boolean;
}

export interface ResidencyResult {
  status: 'resident' | 'non_resident' | 'uncertain';
  confidence: 'high' | 'medium' | 'low';
  factors: string[];
  whatWouldChange: string[];
}

export interface PITInput {
  ruleset: string; // 'VN_PIT_2026'
  residencyStatus: 'resident' | 'non_resident';
  monthlyGrossSalary: number;
  bonuses: { amount: number; month: number }[];
  taxableAllowances: { description: string; amount: number }[];
  dependentsCount: number;
  insuranceContributions: number;
  charityDonations?: number;
}

export interface PITResult {
  monthlyPIT: number;
  annualizedPIT: number;
  effectiveRate: number;
  breakdown: BreakdownStep[];
  assumptions: string[];
  rulesUsed: RuleReference[];
}

export interface BreakdownStep {
  label: string;
  amount: number;
  formula?: string;
  ruleId?: string;
}

export interface RuleReference {
  ruleId: string;
  ruleName: string;
  effectiveDate: string;
  sourceUrl: string;
  sourceTitle: string;
}
```

---

## Mock Data for Development

### 2026 Constants (use for display):
```typescript
export const VN_PIT_2026 = {
  taxpayerDeduction: 15_500_000, // VND/month
  dependentDeduction: 6_200_000,  // VND/month
  brackets: [
    { min: 0, max: 10_000_000, rate: 0.05 },
    { min: 10_000_000, max: 30_000_000, rate: 0.10 },
    { min: 30_000_000, max: 60_000_000, rate: 0.20 },
    { min: 60_000_000, max: 100_000_000, rate: 0.30 },
    { min: 100_000_000, max: Infinity, rate: 0.35 },
  ],
  nonResidentRate: 0.20,
  withholdingThreshold: 2_000_000,
  withholdingRate: 0.10,
};
```

---

## File Structure to Create

```
src/web/src/
├── app/
│   ├── page.tsx                 # Landing
│   ├── layout.tsx               # Root layout (exists)
│   ├── residency/
│   │   └── page.tsx             # Residency checker
│   ├── calculator/
│   │   └── page.tsx             # PIT calculator
│   ├── explain/
│   │   └── page.tsx             # FAQ + AI assistant
│   ├── sources/
│   │   └── page.tsx             # Legal basis
│   ├── changelog/
│   │   └── page.tsx             # Rule updates
│   └── api/
│       ├── calculate/
│       │   └── route.ts         # Calculator API (mock for now)
│       └── explain/
│           └── route.ts         # AI explanation API
├── components/
│   ├── ui/                      # shadcn components (exists)
│   ├── calculator/
│   │   ├── income-form.tsx
│   │   ├── deductions-form.tsx
│   │   ├── results-display.tsx
│   │   └── breakdown-table.tsx
│   ├── residency/
│   │   ├── presence-form.tsx
│   │   └── result-card.tsx
│   └── shared/
│       ├── header.tsx
│       ├── footer.tsx
│       ├── step-wizard.tsx
│       └── info-tooltip.tsx
├── lib/
│   ├── utils.ts                 # (exists)
│   ├── constants.ts             # 2026 tax constants
│   └── mock-calculator.ts       # Mock functions until engine ready
└── types/
    └── calculator.ts            # TypeScript interfaces
```

---

## Add More shadcn Components

```bash
cd c:\Users\Oron Culzac\antigravity_general\projects\vietnam-pit-calculator\src\web
npx shadcn@latest add select radio-group progress badge separator accordion alert dialog -y
```

---

## Environment Variables

Create `.env.local`:
```env
# AI (optional - for explain feature)
OPENAI_API_KEY=your_key_here

# App
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

---

## Success Criteria

1. [ ] All 6 pages render without errors
2. [ ] Calculator flow works end-to-end (with mock data)
3. [ ] Residency checker determines status correctly
4. [ ] Results show step-by-step breakdown with tooltips
5. [ ] Mobile responsive (375px, 768px, 1024px)
6. [ ] Dark/light mode toggle works
7. [ ] Accessibility: keyboard nav, proper labels
8. [ ] Design looks professional and trustworthy

---

## Integration Points

When the deterministic calculator engine is ready (Phase 3), replace mock functions:

1. Import from `../../engine/calculator.ts`
2. Replace `mockCalculatePIT()` with real `calculateResidentPIT()` / `calculateNonResidentPIT()`
3. Replace `mockDetermineResidency()` with real `determineResidency()`

The API contract above matches what the engine will provide.

---

## Questions? Check:

- **PRD**: Original product requirements in implementation_plan.md
- **Design**: Run ui-ux-pro-max skill for design tokens
- **Components**: shadcn/ui docs at ui.shadcn.com
