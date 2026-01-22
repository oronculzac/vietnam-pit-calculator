// Calculator type definitions for Vietnam PIT Calculator
// These types define the API contract between the UI and the deterministic engine

// ==================== RESIDENCY ====================

export interface ResidencyInput {
    /** Date of first entry to Vietnam (ISO format) */
    firstEntryDate: string;
    /** Total days present in Vietnam within the tax year */
    daysPresent: number;
    /** Has registered permanent residence in Vietnam */
    hasPermanentResidence?: boolean;
    /** Has rental contract >= 183 days */
    hasRentalContract183Days?: boolean;
}

export type ResidencyStatus = 'resident' | 'non_resident' | 'uncertain';
export type ConfidenceLevel = 'high' | 'medium' | 'low';

export interface ResidencyResult {
    status: ResidencyStatus;
    confidence: ConfidenceLevel;
    /** Factors that contributed to this determination */
    factors: string[];
    /** What could change this result */
    whatWouldChange: string[];
    /** Rules used in determination */
    rulesUsed: RuleReference[];
}

// ==================== PIT CALCULATION ====================

export interface BonusPayment {
    /** Bonus amount in VND */
    amount: number;
    /** Month paid (1-12) */
    month: number;
}

export type Bonus = BonusPayment;

export interface TaxableAllowance {
    /** Description of the allowance */
    description: string;
    /** Amount in VND */
    amount: number;
}

export interface PITInput {
    /** Ruleset version (e.g., 'VN_PIT_2026') */
    ruleset: string;
    /** Tax residency status */
    residencyStatus: 'resident' | 'non_resident';
    /** Monthly gross salary in VND */
    monthlyGrossSalary: number;
    /** Bonus payments during the year */
    bonuses: BonusPayment[];
    /** Taxable allowances */
    taxableAllowances: TaxableAllowance[];
    /** Number of registered dependents */
    dependentsCount: number;
    /** Monthly insurance contributions in VND */
    insuranceContributions: number;
    /** Optional charity donations in VND */
    charityDonations?: number;
}

export interface BreakdownStep {
    /** Step label (e.g., "Gross Income", "Less: Deductions") */
    label: string;
    /** Amount in VND */
    amount: number;
    /** Formula used (e.g., "15,500,000 × 1") */
    formula?: string;
    /** Rule ID for citation */
    ruleId?: string;
    /** Whether this is a subtraction */
    isDeduction?: boolean;
}

export interface RuleReference {
    /** Unique rule identifier */
    ruleId: string;
    /** Human-readable rule name */
    ruleName: string;
    /** When the rule took effect */
    effectiveDate: string;
    /** URL to primary source */
    sourceUrl: string;
    /** Title of the source document */
    sourceTitle: string;
}

export interface PITResult {
    /** Monthly PIT in VND */
    monthlyPIT: number;
    /** Annualized PIT in VND */
    annualizedPIT: number;
    /** Effective tax rate (0-1) */
    effectiveRate: number;
    /** Step-by-step calculation breakdown */
    breakdown: BreakdownStep[];
    /** Assumptions made during calculation */
    assumptions: string[];
    /** Rules used with citations */
    rulesUsed: RuleReference[];
}

// ==================== WITHHOLDING ====================

export interface WithholdingInput {
    /** Payment amount per time in VND */
    paymentAmount: number;
    /** Contract type */
    contractType: 'labor_contract' | 'service_contract' | 'no_contract';
    /** Contract duration in months (0 for no contract) */
    durationMonths: number;
}

export interface WithholdingResult {
    /** Whether 10% withholding is required */
    withholdingRequired: boolean;
    /** Withholding rate (0.10 or 0) */
    withholdingRate: number;
    /** Withholding amount in VND */
    withholdingAmount: number;
    /** Explanation of the determination */
    explanation: string;
    /** Rule reference */
    ruleUsed: RuleReference;
}

// ==================== TAX BRACKETS ====================

export interface TaxBracket {
    /** Minimum income for this bracket (inclusive) */
    min: number;
    /** Maximum income for this bracket (exclusive, Infinity for top) */
    max: number;
    /** Tax rate for this bracket (0-1) */
    rate: number;
}

export interface RulesetConstants {
    /** Ruleset identifier */
    rulesetId: string;
    /** Effective from date */
    effectiveFrom: string;
    /** Effective to date (null if current) */
    effectiveTo: string | null;
    /** Taxpayer deduction per month in VND */
    taxpayerDeduction: number;
    /** Dependent deduction per month in VND */
    dependentDeduction: number;
    /** Progressive tax brackets for residents */
    brackets: TaxBracket[];
    /** Flat rate for non-residents */
    nonResidentRate: number;
    /** Threshold for 10% withholding */
    withholdingThreshold: number;
    /** Withholding rate */
    withholdingRate: number;
}
