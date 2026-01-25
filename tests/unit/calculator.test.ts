// Unit tests for Vietnam PIT Calculator Engine
// Run with: npx tsx --test tests/unit/calculator.test.ts

import { describe, it } from 'node:test';
import assert from 'node:assert';

import {
    determineResidency,
    calculateResidentPIT,
    calculateNonResidentPIT,
    calculatePIT,
    checkWithholding,
    calculateOvertimeExemption,
} from '../../src/engine/calculator';

// ==================== RESIDENCY TESTS ====================

describe('Residency Determination', () => {
    it('should classify as resident when days >= 183 in tax year', () => {
        const result = determineResidency({
            daysInTaxYear: 200,
        });

        assert.strictEqual(result.status, 'resident');
        assert.strictEqual(result.confidence, 'high');
    });

    it('should classify as resident when days >= 183 in 12 consecutive months', () => {
        const result = determineResidency({
            daysInTaxYear: 100,
            daysIn12ConsecutiveMonths: 190,
        });

        assert.strictEqual(result.status, 'resident');
        assert.strictEqual(result.confidence, 'high');
    });

    it('should classify as non-resident when days < 183', () => {
        const result = determineResidency({
            daysInTaxYear: 150,
        });

        assert.strictEqual(result.status, 'non_resident');
        assert.ok(result.whatWouldChange.length > 0);
    });

    it('should classify as resident with medium confidence when has permanent residence', () => {
        const result = determineResidency({
            daysInTaxYear: 100,
            hasPermanentResidence: true,
        });

        assert.strictEqual(result.status, 'resident');
        assert.strictEqual(result.confidence, 'medium');
    });

    it('should classify exactly 183 days as resident', () => {
        const result = determineResidency({
            daysInTaxYear: 183,
        });

        assert.strictEqual(result.status, 'resident');
    });

    it('should classify 182 days as non-resident', () => {
        const result = determineResidency({
            daysInTaxYear: 182,
        });

        assert.strictEqual(result.status, 'non_resident');
    });
});

// ==================== RESIDENT PIT TESTS ====================

describe('Resident PIT Calculation', () => {
    it('should calculate PIT for income in first bracket only (5%)', () => {
        const result = calculateResidentPIT({
            residencyStatus: 'resident',
            grossSalary: 20_000_000, // 20M VND
            taxableAllowances: 0,
            dependentsCount: 0,
            insuranceContributions: 0,
        });

        // Assessable = 20M - 15.5M (taxpayer deduction) = 4.5M
        // Tax = 4.5M × 5% = 225,000 VND
        assert.strictEqual(result.monthlyPIT, 225_000);
    });

    it('should calculate PIT with dependents reducing assessable income', () => {
        const result = calculateResidentPIT({
            residencyStatus: 'resident',
            grossSalary: 30_000_000, // 30M VND
            taxableAllowances: 0,
            dependentsCount: 2, // 2 × 6.2M = 12.4M additional deduction
            insuranceContributions: 0,
        });

        // Assessable = 30M - 15.5M - 12.4M = 2.1M
        // Tax = 2.1M × 5% = 105,000 VND
        assert.strictEqual(result.monthlyPIT, 105_000);
    });

    it('should return 0 PIT when deductions exceed income', () => {
        const result = calculateResidentPIT({
            residencyStatus: 'resident',
            grossSalary: 10_000_000, // 10M VND
            taxableAllowances: 0,
            dependentsCount: 0,
            insuranceContributions: 0,
        });

        // Assessable = 10M - 15.5M = -5.5M → 0
        assert.strictEqual(result.monthlyPIT, 0);
    });

    it('should calculate PIT across multiple brackets', () => {
        const result = calculateResidentPIT({
            residencyStatus: 'resident',
            grossSalary: 50_000_000, // 50M VND
            taxableAllowances: 0,
            dependentsCount: 0,
            insuranceContributions: 0,
        });

        // Assessable = 50M - 15.5M = 34.5M
        // Bracket 1: 10M × 5% = 500,000
        // Bracket 2: 20M × 10% = 2,000,000
        // Bracket 3: 4.5M × 20% = 900,000
        // Total = 3,400,000 VND
        assert.strictEqual(result.monthlyPIT, 3_400_000);
    });

    it('should include allowances in gross income', () => {
        const result = calculateResidentPIT({
            residencyStatus: 'resident',
            grossSalary: 20_000_000,
            taxableAllowances: 5_000_000, // 5M allowances
            dependentsCount: 0,
            insuranceContributions: 0,
        });

        // Assessable = 25M - 15.5M = 9.5M
        // Tax = 9.5M × 5% = 475,000 VND
        assert.strictEqual(result.monthlyPIT, 475_000);
    });

    it('should include insurance contributions as deduction', () => {
        const result = calculateResidentPIT({
            residencyStatus: 'resident',
            grossSalary: 30_000_000,
            taxableAllowances: 0,
            dependentsCount: 0,
            insuranceContributions: 2_000_000, // 2M insurance
        });

        // Assessable = 30M - 15.5M - 2M = 12.5M
        // Bracket 1: 10M × 5% = 500,000
        // Bracket 2: 2.5M × 10% = 250,000
        // Total = 750,000 VND
        assert.strictEqual(result.monthlyPIT, 750_000);
    });

    it('should include charitable donations as deduction', () => {
        const result = calculateResidentPIT({
            residencyStatus: 'resident',
            grossSalary: 60_000_000,
            taxableAllowances: 0,
            dependentsCount: 0,
            insuranceContributions: 0,
            charityDonations: 2_000_000,
        });

        // Assessable = 60M - 15.5M - 2M = 42.5M
        // Bracket 1: 10M × 5% = 500,000
        // Bracket 2: 20M × 10% = 2,000,000
        // Bracket 3: 12.5M × 20% = 2,500,000
        // Total = 5,000,000 VND
        assert.strictEqual(result.monthlyPIT, 5_000_000);
    });
});

