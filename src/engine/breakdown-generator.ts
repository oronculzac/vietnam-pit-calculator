// Breakdown Generator - Creates human-readable step-by-step explanations
// Used by UI to show "how we calculated this"

import type { BreakdownStep, PITResult, ResidencyResult, WithholdingResult } from './calculator';
import { getConstantWithMeta, getTaxTableByScope, getGlossary } from '../rules/ruleset-loader';

// ==================== TYPES ====================

export interface FormattedBreakdown {
    title: string;
    steps: FormattedStep[];
    summary: string;
    glossaryTerms: Array<{ term: string; definition: string }>;
}

export interface FormattedStep {
    label: string;
    value: string;
    explanation?: string;
    citation?: {
        ruleId: string;
        title: string;
        url?: string;
    };
    isHighlighted?: boolean;
    isDeduction?: boolean;
}

// ==================== FORMATTERS ====================

function formatVND(amount: number): string {
    return new Intl.NumberFormat('vi-VN', {
        style: 'currency',
        currency: 'VND',
        maximumFractionDigits: 0,
    }).format(amount);
}

function formatPercent(rate: number): string {
    return `${(rate * 100).toFixed(1)}%`;
}

// ==================== BREAKDOWN GENERATORS ====================

/**
 * Generate formatted PIT breakdown for display
 */
export function generatePITBreakdown(result: PITResult, isResident: boolean): FormattedBreakdown {
    const steps: FormattedStep[] = result.breakdown.map(step => {
        const ruleCitation = step.ruleId
            ? result.rulesUsed.find(r => r.ruleId === step.ruleId)
            : undefined;

        return {
            label: step.label,
            value: formatVND(step.amount),
            explanation: step.formula,
            citation: ruleCitation ? {
                ruleId: ruleCitation.ruleId,
                title: ruleCitation.citation,
            } : undefined,
            isHighlighted: step.label.includes('PIT') || step.label.includes('Tax @'),
            isDeduction: step.isDeduction,
        };
    });

    // Find relevant glossary terms
    const glossary = getGlossary();
    const relevantTerms = glossary.filter(g =>
        g.term.toLowerCase().includes('assessable') ||
        g.term.toLowerCase().includes('deduction') ||
        (isResident && g.term.toLowerCase().includes('resident'))
    );

    return {
        title: isResident ? 'Resident PIT Calculation' : 'Non-Resident PIT Calculation',
        steps,
        summary: `Monthly PIT: ${formatVND(result.monthlyPIT)} | Effective Rate: ${formatPercent(result.effectiveRate)}`,
        glossaryTerms: relevantTerms.map(g => ({ term: g.term, definition: g.definition })),
    };
}

/**
 * Generate formatted residency determination breakdown
 */
export function generateResidencyBreakdown(result: ResidencyResult): FormattedBreakdown {
    const steps: FormattedStep[] = result.factors.map((factor, i) => ({
        label: `Factor ${i + 1}`,
        value: factor,
        isHighlighted: factor.includes('≥183') || factor.includes('resident'),
    }));

    // Add what would change
    result.whatWouldChange.forEach((change, i) => {
        steps.push({
            label: `Change Path ${i + 1}`,
            value: change,
            isDeduction: true, // Use different styling
        });
    });

    const glossary = getGlossary();
    const relevantTerms = glossary.filter(g =>
        g.term.toLowerCase().includes('resident')
    );

    return {
        title: 'Residency Determination',
        steps,
        summary: `Status: ${result.status.toUpperCase()} | Confidence: ${result.confidence}`,
        glossaryTerms: relevantTerms.map(g => ({ term: g.term, definition: g.definition })),
    };
}

/**
 * Generate formatted withholding check breakdown
 */
export function generateWithholdingBreakdown(result: WithholdingResult): FormattedBreakdown {
    const steps: FormattedStep[] = [
        {
            label: 'Withholding Required',
            value: result.withholdRequired ? 'Yes' : 'No',
            isHighlighted: true,
        },
        {
            label: 'Withholding Rate',
            value: formatPercent(result.withholdingRate),
        },
        {
            label: 'Withholding Amount',
            value: formatVND(result.withholdingAmount),
            isHighlighted: result.withholdRequired,
        },
        {
            label: 'Explanation',
            value: result.explanation,
        },
    ];

    const glossary = getGlossary();
    const relevantTerms = glossary.filter(g =>
        g.term.toLowerCase().includes('withholding')
    );

    return {
        title: '10% Withholding Check',
        steps,
        summary: result.withholdRequired
            ? `10% withholding required: ${formatVND(result.withholdingAmount)}`
            : 'No 10% withholding required',
        glossaryTerms: relevantTerms.map(g => ({ term: g.term, definition: g.definition })),
    };
}

// ==================== ASSUMPTIONS TEXT ====================

/**
 * Get formatted assumptions for display
 */
export function getAssumptionsText(assumptions: string[]): string[] {
    return assumptions.map(a => `• ${a}`);
}

// ==================== LEGAL BASIS SUMMARY ====================

export interface LegalBasisSummary {
    ruleId: string;
    ruleName: string;
    sourceTitle: string;
    sourceUrl?: string;
    effectiveDate: string;
}

/**
 * Get legal basis summary for all rules used
 */
export function getLegalBasisSummary(result: PITResult): LegalBasisSummary[] {
    const date = new Date();
    const summaries: LegalBasisSummary[] = [];

    // Add family deduction sources
    const taxpayerMeta = getConstantWithMeta('FAMILY_DEDUCTION_TAXPAYER_MONTHLY', date);
    if (taxpayerMeta) {
        summaries.push({
            ruleId: taxpayerMeta.key,
            ruleName: 'Family Circumstance Deduction (Taxpayer)',
            sourceTitle: taxpayerMeta.source_refs[0]?.title ?? 'Resolution 110/2025',
            sourceUrl: taxpayerMeta.source_refs[0]?.url,
            effectiveDate: taxpayerMeta.effective_from,
        });
    }

    // Add tax table sources
    const taxTable = getTaxTableByScope('resident_employment_income', date);
    if (taxTable) {
        summaries.push({
            ruleId: taxTable.table_id,
            ruleName: '5-Bracket Progressive Tax Table',
            sourceTitle: taxTable.source_refs[0]?.title ?? 'Vietnam Briefing',
            sourceUrl: taxTable.source_refs[0]?.url,
            effectiveDate: taxTable.effective_from,
        });
    }

    return summaries;
}
