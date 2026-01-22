// Mock calculator functions for UI development
// These will be replaced with real engine imports when Phase 3 is complete

import type {
    ResidencyInput,
    ResidencyResult,
    PITInput,
    PITResult,
    WithholdingInput,
    WithholdingResult,
    BreakdownStep,
} from '@/types/calculator';
import { VN_PIT_2026, RULE_SOURCES } from './constants';

/**
 * Mock residency determination
 * Replace with real engine when available
 */
export function mockDetermineResidency(input: ResidencyInput): ResidencyResult {
    const { daysPresent, hasPermanentResidence, hasRentalContract183Days } = input;

    // Simple 183-day rule implementation
    if (daysPresent >= 183) {
        return {
            status: 'resident',
            confidence: 'high',
            factors: [
                `Present in Vietnam for ${daysPresent} days (≥183 days)`,
            ],
            whatWouldChange: [
                'No change possible - already met 183-day threshold',
            ],
            rulesUsed: [RULE_SOURCES.RESIDENCY_183_DAY],
        };
    }

    // Edge case: permanent residence or rental contract
    if (hasPermanentResidence || hasRentalContract183Days) {
        return {
            status: 'resident',
            confidence: 'medium',
            factors: [
                `Present for ${daysPresent} days (<183 days)`,
                hasPermanentResidence ? 'Has registered permanent residence' : '',
                hasRentalContract183Days ? 'Has rental contract ≥183 days' : '',
            ].filter(Boolean),
            whatWouldChange: [
                'If permanent residence or rental situation changes',
            ],
            rulesUsed: [RULE_SOURCES.RESIDENCY_183_DAY],
        };
    }

    // Clear non-resident
    if (daysPresent < 183) {
        return {
            status: 'non_resident',
            confidence: daysPresent < 150 ? 'high' : 'medium',
            factors: [
                `Present in Vietnam for ${daysPresent} days (<183 days)`,
                'No permanent residence registered',
                'No long-term rental contract',
            ],
            whatWouldChange: [
                `Need ${183 - daysPresent} more days to become resident`,
                'Register permanent residence',
                'Sign rental contract ≥183 days',
            ],
            rulesUsed: [RULE_SOURCES.RESIDENCY_183_DAY],
        };
    }

    return {
        status: 'uncertain',
        confidence: 'low',
        factors: ['Insufficient information'],
        whatWouldChange: ['Provide more details about presence and housing'],
        rulesUsed: [RULE_SOURCES.RESIDENCY_183_DAY],
    };
}

/**
 * Mock PIT calculation for residents
 * Replace with real engine when available
 */
