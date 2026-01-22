// Deterministic Calculator Engine for Vietnam PIT
// This module contains all tax calculation logic - NO AI, purely deterministic

import {
    getConstant,
    getConstantWithMeta,
    getTaxTableByScope,
    getDecisionRule,
    getExemption,
    type TaxTable,
} from '../rules/ruleset-loader';

// ==================== TYPES ====================

export interface ResidencyInput {
    /** Days present in Vietnam during the tax year */
    daysInTaxYear: number;
    /** Days present in 12 consecutive months from first entry (optional) */
    daysIn12ConsecutiveMonths?: number;
    /** Has registered permanent residence */
    hasPermanentResidence?: boolean;
    /** Has rental contract >= 183 days */
    hasRentalContract183Days?: boolean;
}

export type ResidencyStatus = 'resident' | 'non_resident' | 'unknown';

export interface ResidencyResult {
    status: ResidencyStatus;
    confidence: 'high' | 'medium' | 'low';
    factors: string[];
    whatWouldChange: string[];
    ruleId: string;
    ruleCitation: string;
}

export interface PITInput {
    /** Tax residency status */
    residencyStatus: 'resident' | 'non_resident';
    /** Monthly gross salary in VND */
    grossSalary: number;
    /** Total taxable allowances in VND */
    taxableAllowances: number;
    /** Number of registered dependents */
    dependentsCount: number;
    /** Monthly insurance contributions in VND */
    insuranceContributions: number;
    /** Assessment date (defaults to now) */
    assessmentDate?: Date;
}

export interface BreakdownStep {
    label: string;
    amount: number;
    formula?: string;
    ruleId?: string;
    isDeduction?: boolean;
}

export interface PITResult {
    /** Monthly PIT in VND */
    monthlyPIT: number;
    /** Annualized PIT (monthly × 12) */
    annualizedPIT: number;
    /** Effective tax rate */
    effectiveRate: number;
    /** Step-by-step breakdown */
    breakdown: BreakdownStep[];
    /** Assumptions made */
    assumptions: string[];
    /** Rules used with citations */
    rulesUsed: Array<{ ruleId: string; citation: string }>;
}

export interface WithholdingInput {
    /** Has a labor contract */
    hasLaborContract: boolean;
    /** Contract duration in months (if applicable) */
    contractDurationMonths?: number;
    /** Payment amount per time in VND */
    paymentAmount: number;
}

export interface WithholdingResult {
    withholdRequired: boolean;
    withholdingRate: number;
    withholdingAmount: number;
    explanation: string;
    ruleId: string;
}

// ==================== RESIDENCY DETERMINATION ====================

/**
 * Determine tax residency status
 * Rule: VN_RESIDENCY_183_DAY_TEST
 */
