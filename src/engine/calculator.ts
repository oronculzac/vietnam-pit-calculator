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
    /** Monthly charitable donations in VND */
    charityDonations?: number;
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

// ==================== INSURANCE & GROSS-TO-NET ====================

/**
 * Vietnam salary zones (affects insurance caps)
 * Zone 1: HCMC, Hanoi urban districts
 * Zone 2: Suburban areas of major cities
 * Zone 3: Provincial cities
 * Zone 4: Rural areas
 */
export type SalaryZone = 1 | 2 | 3 | 4;

/** 2026 minimum wages by zone (VND/month) */
export const MINIMUM_WAGES_2026: Record<SalaryZone, number> = {
    1: 4960000,  // Zone 1: Highest
    2: 4410000,  // Zone 2
    3: 3860000,  // Zone 3
    4: 3450000,  // Zone 4: Lowest
};

/** Basic wage for SI/HI caps (20x this amount) */
export const BASIC_WAGE_2026 = 2340000;

/** Insurance rates for employees */
export const INSURANCE_RATES = {
    employee: {
        socialInsurance: 0.08,   // 8% SI
        healthInsurance: 0.015, // 1.5% HI
        unemployment: 0.01,      // 1% UI
    },
    employer: {
        socialInsurance: 0.175,  // 17.5% SI
        healthInsurance: 0.03,   // 3% HI
        unemployment: 0.01,      // 1% UI
        tradeUnion: 0.02,        // 2% Trade Union
    },
};

export interface InsuranceInput {
    /** Monthly gross salary in VND */
    grossSalary: number;
    /** Salary zone (1-4) */
    zone: SalaryZone;
    /** Is the employee an expat? (affects UI eligibility) */
    isExpat?: boolean;
}

export interface InsuranceResult {
    /** Employee contributions */
    employee: {
        socialInsurance: number;
        healthInsurance: number;
        unemployment: number;
        total: number;
    };
    /** Employer contributions */
    employer: {
        socialInsurance: number;
        healthInsurance: number;
        unemployment: number;
        tradeUnion: number;
        total: number;
    };
    /** Total employer cost (gross + employer contributions) */
    totalEmployerCost: number;
    /** Base salary used for calculations (may be capped) */
    baseForSI: number;
    baseForHI: number;
    baseForUI: number;
    /** Explanations of any caps applied */
    notes: string[];
}

export interface GrossToNetInput {
    /** Monthly gross salary in VND */
    grossSalary: number;
    /** Residency status */
    residencyStatus: 'resident' | 'non_resident';
    /** Number of dependents (for residents) */
    dependentsCount: number;
    /** Salary zone for insurance */
    zone: SalaryZone;
    /** Is the employee an expat? */
    isExpat?: boolean;
    /** Use fixed 10% tax rate instead of progressive? */
    useFixed10Percent?: boolean;
}