export function mockCalculatePIT(input: PITInput): PITResult {
    const {
        residencyStatus,
        monthlyGrossSalary,
        bonuses,
        taxableAllowances,
        dependentsCount,
        insuranceContributions,
    } = input;

    // Non-resident: flat 20%
    if (residencyStatus === 'non_resident') {
        const totalAllowances = taxableAllowances.reduce((sum, a) => sum + a.amount, 0);
        const taxableIncome = monthlyGrossSalary + totalAllowances;
        const monthlyPIT = taxableIncome * VN_PIT_2026.nonResidentRate;

        return {
            monthlyPIT,
            annualizedPIT: monthlyPIT * 12,
            effectiveRate: VN_PIT_2026.nonResidentRate,
            breakdown: [
                { label: 'Gross Salary', amount: monthlyGrossSalary },
                { label: 'Taxable Allowances', amount: totalAllowances },
                { label: 'Taxable Income', amount: taxableIncome },
                { label: 'PIT @ 20% (Non-resident)', amount: monthlyPIT, ruleId: 'NON_RESIDENT_RATE' },
            ],
            assumptions: [
                'All income is Vietnam-sourced',
                'All allowances are taxable',
                'Non-residents are not eligible for deductions',
            ],
            rulesUsed: [RULE_SOURCES.NON_RESIDENT_RATE],
        };
    }

    // Resident: progressive calculation
    const totalAllowances = taxableAllowances.reduce((sum, a) => sum + a.amount, 0);
    const grossIncome = monthlyGrossSalary + totalAllowances;

    // Deductions
    const taxpayerDeduction = VN_PIT_2026.taxpayerDeduction;
    const dependentDeduction = dependentsCount * VN_PIT_2026.dependentDeduction;
    const totalDeductions = taxpayerDeduction + dependentDeduction + insuranceContributions;

    // Assessable income
    const assessableIncome = Math.max(0, grossIncome - totalDeductions);

    // Progressive tax calculation
    const breakdown: BreakdownStep[] = [
        { label: 'Gross Salary', amount: monthlyGrossSalary },
        { label: 'Taxable Allowances', amount: totalAllowances },
        { label: 'Total Gross Income', amount: grossIncome },
        {
            label: 'Less: Taxpayer Deduction',
            amount: -taxpayerDeduction,
            isDeduction: true,
            ruleId: 'FAMILY_DEDUCTION_2026',
            formula: `${VN_PIT_2026.taxpayerDeduction.toLocaleString()} VND/month`,
        },
    ];

    if (dependentsCount > 0) {
        breakdown.push({
            label: `Less: Dependent Deduction (${dependentsCount} × ${VN_PIT_2026.dependentDeduction.toLocaleString()})`,
            amount: -dependentDeduction,
            isDeduction: true,
            ruleId: 'FAMILY_DEDUCTION_2026',
        });
    }

    if (insuranceContributions > 0) {
        breakdown.push({
            label: 'Less: Insurance Contributions',
            amount: -insuranceContributions,
            isDeduction: true,
        });
    }

    breakdown.push({ label: 'Assessable Income', amount: assessableIncome });

    // Calculate tax by brackets
    let remainingIncome = assessableIncome;
    let totalTax = 0;

    for (const bracket of VN_PIT_2026.brackets) {
        if (remainingIncome <= 0) break;

        const bracketWidth = bracket.max - bracket.min;
        const taxableInBracket = Math.min(remainingIncome, bracketWidth);
        const taxInBracket = taxableInBracket * bracket.rate;

        if (taxableInBracket > 0) {
            breakdown.push({
                label: `Tax @ ${(bracket.rate * 100).toFixed(0)}% (${bracket.min.toLocaleString()} - ${bracket.max === Infinity ? '∞' : bracket.max.toLocaleString()})`,
                amount: taxInBracket,
                formula: `${taxableInBracket.toLocaleString()} × ${(bracket.rate * 100).toFixed(0)}%`,
                ruleId: 'PROGRESSIVE_BRACKETS_2026',
            });
        }

        totalTax += taxInBracket;
        remainingIncome -= taxableInBracket;
    }

    breakdown.push({ label: 'Monthly PIT', amount: totalTax });

    const effectiveRate = grossIncome > 0 ? totalTax / grossIncome : 0;

    return {
        monthlyPIT: totalTax,
        annualizedPIT: totalTax * 12,
        effectiveRate,
        breakdown,
        assumptions: [
            'All allowances are taxable unless specified exempt',
            'Insurance contributions are mandatory social insurance',
            'Dependents are properly registered',
            'No charitable donations applied',
        ],
        rulesUsed: [
            RULE_SOURCES.FAMILY_DEDUCTION,
            RULE_SOURCES.PROGRESSIVE_BRACKETS,
        ],
    };
}

/**
 * Mock withholding determination
 */
export function mockCheckWithholding(input: WithholdingInput): WithholdingResult {
    const { paymentAmount, contractType, durationMonths } = input;

    // 10% withholding applies when:
    // - No labor contract OR contract < 3 months
    // - Payment >= 2,000,000 VND
    const noLongContract = contractType === 'no_contract' ||
        (contractType === 'service_contract' && durationMonths < 3);

    const withholdingRequired = noLongContract && paymentAmount >= VN_PIT_2026.withholdingThreshold;

    return {
        withholdingRequired,
        withholdingRate: withholdingRequired ? VN_PIT_2026.withholdingRate : 0,
        withholdingAmount: withholdingRequired ? paymentAmount * VN_PIT_2026.withholdingRate : 0,
        explanation: withholdingRequired
            ? `Payment of ${paymentAmount.toLocaleString()} VND requires 10% withholding (≥2M VND with no/short-term contract)`
            : paymentAmount < VN_PIT_2026.withholdingThreshold
                ? `Payment below ${VN_PIT_2026.withholdingThreshold.toLocaleString()} VND threshold - no withholding required`
                : 'Long-term labor contract exists - standard monthly withholding applies instead',
        ruleUsed: RULE_SOURCES.WITHHOLDING_10_PERCENT,
    };
}
