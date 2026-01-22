// Vietnam PIT 2026 Constants
// Source: Resolution 110/2025/UBTVQH15, Baker McKenzie 2026 Summary

import type { RulesetConstants, RuleReference } from '@/types/calculator';

export const VN_PIT_2026: RulesetConstants = {
    rulesetId: 'VN_PIT_2026',
    effectiveFrom: '2026-01-01',
    effectiveTo: null,

    // Family circumstance deductions (effective Jan 1, 2026)
    taxpayerDeduction: 15_500_000, // VND/month
    dependentDeduction: 6_200_000,  // VND/month

    // Progressive tax brackets for residents (5 levels)
    // Applied to monthly assessable income
    brackets: [
        { min: 0, max: 10_000_000, rate: 0.05 },           // 5%
        { min: 10_000_000, max: 30_000_000, rate: 0.10 },  // 10%
        { min: 30_000_000, max: 60_000_000, rate: 0.20 },  // 20%
        { min: 60_000_000, max: 100_000_000, rate: 0.30 }, // 30%
        { min: 100_000_000, max: Infinity, rate: 0.35 },   // 35%
    ],

    // Non-resident flat rate
    nonResidentRate: 0.20, // 20%

    // Short-term/no-contract withholding
    withholdingThreshold: 2_000_000, // VND per payment
    withholdingRate: 0.10, // 10%
};

// Source citations
export const RULE_SOURCES: Record<string, RuleReference> = {
    FAMILY_DEDUCTION: {
        ruleId: 'FAMILY_DEDUCTION_2026',
        ruleName: 'Family Circumstance Deductions',
        effectiveDate: '2026-01-01',
        sourceUrl: 'https://english.luatvietnam.vn/resolution-no-110-2025-ubtvqh15-dated-october-17-2025-of-the-national-assembly-standing-committee-on-adjustment-of-the-family-circumstance-based-ded-418037-doc1.html',
        sourceTitle: 'Resolution 110/2025/UBTVQH15',
    },
    PROGRESSIVE_BRACKETS: {
        ruleId: 'PROGRESSIVE_BRACKETS_2026',
        ruleName: '5-Level Progressive Tax Brackets',
        effectiveDate: '2026-01-01',
        sourceUrl: 'https://www.bakermckenzie.com/-/media/files/insight/publications/2026/01/vietnamtax-administration-pit-and-vat-laws.pdf',
        sourceTitle: 'Baker McKenzie: Vietnam Tax Administration, PIT and VAT Laws',
    },
    RESIDENCY_183_DAY: {
        ruleId: 'RESIDENCY_183_DAY',
        ruleName: '183-Day Residency Test',
        effectiveDate: '2007-01-01',
        sourceUrl: 'https://english.luatvietnam.vn/latest-news/how-to-calculate-personal-income-tax-for-foreigners-and-vietnamese-4727-89683-article.html',
        sourceTitle: 'Law on Personal Income Tax',
    },
    NON_RESIDENT_RATE: {
        ruleId: 'NON_RESIDENT_RATE',
        ruleName: 'Non-Resident Flat Rate',
        effectiveDate: '2007-01-01',
        sourceUrl: 'https://globallawexperts.com/overview-of-the-tax-regime-applicable-to-foreign-experts-in-vietnam-updated-2025/',
        sourceTitle: 'Global Law Experts: Tax Regime for Foreign Experts',
    },
    WITHHOLDING_10_PERCENT: {
        ruleId: 'WITHHOLDING_10_PERCENT',
        ruleName: '10% Withholding for Payments ≥2M VND',
        effectiveDate: '2013-01-01',
        sourceUrl: 'https://www.accaglobal.com/content/dam/acca/global/PDF-students/acca/f6/examdocs/vnm-circular-111-2013-circular-on-personal-income-tax.pdf',
        sourceTitle: 'Circular 111/2013/TT-BTC',
    },
    OVERTIME_EXEMPTION: {
        ruleId: 'OVERTIME_EXEMPTION',
        ruleName: 'Overtime Premium Exemption',
        effectiveDate: '2013-01-01',
        sourceUrl: 'https://www.accaglobal.com/content/dam/acca/global/PDF-students/acca/f6/examdocs/vnm-circular-111-2013-circular-on-personal-income-tax.pdf',
        sourceTitle: 'Circular 111/2013/TT-BTC',
    },
};

// Format VND currency
export function formatVND(amount: number): string {
    return new Intl.NumberFormat('vi-VN', {
        style: 'currency',
        currency: 'VND',
        maximumFractionDigits: 0,
    }).format(amount);
}

// Format percentage
export function formatPercent(rate: number): string {
    return `${(rate * 100).toFixed(0)}%`;
}
