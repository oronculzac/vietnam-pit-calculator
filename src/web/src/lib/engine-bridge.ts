// Bridge to the deterministic calculator engine
// Exposes Gross-to-Net functions for the web UI

// ==================== TYPES ====================

/**
 * Vietnam salary zones (affects insurance caps)
 * Zone 1: HCMC, Hanoi urban districts
 * Zone 2: Suburban areas of major cities
 * Zone 3: Provincial cities
 * Zone 4: Rural areas
 */
export type SalaryZone = 1 | 2 | 3 | 4;

// ==================== ZONE & INSURANCE CONSTANTS ====================

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

export interface InsuranceResult {
    employee: {
        socialInsurance: number;
        healthInsurance: number;
        unemployment: number;
        total: number;
    };
    employer: {
        socialInsurance: number;
        healthInsurance: number;
        unemployment: number;
        tradeUnion: number;
        total: number;
    };
    totalEmployerCost: number;
    notes: string[];
}

export interface GrossToNetResult {
    gross: number;
    insurance: InsuranceResult['employee'];
    pit: number;
    net: number;
    effectiveRate: number;
    employerCost: number;
}

// ==================== FUNCTIONS ====================

/**
 * Calculate insurance contributions
 */
export function calculateInsurance(
    grossSalary: number,
    zone: SalaryZone,
    isExpat: boolean = true
): InsuranceResult {
    const notes: string[] = [];

    // Cap calculations
    const siHiCap = BASIC_WAGE_2026 * 20;
    const uiCap = MINIMUM_WAGES_2026[zone] * 20;

    // Base salaries (capped)
    const baseForSI = Math.min(grossSalary, siHiCap);
    const baseForHI = Math.min(grossSalary, siHiCap);
    const baseForUI = Math.min(grossSalary, uiCap);

    if (grossSalary > siHiCap) {
        notes.push(`SI/HI capped at ${formatVND(siHiCap)}`);
    }
    if (grossSalary > uiCap) {
        notes.push(`UI capped at ${formatVND(uiCap)}`);
    }

    // Employee contributions
    const empSI = baseForSI * INSURANCE_RATES.employee.socialInsurance;
    const empHI = baseForHI * INSURANCE_RATES.employee.healthInsurance;
    const empUI = isExpat ? 0 : baseForUI * INSURANCE_RATES.employee.unemployment;

    if (isExpat) {
        notes.push('Expat: exempt from unemployment insurance');
    }

    const employeeTotal = empSI + empHI + empUI;

    // Employer contributions
    const erSI = baseForSI * INSURANCE_RATES.employer.socialInsurance;
    const erHI = baseForHI * INSURANCE_RATES.employer.healthInsurance;
    const erUI = isExpat ? 0 : baseForUI * INSURANCE_RATES.employer.unemployment;
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
        totalEmployerCost: grossSalary + employerTotal,
        notes,
    };
}

/**
 * Convert gross salary to net (take-home pay)
 */
export function grossToNet(
    grossSalary: number,
    residencyStatus: 'resident' | 'non_resident',
    dependentsCount: number,
    zone: SalaryZone,
    isExpat: boolean = true,
    taxpayerDeduction: number = 15_500_000,
    dependentDeduction: number = 6_200_000,
    brackets: Array<{ min: number; max: number; rate: number }>
): GrossToNetResult {
    // Step 1: Calculate insurance
    const insurance = calculateInsurance(grossSalary, zone, isExpat);

    // Step 2: Calculate PIT
    let pit: number;

    if (residencyStatus === 'non_resident') {
        // Flat 20%
        pit = grossSalary * 0.20;
    } else {
        // Progressive calculation
        const totalDeductions = taxpayerDeduction + (dependentsCount * dependentDeduction) + insurance.employee.total;
        const assessableIncome = Math.max(0, grossSalary - totalDeductions);

        let tax = 0;
        let remaining = assessableIncome;

        for (const bracket of brackets) {
            if (remaining <= 0) break;
            const bracketSize = bracket.max === Infinity ? remaining : Math.min(remaining, bracket.max - bracket.min);
            tax += bracketSize * bracket.rate;
            remaining -= bracketSize;
        }

        pit = tax;
    }

    // Step 3: Calculate net
    const net = grossSalary - insurance.employee.total - pit;

    return {
        gross: grossSalary,
        insurance: insurance.employee,
        pit,
        net,
        effectiveRate: grossSalary > 0 ? pit / grossSalary : 0,
        employerCost: insurance.totalEmployerCost,
    };
}

/**
 * Convert net salary to gross (binary search)
 */
export function netToGross(
    targetNet: number,
    residencyStatus: 'resident' | 'non_resident',
    dependentsCount: number,
    zone: SalaryZone,
    isExpat: boolean = true,
    taxpayerDeduction: number = 15_500_000,
    dependentDeduction: number = 6_200_000,
    brackets: Array<{ min: number; max: number; rate: number }>
): GrossToNetResult & { iterations: number } {
    let low = targetNet;
    let high = targetNet * 2;
    let iterations = 0;
    const maxIterations = 50;
    const tolerance = 1000;

    while (iterations < maxIterations) {
        iterations++;
        const mid = Math.floor((low + high) / 2);

        const result = grossToNet(mid, residencyStatus, dependentsCount, zone, isExpat, taxpayerDeduction, dependentDeduction, brackets);

        if (Math.abs(result.net - targetNet) < tolerance) {
            return { ...result, iterations };
        }

        if (result.net < targetNet) {
            low = mid;
        } else {
            high = mid;
        }
    }

    const finalResult = grossToNet(Math.floor((low + high) / 2), residencyStatus, dependentsCount, zone, isExpat, taxpayerDeduction, dependentDeduction, brackets);
    return { ...finalResult, iterations };
}

function formatVND(amount: number): string {
    return new Intl.NumberFormat('vi-VN', {
        style: 'currency',
        currency: 'VND',
        maximumFractionDigits: 0,
    }).format(amount);
}
