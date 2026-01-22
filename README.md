# Vietnam PIT Calculator

A webapp that helps expats in Vietnam **estimate Personal Income Tax (PIT)** with audit-friendly calculation breakdowns, versioned by tax year, and citing primary sources.

## Features

- **Residency Checker**: Determine tax residency status based on 183-day test
- **PIT Calculator (Resident)**: Progressive 5-bracket calculation with 2026 rules
- **PIT Calculator (Non-Resident)**: Flat 20% rate estimation
- **Withholding Helper**: 10% withholding check for short-term/no-contract payments
- **AI-Powered Explanations**: Understand "why" with cited legal basis

## Tech Stack

- **Framework**: Next.js 15 (App Router) + TypeScript
- **UI**: shadcn/ui + Tailwind CSS
- **AI**: Vercel AI SDK (@ai-sdk/openai)
- **Validation**: Zod
- **Deployment**: Vercel

## 2026 Tax Rules

| Constant | Value | Source |
|----------|-------|--------|
| Taxpayer deduction | 15,500,000 VND/month | Resolution 110/2025 |
| Dependent deduction | 6,200,000 VND/month | Resolution 110/2025 |
| Progressive brackets | 5 levels (5%, 10%, 20%, 30%, 35%) | Baker McKenzie |
| Non-resident rate | 20% flat | Circular guidance |

## Project Structure

```
vietnam-pit-calculator/
├── docs/               # PRD, wireframes, legal research
├── src/
│   ├── engine/         # Deterministic calculator core
│   ├── rules/          # Versioned rulesets (JSON)
│   └── web/            # Next.js application
├── tests/
│   ├── scenarios/      # 50-case regression suite
│   └── unit/           # Unit tests
└── notebooks/          # Exploration & prototyping
```

## Getting Started

```bash
cd src/web
npm install
npm run dev
```

## Disclaimer

This tool provides **estimates only** and is not legal or tax advice. Always consult a qualified tax professional for official filings.

## License

MIT
