---
title: Building a Vietnam Personal Income Tax Calculator with AI
published: false
description: How I built an expat-friendly PIT calculator with deterministic rules, AI explanations, and 43 regression tests
tags: nextjs, typescript, ai, vietnam
cover_image: 
---

# Building a Vietnam Personal Income Tax Calculator with AI

**TL;DR**: I built a tax calculator for expats in Vietnam that combines deterministic calculations with AI-powered explanations. It passed 43 regression tests and cites actual Vietnamese tax law.

## The Problem

If you're an expat working in Vietnam, calculating your Personal Income Tax (PIT) is confusing:
- Tax rules changed in January 2026 (new deduction amounts)
- Residency status (183-day rule) affects everything
- Progressive brackets vs flat 20% rate for non-residents
- Overtime premium exemptions are tricky
- Finding accurate, up-to-date information is hard

Most online calculators are outdated or don't cite sources. I wanted something that:
1. ✅ Uses the **correct 2026 rules**
2. ✅ Shows **step-by-step breakdowns**
3. ✅ **Cites primary sources** (Circular 111, Resolution 110)
4. ✅ Has **AI explanations** when you're confused
5. ✅ Is **thoroughly tested** with regression tests

## The Solution

### Architecture: Keep AI Away from the Math

The most important design decision: **AI never does the calculations**.

```
┌─────────────────────────────────────────────────────┐
│                     User Input                      │
└─────────────────────────────────────────────────────┘
                           │
            ┌──────────────┴──────────────┐
            ▼                              ▼
┌──────────────────────┐       ┌──────────────────────┐
│    AI Layer (Groq)   │       │  Deterministic       │
│  - Smart Intake      │       │  Calculator Core     │
│  - Explanations      │       │  - NO AI here!       │
│  - Classifications   │       │  - Pure math         │
└──────────────────────┘       └──────────────────────┘
```

Why? Because tax calculations need to be:
- Auditable
- Reproducible
- Predictable

AI is great for natural language, but terrible for precision math.

### Tech Stack

| Component | Technology |
|-----------|------------|
| Frontend | Next.js 15 + shadcn/ui |
| AI | Groq (Llama 3.3 70B) |
| Web Search | Perplexity API |
| Validation | Zod schemas |
| Rules | Versioned JSON with citations |

### The Rules Engine

I created a versioned rules catalog in JSON:

```json
{
  "ruleset_id": "VN_PIT_2026",
  "constants": [
    {
      "key": "FAMILY_DEDUCTION_TAXPAYER_MONTHLY",
      "value": 15500000,
      "unit": "VND",
      "effective_from": "2026-01-01",
      "source_refs": [
        { "title": "Resolution 110/2025/UBTVQH15" }
      ]
    }
  ],
  "tax_tables": [
    {
      "table_id": "VN_RESIDENT_EMPLOYMENT_PROGRESSIVE_MONTHLY_2026",
      "brackets": [
        { "min_inclusive": 0, "max_inclusive": 10000000, "rate": 0.05 },
        { "min_exclusive": 10000000, "max_inclusive": 30000000, "rate": 0.10 }
        // ... more brackets
      ]
    }
  ]
}
```

Every rule has:
- **Effective dates** (versioning)
- **Source references** (citations)
- **Zod validation** (type safety)

### The Calculator Core

The calculator is pure TypeScript with zero AI:

```typescript
export function calculateResidentPIT(input: PITInput): PITResult {
  // Get 2026 constants
  const taxpayerDeduction = getConstant('FAMILY_DEDUCTION_TAXPAYER_MONTHLY');
  const dependentDeduction = getConstant('FAMILY_DEDUCTION_DEPENDENT_MONTHLY');
  
  // Calculate assessable income
  const grossIncome = input.grossSalary + input.taxableAllowances;
  const totalDeductions = taxpayerDeduction + 
                          (input.dependentsCount * dependentDeduction) + 
                          input.insuranceContributions;
  const assessableIncome = Math.max(0, grossIncome - totalDeductions);
  
  // Apply progressive brackets
  const taxTable = getTaxTableByScope('resident_employment_income');
  const { tax, breakdown } = calculateProgressiveTax(assessableIncome, taxTable);
  
  return {
    monthlyPIT: tax,
    annualizedPIT: tax * 12,
    effectiveRate: grossIncome > 0 ? tax / grossIncome : 0,
    breakdown,
    rulesUsed: [/* citations */],
  };
}
```

### Testing: 43 Regression Tests

I created a comprehensive regression test suite covering:
- 10 residency determination cases
- 10 tax table boundary cases
- 10 deduction scenarios
- 4 non-resident cases
- 6 withholding cases
- 3 overtime exemption cases

One key test catches outdated apps:

```typescript
it('D-028: 2026 deduction guardrail - 25.5m yields assessable 10m', () => {
  // This catches apps using old 11m deduction instead of 15.5m
  const result = calculateResidentPIT({
    residencyStatus: 'resident',
    grossSalary: 25_500_000,
    dependentsCount: 0,
  });
  assert.strictEqual(result.monthlyPIT, 500_000);
});
```

### AI Layer: Where It Shines

AI is used for:

**1. Smart Intake** - Extract structured data from natural language:
```
User: "I make 50 million dong per month, have 2 kids, 
       and been here 8 months"

AI → {
  monthly_gross_salary: 50000000,
  dependents_count: 2,
  confidence: "high"
}
```

**2. Explanations** - Answer "why did I pay this much?":
```
User: "Why is my effective rate only 8%?"

AI: "Your effective rate is low because..."
- Taxpayer deduction: 15.5M/month removes your first 15.5M from tax
- Dependent deduction: 2 kids × 6.2M = 12.4M additional deduction
- [Source: Resolution 110/2025]
```

**3. Web Search** (Perplexity) - For questions beyond static rules:
```
User: "What's the tax filing deadline for 2026?"

[Searches web] → "The annual PIT filing deadline is..."
```

## Results

- **43/43 tests passing** in ~1.9 seconds
- **100% deterministic** calculations
- **Every rule cites** primary sources
- **AI enhances** without compromising accuracy

## What's Next

1. Chat widget for in-context help
2. Expanded FAQ (25+ questions)
3. Data freshness monitoring (auto-detect rule changes)
4. Mobile-responsive calculator

## Links

- **GitHub**: [oronculzac/vietnam-pit-calculator](https://github.com/oronculzac/vietnam-pit-calculator)
- **2026 Rules**: Resolution 110/2025/UBTVQH15, Circular 111/2013

---

*Built with Next.js 15, Groq, and a lot of reading Vietnamese tax law in English.*
