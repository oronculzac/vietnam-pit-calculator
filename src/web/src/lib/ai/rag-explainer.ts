// RAG Explainer - Citation-grounded explanations using Rules Catalog
// Uses Groq for fast inference with retrieval over tax rules

import { streamText, generateText } from 'ai';
import { createGroq } from '@ai-sdk/groq';

// Initialize Groq lazily to prevent build-time crashes if key is missing
const apiKey = process.env.GROQ_API_KEY || 'dummy-key-for-build';
const groq = createGroq({
    apiKey,
});

const MODEL = groq('llama-3.3-70b-versatile');

// ==================== RULES CONTEXT ====================

// Import rules data for RAG context
const RULES_CONTEXT = `
# Vietnam PIT Rules 2026

## Family Deductions (Effective Jan 1, 2026)
- Taxpayer deduction: 15,500,000 VND/month
- Dependent deduction: 6,200,000 VND/month per registered dependent
- Source: Resolution 110/2025/UBTVQH15

## Progressive Tax Brackets (Residents)
| Monthly Assessable Income | Rate |
|---------------------------|------|
| 0 - 10,000,000 VND | 5% |
| 10,000,001 - 30,000,000 VND | 10% |
| 30,000,001 - 60,000,000 VND | 20% |
| 60,000,001 - 100,000,000 VND | 30% |
| Over 100,000,000 VND | 35% |
- Source: Baker McKenzie, Vietnam Briefing 2026

## Non-Resident Rate
- Flat 20% on Vietnam-sourced employment income
- No deductions available
- Source: Circular 111/2013/TT-BTC

## Residency Test (183-Day Rule)
- Resident: 183+ days in calendar year OR in any 12 consecutive months from first entry
- Residents: taxed on worldwide income
- Non-residents: taxed only on Vietnam-sourced income
- Source: Law on Personal Income Tax

## 10% Withholding Rule
- Applies when: No labor contract OR contract < 3 months
- AND: Payment >= 2,000,000 VND per time
- Source: Circular 111/2013/TT-BTC Article 25

## Overtime Exemption
- Only the PREMIUM portion is exempt (not the base pay for those hours)
- Example: If OT is paid at 150%, only the 50% premium is exempt
- Must have employer documentation
- Source: Circular 111/2013/TT-BTC

## Common Misconceptions
1. "All overtime pay is tax-free" - FALSE, only the premium portion
2. "Non-residents get family deductions" - FALSE, no deductions for non-residents
3. "182 days means non-resident" - TRUE, must have 183+ days for residency
`;

const EXPLAINER_SYSTEM_PROMPT = `You are a Vietnam tax expert assistant. Your job is to explain tax calculations and rules to expats in Vietnam.

RULES:
1. ONLY answer based on the provided tax rules context
2. ALWAYS cite the specific rule and source when explaining
3. Be clear and concise - expats are confused, help them understand
4. If asked about something not in the rules, say "This specific scenario is not covered in the current rules. Please consult a tax professional."
5. Use examples with specific numbers when helpful
6. Highlight common misconceptions when relevant

FORMAT:
- Use bullet points for clarity
- Cite sources in [brackets] like [Resolution 110/2025]
- If uncertain, be explicit about what needs verification

${RULES_CONTEXT}`;

// ==================== EXPLAINER FUNCTIONS ====================

export interface ExplainRequest {
    question: string;
    calculationContext?: {
        grossIncome?: number;
        monthlyPIT?: number;
        residencyStatus?: 'resident' | 'non_resident';
        dependentsCount?: number;
    };
}

export interface ExplainResponse {
    explanation: string;
    citations: string[];
    assumptions: string[];
    needsVerification: string[];
}

/**
 * Generate a streaming explanation (for UI with typing effect)
 */
export function streamExplanation(request: ExplainRequest) {
    const contextStr = request.calculationContext
        ? `\n\nUser's calculation context:
- Gross Income: ${request.calculationContext.grossIncome?.toLocaleString() ?? 'Not provided'} VND
- Monthly PIT: ${request.calculationContext.monthlyPIT?.toLocaleString() ?? 'Not calculated'} VND
- Residency: ${request.calculationContext.residencyStatus ?? 'Unknown'}
- Dependents: ${request.calculationContext.dependentsCount ?? 0}`
        : '';

    return streamText({
        model: MODEL,
        system: EXPLAINER_SYSTEM_PROMPT,
        prompt: `${request.question}${contextStr}`,
    });
}

/**
 * Generate a complete explanation (for API responses)
 */
export async function generateExplanation(request: ExplainRequest): Promise<string> {
    const contextStr = request.calculationContext
        ? `\n\nUser's calculation context:
- Gross Income: ${request.calculationContext.grossIncome?.toLocaleString() ?? 'Not provided'} VND
- Monthly PIT: ${request.calculationContext.monthlyPIT?.toLocaleString() ?? 'Not calculated'} VND
- Residency: ${request.calculationContext.residencyStatus ?? 'Unknown'}
- Dependents: ${request.calculationContext.dependentsCount ?? 0}`
        : '';

    const { text } = await generateText({
        model: MODEL,
        system: EXPLAINER_SYSTEM_PROMPT,
        prompt: `${request.question}${contextStr}`,
    });

    return text;
}

// ==================== FAQ ANSWERS ====================

const FAQ_ANSWERS: Record<string, string> = {
    'overtime': `**Is overtime taxed in Vietnam?**

Partially. Only the **premium portion** of overtime pay is exempt from PIT.

Example:
- If you earn 100,000 VND/hour normally
- And overtime is paid at 150% = 150,000 VND/hour
- Only the 50,000 VND premium is exempt
- The base 100,000 VND is still taxable

[Source: Circular 111/2013/TT-BTC]`,

    'resident_vs_nonresident': `**What's the difference between resident and non-resident tax?**

| | Resident | Non-Resident |
|---|---|---|
| Tax Rate | Progressive 5-35% | Flat 20% |
| Taxable Income | Worldwide | Vietnam-sourced only |
| Family Deductions | ✅ Yes | ❌ No |
| Dependent Deductions | ✅ Yes | ❌ No |

**How to become a resident:**
- Be in Vietnam for 183+ days in a calendar year, OR
- Be in Vietnam for 183+ days in any 12 consecutive months from first entry

[Source: Law on PIT, Circular 111/2013]`,

    'deductions_2026': `**2026 Family Deductions (Effective January 1, 2026):**

- **Taxpayer:** 15,500,000 VND/month (up from 11,000,000)
- **Per Dependent:** 6,200,000 VND/month (up from 4,400,000)

These are subtracted from your gross income BEFORE calculating tax.

[Source: Resolution 110/2025/UBTVQH15]`,
};

/**
 * Get a pre-written FAQ answer if available
 */
export function getFAQAnswer(topic: string): string | null {
    const key = Object.keys(FAQ_ANSWERS).find(k =>
        topic.toLowerCase().includes(k.toLowerCase())
    );
    return key ? FAQ_ANSWERS[key] : null;
}

/**
 * Answer a question - uses FAQ if available, otherwise generates
 */
export async function answerQuestion(question: string, context?: ExplainRequest['calculationContext']): Promise<string> {
    // Check FAQ first for instant response
    const faqAnswer = getFAQAnswer(question);
    if (faqAnswer) {
        return faqAnswer;
    }

    // Generate answer with AI
    return generateExplanation({ question, calculationContext: context });
}