export function determineResidency(input: ResidencyInput): ResidencyResult {
    const rule = getDecisionRule('VN_RESIDENCY_183_DAY_TEST');
    const threshold = getConstant('RESIDENCY_DAYS_THRESHOLD') ?? 183;

    const factors: string[] = [];
    const whatWouldChange: string[] = [];

    // Check 183-day test
    if (input.daysInTaxYear >= threshold) {
        factors.push(`Present in Vietnam for ${input.daysInTaxYear} days in tax year (≥${threshold} days)`);
        return {
            status: 'resident',
            confidence: 'high',
            factors,
            whatWouldChange: ['Result cannot change - already met 183-day threshold'],
            ruleId: rule?.rule_id ?? 'VN_RESIDENCY_183_DAY_TEST',
            ruleCitation: rule?.source_refs[0]?.title ?? 'Law on Personal Income Tax',
        };
    }

    // Check 12-month rolling period
    if (input.daysIn12ConsecutiveMonths && input.daysIn12ConsecutiveMonths >= threshold) {
        factors.push(`Present for ${input.daysIn12ConsecutiveMonths} days in 12 consecutive months from first entry (≥${threshold} days)`);
        return {
            status: 'resident',
            confidence: 'high',
            factors,
            whatWouldChange: ['Result cannot change - already met 183-day rolling threshold'],
            ruleId: rule?.rule_id ?? 'VN_RESIDENCY_183_DAY_TEST',
            ruleCitation: rule?.source_refs[0]?.title ?? 'Law on Personal Income Tax',
        };
    }

    // Additional factors (v2 enhancement)
    if (input.hasPermanentResidence || input.hasRentalContract183Days) {
        factors.push(`${input.daysInTaxYear} days present (<${threshold} days)`);
        if (input.hasPermanentResidence) factors.push('Has registered permanent residence');
        if (input.hasRentalContract183Days) factors.push('Has rental contract ≥183 days');

        return {
            status: 'resident',
            confidence: 'medium',
            factors,
            whatWouldChange: ['If permanent residence or rental situation changes'],
            ruleId: rule?.rule_id ?? 'VN_RESIDENCY_183_DAY_TEST',
            ruleCitation: rule?.source_refs[0]?.title ?? 'Law on Personal Income Tax',
        };
    }

    // Non-resident
    factors.push(`Present in Vietnam for ${input.daysInTaxYear} days (<${threshold} days)`);
    factors.push('No permanent residence registered');
    whatWouldChange.push(`Need ${threshold - input.daysInTaxYear} more days to become resident`);
    whatWouldChange.push('Register permanent residence');
    whatWouldChange.push('Sign rental contract ≥183 days');

    return {
        status: 'non_resident',
        confidence: input.daysInTaxYear < 150 ? 'high' : 'medium',
        factors,
        whatWouldChange,
        ruleId: rule?.rule_id ?? 'VN_RESIDENCY_183_DAY_TEST',
        ruleCitation: rule?.source_refs[0]?.title ?? 'Law on Personal Income Tax',
    };
}

// ==================== PIT CALCULATION ====================

/**
 * Calculate progressive tax using brackets
 */
function calculateProgressiveTax(assessableIncome: number, table: TaxTable): { tax: number; bracketBreakdown: BreakdownStep[] } {
    const bracketBreakdown: BreakdownStep[] = [];
    let remainingIncome = assessableIncome;
    let totalTax = 0;

    for (const bracket of table.brackets) {
        if (remainingIncome <= 0) break;

        const min = bracket.min_inclusive ?? bracket.min_exclusive ?? 0;
        const max = bracket.max_inclusive ?? Infinity;
        const bracketWidth = max - min;

        // Handle exclusive min (income must be > min, not >= min)
        const adjustedRemaining = bracket.min_exclusive !== undefined
            ? remainingIncome
            : remainingIncome;

        const taxableInBracket = Math.min(adjustedRemaining, bracketWidth);

        if (taxableInBracket > 0) {
            const taxInBracket = taxableInBracket * bracket.rate;

            bracketBreakdown.push({
                label: `Tax @ ${(bracket.rate * 100).toFixed(0)}% (${formatVND(min)} - ${max === Infinity ? '∞' : formatVND(max)})`,
                amount: taxInBracket,
                formula: `${formatVND(taxableInBracket)} × ${(bracket.rate * 100).toFixed(0)}%`,
                ruleId: table.table_id,
            });

            totalTax += taxInBracket;
        }

        remainingIncome -= taxableInBracket;
    }

    return { tax: totalTax, bracketBreakdown };
}

/**
 * Calculate PIT for resident employment income (progressive)
 */