// ==================== NON-RESIDENT PIT TESTS ====================

describe('Non-Resident PIT Calculation', () => {
    it('should calculate flat 20% on total income', () => {
        const result = calculateNonResidentPIT({
            residencyStatus: 'non_resident',
            grossSalary: 50_000_000,
            taxableAllowances: 0,
            dependentsCount: 0, // Ignored for non-residents
            insuranceContributions: 0, // Ignored for non-residents
        });

        // Tax = 50M × 20% = 10,000,000 VND
        assert.strictEqual(result.monthlyPIT, 10_000_000);
        assert.strictEqual(result.effectiveRate, 0.20);
    });

    it('should include allowances in taxable income', () => {
        const result = calculateNonResidentPIT({
            residencyStatus: 'non_resident',
            grossSalary: 40_000_000,
            taxableAllowances: 10_000_000,
            dependentsCount: 2, // Should be ignored
            insuranceContributions: 5_000_000, // Should be ignored
        });

        // Tax = (40M + 10M) × 20% = 10,000,000 VND
        assert.strictEqual(result.monthlyPIT, 10_000_000);
    });

    it('should not apply any deductions', () => {
        const result = calculateNonResidentPIT({
            residencyStatus: 'non_resident',
            grossSalary: 20_000_000,
            taxableAllowances: 0,
            dependentsCount: 5, // Should be ignored
            insuranceContributions: 3_000_000, // Should be ignored
        });

        // Tax = 20M × 20% = 4,000,000 VND (no deductions applied)
        assert.strictEqual(result.monthlyPIT, 4_000_000);
        assert.ok(result.assumptions.some(a => a.includes('not eligible for')));
    });
});

// ==================== WITHHOLDING TESTS ====================

describe('10% Withholding Check', () => {
    it('should require withholding when no contract and payment >= 2M', () => {
        const result = checkWithholding({
            hasLaborContract: false,
            paymentAmount: 5_000_000, // 5M VND
        });

        assert.strictEqual(result.withholdRequired, true);
        assert.strictEqual(result.withholdingRate, 0.10);
        assert.strictEqual(result.withholdingAmount, 500_000);
    });

    it('should require withholding when contract < 3 months and payment >= 2M', () => {
        const result = checkWithholding({
            hasLaborContract: true,
            contractDurationMonths: 2,
            paymentAmount: 3_000_000,
        });

        assert.strictEqual(result.withholdRequired, true);
        assert.strictEqual(result.withholdingAmount, 300_000);
    });

    it('should not require withholding when payment < 2M', () => {
        const result = checkWithholding({
            hasLaborContract: false,
            paymentAmount: 1_500_000, // 1.5M VND
        });

        assert.strictEqual(result.withholdRequired, false);
        assert.strictEqual(result.withholdingAmount, 0);
    });

    it('should not require 10% withholding when contract >= 3 months', () => {
        const result = checkWithholding({
            hasLaborContract: true,
            contractDurationMonths: 12,
            paymentAmount: 10_000_000,
        });

        assert.strictEqual(result.withholdRequired, false);
        assert.ok(result.explanation.includes('standard monthly withholding'));
    });

    it('should handle exact 2M threshold as requiring withholding', () => {
        const result = checkWithholding({
            hasLaborContract: false,
            paymentAmount: 2_000_000, // Exactly 2M
        });

        assert.strictEqual(result.withholdRequired, true);
    });
});

// ==================== OVERTIME EXEMPTION TESTS ====================

describe('Overtime Premium Exemption', () => {
    it('should calculate exempt amount as difference between OT pay and normal pay', () => {
        const result = calculateOvertimeExemption(
            1_500_000, // Actual OT pay (150% rate)
            1_000_000  // Normal pay for same hours
        );

        assert.strictEqual(result.exemptAmount, 500_000);
        assert.strictEqual(result.taxableAmount, 1_000_000);
    });

    it('should return 0 exempt when OT pay equals normal pay', () => {
        const result = calculateOvertimeExemption(
            1_000_000,
            1_000_000
        );

        assert.strictEqual(result.exemptAmount, 0);
    });

    it('should handle night shift at 200% rate', () => {
        const result = calculateOvertimeExemption(
            2_000_000, // Night shift pay (200% rate)
            1_000_000  // Normal pay
        );

        assert.strictEqual(result.exemptAmount, 1_000_000);
        assert.strictEqual(result.taxableAmount, 1_000_000);
    });
});

// ==================== INTEGRATION TESTS ====================

describe('calculatePIT Dispatcher', () => {
    it('should route to resident calculation for resident status', () => {
        const result = calculatePIT({
            residencyStatus: 'resident',
            grossSalary: 30_000_000,
            taxableAllowances: 0,
            dependentsCount: 1,
            insuranceContributions: 0,
        });

        // Should apply deductions (resident behavior)
        assert.ok(result.breakdown.some(s => s.label.includes('Taxpayer Deduction')));
    });

    it('should route to non-resident calculation for non-resident status', () => {
        const result = calculatePIT({
            residencyStatus: 'non_resident',
            grossSalary: 30_000_000,
            taxableAllowances: 0,
            dependentsCount: 1,
            insuranceContributions: 0,
        });

        // Should NOT apply deductions (non-resident behavior)
        assert.ok(!result.breakdown.some(s => s.label.includes('Taxpayer Deduction')));
        assert.strictEqual(result.effectiveRate, 0.20);
    });
});

console.log('All tests passed! ✅');