export interface GrossToNetResult {
    /** Original gross salary */
    gross: number;
    /** Total employee insurance contributions */
    insurance: InsuranceResult['employee'];
    /** PIT amount */
    pit: number;
    /** Take-home pay */
    net: number;
    /** Effective tax rate (PIT / Gross) */
    effectiveRate: number;
    /** Step-by-step breakdown */
    breakdown: BreakdownStep[];
    /** Employer total cost */
    employerCost: number;
}

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
    const baseDeductions = taxpayerDeduction + totalDependentDeduction + input.insuranceContributions;
    const donationInput = Math.max(0, input.charityDonations ?? 0);
    const donationCap = Math.max(0, grossIncome - baseDeductions);
    const charityDeduction = Math.min(donationInput, donationCap);
    const totalDeductions = baseDeductions + charityDeduction;

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

    if (charityDeduction > 0) {
        breakdown.push({
            label: 'Less: Charitable Donations',
            amount: -charityDeduction,
            isDeduction: true,
            formula: `${formatVND(charityDeduction)} (capped at assessable income)`,
            ruleId: 'CHARITABLE_DONATION_DEDUCTION',
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
            ...(charityDeduction > 0 ? ['Charitable donations are made to eligible organizations with proper receipts'] : []),
        ],
        rulesUsed: [
            { ruleId: 'FAMILY_DEDUCTION_TAXPAYER_MONTHLY', citation: taxpayerMeta?.source_refs[0]?.title ?? 'Resolution 110/2025' },
            { ruleId: taxTable.table_id, citation: taxTable.source_refs[0]?.title ?? 'Vietnam Briefing' },
            ...(charityDeduction > 0 ? [{ ruleId: 'CHARITABLE_DONATION_DEDUCTION', citation: 'Circular 111/2013/TT-BTC (charitable deductions)' }] : []),
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

// ==================== INSURANCE CALCULATION ====================

/**
 * Calculate insurance contributions for employee and employer
 */
export function calculateInsurance(input: InsuranceInput): InsuranceResult {
    const notes: string[] = [];

    // Cap calculations
    // SI/HI cap: 20x basic wage
    const siHiCap = BASIC_WAGE_2026 * 20;
    // UI cap: 20x minimum wage for zone
    const uiCap = MINIMUM_WAGES_2026[input.zone] * 20;

    // Base salaries (capped)
    const baseForSI = Math.min(input.grossSalary, siHiCap);
    const baseForHI = Math.min(input.grossSalary, siHiCap);
    const baseForUI = Math.min(input.grossSalary, uiCap);

    if (input.grossSalary > siHiCap) {
        notes.push(`SI/HI capped at ${formatVND(siHiCap)} (20x basic wage)`);
    }
    if (input.grossSalary > uiCap) {
        notes.push(`UI capped at ${formatVND(uiCap)} (20x zone ${input.zone} minimum wage)`);
    }

    // Employee contributions
    const empSI = baseForSI * INSURANCE_RATES.employee.socialInsurance;
    const empHI = baseForHI * INSURANCE_RATES.employee.healthInsurance;
    // Expats are exempt from UI
    const empUI = input.isExpat ? 0 : baseForUI * INSURANCE_RATES.employee.unemployment;

    if (input.isExpat) {
        notes.push('Expat: exempt from unemployment insurance');
    }

    const employeeTotal = empSI + empHI + empUI;

    // Employer contributions
    const erSI = baseForSI * INSURANCE_RATES.employer.socialInsurance;
    const erHI = baseForHI * INSURANCE_RATES.employer.healthInsurance;
    const erUI = input.isExpat ? 0 : baseForUI * INSURANCE_RATES.employer.unemployment;
    const erTU = baseForSI * INSURANCE_RATES.employer.tradeUnion;

    const employerTotal = erSI + erHI + erUI + erTU;

    return {
        employee: {
            socialInsurance: empSI,
            healthInsurance: empHI,
            unemployment: empUI,
            total: employeeTotal,
        },
        employer: {
            socialInsurance: erSI,
            healthInsurance: erHI,
            unemployment: erUI,
            tradeUnion: erTU,
            total: employerTotal,
        },
        totalEmployerCost: input.grossSalary + employerTotal,
        baseForSI,
        baseForHI,
        baseForUI,
        notes,
    };
}

// ==================== GROSS TO NET ====================

/**
 * Convert gross salary to net (take-home pay)
 * This is the main Gross→Net conversion that competitors have
 */
export function grossToNet(input: GrossToNetInput): GrossToNetResult {
    const breakdown: BreakdownStep[] = [];

    // Step 1: Calculate insurance
    const insurance = calculateInsurance({
        grossSalary: input.grossSalary,
        zone: input.zone,
        isExpat: input.isExpat,
    });

    breakdown.push({ label: 'Gross Salary', amount: input.grossSalary });
    breakdown.push({
        label: 'Less: Social Insurance (8%)',
        amount: -insurance.employee.socialInsurance,
        isDeduction: true
    });
    breakdown.push({
        label: 'Less: Health Insurance (1.5%)',
        amount: -insurance.employee.healthInsurance,
        isDeduction: true
    });
    if (!input.isExpat) {
        breakdown.push({
            label: 'Less: Unemployment Insurance (1%)',
            amount: -insurance.employee.unemployment,
            isDeduction: true
        });
    }

    const salaryBeforeTax = input.grossSalary - insurance.employee.total;
    breakdown.push({ label: 'Salary Before Tax', amount: salaryBeforeTax });

    // Step 2: Calculate PIT
    let pit: number;

    if (input.useFixed10Percent) {
        // Fixed 10% rate (for short-term/no contract)
        pit = input.grossSalary * 0.10;
        breakdown.push({
            label: 'PIT @ 10% (Fixed Rate)',
            amount: pit,
            formula: `${formatVND(input.grossSalary)} × 10%`,
        });
    } else {
        // Use standard PIT calculation
        const pitResult = calculatePIT({
            residencyStatus: input.residencyStatus,
            grossSalary: input.grossSalary,
            taxableAllowances: 0,
            dependentsCount: input.dependentsCount,
            insuranceContributions: insurance.employee.total,
        });
        pit = pitResult.monthlyPIT;
        breakdown.push({
            label: `PIT (${input.residencyStatus === 'resident' ? 'Progressive' : 'Flat 20%'})`,
            amount: pit,
        });
    }

    // Step 3: Calculate net
    const net = input.grossSalary - insurance.employee.total - pit;
    breakdown.push({ label: 'Net Salary (Take-home)', amount: net });

    return {
        gross: input.grossSalary,
        insurance: insurance.employee,
        pit,
        net,
        effectiveRate: pit / input.grossSalary,
        breakdown,
        employerCost: insurance.totalEmployerCost,
    };
}

/**
 * Convert net salary to gross
 * Uses binary search to find the gross that produces the target net
 */
export function netToGross(input: Omit<GrossToNetInput, 'grossSalary'> & { netSalary: number }): GrossToNetResult & { iterations: number } {
    const target = input.netSalary;
    let low = target;
    let high = target * 2; // Net is at most ~50% of gross for high earners
    let iterations = 0;
    const maxIterations = 50;
    const tolerance = 1000; // 1,000 VND tolerance

    while (iterations < maxIterations) {
        iterations++;
        const mid = Math.floor((low + high) / 2);

        const result = grossToNet({
            ...input,
            grossSalary: mid,
        });

        if (Math.abs(result.net - target) < tolerance) {
            return { ...result, iterations };
        }

        if (result.net < target) {
            low = mid;
        } else {
            high = mid;
        }
    }

    // Return best estimate after max iterations
    const finalResult = grossToNet({
        ...input,
        grossSalary: Math.floor((low + high) / 2),
    });

    return { ...finalResult, iterations };
}