export function calculateResidentPIT(input: PITInput): PITResult {
    const date = input.assessmentDate ?? new Date();

    // Get constants
    const taxpayerDeduction = getConstant('FAMILY_DEDUCTION_TAXPAYER_MONTHLY', date) ?? 15500000;
    const dependentDeduction = getConstant('FAMILY_DEDUCTION_DEPENDENT_MONTHLY', date) ?? 6200000;

    // Get tax table
    const taxTable = getTaxTableByScope('resident_employment_income', date);
    if (!taxTable) {
        throw new Error('No resident employment income tax table found for date');
    }

    // Calculate gross income
    const grossIncome = input.grossSalary + input.taxableAllowances;

    // Calculate deductions
    const totalDependentDeduction = input.dependentsCount * dependentDeduction;
    const totalDeductions = taxpayerDeduction + totalDependentDeduction + input.insuranceContributions;

    // Calculate assessable income (cannot be negative)
    const assessableIncome = Math.max(0, grossIncome - totalDeductions);

    // Build breakdown
    const breakdown: BreakdownStep[] = [
        { label: 'Gross Salary', amount: input.grossSalary },
    ];

    if (input.taxableAllowances > 0) {
        breakdown.push({ label: 'Taxable Allowances', amount: input.taxableAllowances });
    }

    breakdown.push({ label: 'Total Gross Income', amount: grossIncome });

    // Deductions
    const taxpayerMeta = getConstantWithMeta('FAMILY_DEDUCTION_TAXPAYER_MONTHLY', date);
    breakdown.push({
        label: 'Less: Taxpayer Deduction',
        amount: -taxpayerDeduction,
        isDeduction: true,
        formula: `${formatVND(taxpayerDeduction)}/month`,
        ruleId: 'FAMILY_DEDUCTION_TAXPAYER_MONTHLY',
    });

    if (input.dependentsCount > 0) {
        breakdown.push({
            label: `Less: Dependent Deduction (${input.dependentsCount} × ${formatVND(dependentDeduction)})`,
            amount: -totalDependentDeduction,
            isDeduction: true,
            ruleId: 'FAMILY_DEDUCTION_DEPENDENT_MONTHLY',
        });
    }

    if (input.insuranceContributions > 0) {
        breakdown.push({
            label: 'Less: Insurance Contributions',
            amount: -input.insuranceContributions,
            isDeduction: true,
        });
    }

    breakdown.push({ label: 'Assessable Income', amount: assessableIncome });

    // Progressive tax calculation
    const { tax: monthlyPIT, bracketBreakdown } = calculateProgressiveTax(assessableIncome, taxTable);
    breakdown.push(...bracketBreakdown);
    breakdown.push({ label: 'Monthly PIT', amount: monthlyPIT });

    // Effective rate
    const effectiveRate = grossIncome > 0 ? monthlyPIT / grossIncome : 0;

    return {
        monthlyPIT,
        annualizedPIT: monthlyPIT * 12,
        effectiveRate,
        breakdown,
        assumptions: [
            'All allowances are taxable unless specified exempt',
            'Insurance contributions are mandatory social insurance',
            'Dependents are properly registered with tax authority',
        ],
        rulesUsed: [
            { ruleId: 'FAMILY_DEDUCTION_TAXPAYER_MONTHLY', citation: taxpayerMeta?.source_refs[0]?.title ?? 'Resolution 110/2025' },
            { ruleId: taxTable.table_id, citation: taxTable.source_refs[0]?.title ?? 'Vietnam Briefing' },
        ],
    };
}

/**
 * Calculate PIT for non-resident employment income (flat 20%)
 */
export function calculateNonResidentPIT(input: PITInput): PITResult {
    const date = input.assessmentDate ?? new Date();

    // Get tax table
    const taxTable = getTaxTableByScope('nonresident_employment_income', date);
    const rate = taxTable?.brackets[0]?.rate ?? 0.20;

    // Non-residents: no deductions, flat rate on total income
    const taxableIncome = input.grossSalary + input.taxableAllowances;
    const monthlyPIT = taxableIncome * rate;

    const breakdown: BreakdownStep[] = [
        { label: 'Gross Salary', amount: input.grossSalary },
    ];

    if (input.taxableAllowances > 0) {
        breakdown.push({ label: 'Taxable Allowances', amount: input.taxableAllowances });
    }

    breakdown.push(
        { label: 'Taxable Income', amount: taxableIncome },
        {
            label: `PIT @ ${(rate * 100).toFixed(0)}% (Non-resident flat rate)`,
            amount: monthlyPIT,
            formula: `${formatVND(taxableIncome)} × ${(rate * 100).toFixed(0)}%`,
            ruleId: taxTable?.table_id ?? 'VN_NONRESIDENT_EMPLOYMENT_FLAT_2026',
        },
        { label: 'Monthly PIT', amount: monthlyPIT }
    );

    return {
        monthlyPIT,
        annualizedPIT: monthlyPIT * 12,
        effectiveRate: rate,
        breakdown,
        assumptions: [
            'All income is Vietnam-sourced',
            'All allowances are taxable',
            'Non-residents are not eligible for family deductions',
            'Non-residents are not eligible for dependent deductions',
        ],
        rulesUsed: [
            { ruleId: taxTable?.table_id ?? 'NON_RESIDENT_RATE', citation: taxTable?.source_refs[0]?.title ?? 'Circular 111/2013/TT-BTC' },
        ],
    };
}

/**
 * Main PIT calculation dispatcher
 */
export function calculatePIT(input: PITInput): PITResult {
    if (input.residencyStatus === 'non_resident') {
        return calculateNonResidentPIT(input);
    }
    return calculateResidentPIT(input);
}

// ==================== WITHHOLDING CHECK ====================

/**
 * Check if 10% withholding is required
 * Rule: WITHHOLDING_10_PERCENT_NO_CONTRACT_OR_LT_3_MONTHS_PAYMENT_GE_2M
 */
export function checkWithholding(input: WithholdingInput): WithholdingResult {
    const threshold = getConstant('WITHHOLDING_THRESHOLD') ?? 2000000;
    const rate = getConstant('WITHHOLDING_RATE') ?? 0.10;
    const contractThreshold = getConstant('SHORT_TERM_CONTRACT_THRESHOLD_MONTHS') ?? 3;

    const rule = getDecisionRule('WITHHOLDING_10_PERCENT_NO_CONTRACT_OR_LT_3_MONTHS_PAYMENT_GE_2M');

    // Check conditions
    const noLongContract = !input.hasLaborContract ||
        (input.contractDurationMonths !== undefined && input.contractDurationMonths < contractThreshold);

    const paymentExceedsThreshold = input.paymentAmount >= threshold;

    const withholdRequired = noLongContract && paymentExceedsThreshold;

    let explanation: string;
    if (withholdRequired) {
        explanation = `Payment of ${formatVND(input.paymentAmount)} requires ${(rate * 100).toFixed(0)}% withholding: ` +
            `${paymentExceedsThreshold ? '≥' : '<'}${formatVND(threshold)} with ` +
            `${!input.hasLaborContract ? 'no labor contract' : `contract <${contractThreshold} months`}`;
    } else if (!paymentExceedsThreshold) {
        explanation = `Payment of ${formatVND(input.paymentAmount)} is below ${formatVND(threshold)} threshold - no withholding required`;
    } else {
        explanation = `Labor contract ≥${contractThreshold} months exists - standard monthly withholding applies instead of 10%`;
    }

    return {
        withholdRequired,
        withholdingRate: withholdRequired ? rate : 0,
        withholdingAmount: withholdRequired ? input.paymentAmount * rate : 0,
        explanation,
        ruleId: rule?.rule_id ?? 'WITHHOLDING_10_PERCENT',
    };
}

// ==================== OVERTIME EXEMPTION ====================

/**
 * Calculate overtime premium exemption
 * Rule: OT_NIGHT_PREMIUM_ONLY_EXEMPT
 */
export function calculateOvertimeExemption(
    actualOvertimePay: number,
    normalPayForSameHours: number
): { exemptAmount: number; taxableAmount: number; explanation: string } {
    const exemption = getExemption('OT_NIGHT_PREMIUM_ONLY_EXEMPT');

    // Only the premium portion is exempt
    const exemptAmount = Math.max(0, actualOvertimePay - normalPayForSameHours);
    const taxableAmount = normalPayForSameHours;

    return {
        exemptAmount,
        taxableAmount,
        explanation: `Overtime pay ${formatVND(actualOvertimePay)}: ` +
            `Normal portion ${formatVND(normalPayForSameHours)} is taxable, ` +
            `Premium portion ${formatVND(exemptAmount)} is exempt`,
    };
}

// ==================== HELPERS ====================

function formatVND(amount: number): string {
    return new Intl.NumberFormat('vi-VN', {
        style: 'currency',
        currency: 'VND',
        maximumFractionDigits: 0,
    }).format(amount);
}
