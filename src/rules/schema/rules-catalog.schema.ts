// Zod schemas for Vietnam PIT Rules Catalog validation
// These schemas ensure type safety and runtime validation for all rule data

import { z } from 'zod';

// ==================== SOURCE REFERENCES ====================

export const SourceRefSchema = z.object({
    title: z.string().describe('Title of the source document'),
    ref: z.string().describe('Reference identifier or URL'),
    url: z.string().url().optional().describe('Direct URL if available'),
});

export type SourceRef = z.infer<typeof SourceRefSchema>;

// ==================== RULESETS ====================

export const RulesetSchema = z.object({
    ruleset_id: z.string().describe('Unique identifier, e.g., VN_PIT_2026'),
    jurisdiction: z.string().default('VN').describe('Country/jurisdiction code'),
    label: z.string().describe('Human-readable label'),
    effective_from: z.string().date().describe('Start date (YYYY-MM-DD)'),
    effective_to: z.string().date().nullable().describe('End date or null if current'),
    notes: z.string().optional().describe('Additional context'),
    source_refs: z.array(SourceRefSchema).describe('Citation sources'),
});

export type Ruleset = z.infer<typeof RulesetSchema>;

// ==================== CONSTANTS ====================

export const ConstantSchema = z.object({
    key: z.string().describe('Constant identifier, e.g., FAMILY_DEDUCTION_TAXPAYER_MONTHLY'),
    value: z.number().describe('Numeric value'),
    unit: z.enum(['VND', 'USD', 'percent', 'days', 'months']).describe('Unit of measure'),
    effective_from: z.string().date().describe('Start date'),
    effective_to: z.string().date().nullable().describe('End date or null'),
    notes: z.string().optional().describe('Explanation'),
    source_refs: z.array(SourceRefSchema).describe('Citation sources'),
});

export type Constant = z.infer<typeof ConstantSchema>;

// ==================== TAX TABLES ====================

export const TaxBracketSchema = z.object({
    min_inclusive: z.number().optional().describe('Minimum income (inclusive)'),
    min_exclusive: z.number().optional().describe('Minimum income (exclusive)'),
    max_inclusive: z.number().nullable().describe('Maximum income (inclusive), null for top bracket'),
    rate: z.number().min(0).max(1).describe('Tax rate as decimal (0-1)'),
});

export type TaxBracket = z.infer<typeof TaxBracketSchema>;

export const TaxTableSchema = z.object({
    table_id: z.string().describe('Unique table identifier'),
    scope: z.enum([
        'resident_employment_income',
        'nonresident_employment_income',
        'business_income',
        'capital_gains',
        'other',
    ]).describe('What income type this table applies to'),
    basis: z.enum(['month', 'year', 'transaction']).describe('Assessment period'),
    currency: z.string().default('VND').describe('Currency code'),
    effective_from: z.string().date().describe('Start date'),
    effective_to: z.string().date().nullable().describe('End date or null'),
    notes: z.string().optional().describe('Table description'),
    brackets: z.array(TaxBracketSchema).describe('Progressive or flat brackets'),
    source_refs: z.array(SourceRefSchema).describe('Citation sources'),
});

export type TaxTable = z.infer<typeof TaxTableSchema>;

// ==================== DECISION RULES ====================

export const RuleInputSchema = z.object({
    name: z.string().describe('Input parameter name'),
    type: z.enum(['integer', 'number', 'boolean', 'string', 'date']).describe('Data type'),
    required: z.boolean().default(true).describe('Whether input is required'),
});

export const RuleOutputSchema = z.object({
    name: z.string().describe('Output parameter name'),
    type: z.enum(['integer', 'number', 'boolean', 'string', 'enum']).describe('Data type'),
    values: z.array(z.string()).optional().describe('Enum values if type is enum'),
});

export const DecisionRuleSchema = z.object({
    rule_id: z.string().describe('Unique rule identifier'),
    effective_from: z.string().date().describe('Start date'),
    effective_to: z.string().date().nullable().describe('End date or null'),
    inputs: z.array(RuleInputSchema).describe('Required inputs'),
    outputs: z.array(RuleOutputSchema).describe('Computed outputs'),
    logic: z.string().describe('Pseudocode logic description'),
    notes: z.string().optional().describe('Implementation notes'),
    source_refs: z.array(SourceRefSchema).describe('Citation sources'),
});

export type DecisionRule = z.infer<typeof DecisionRuleSchema>;

// ==================== EXEMPTIONS ====================

export const ExemptionSchema = z.object({
    exemption_id: z.string().describe('Unique exemption identifier'),
    effective_from: z.string().date().describe('Start date'),
    effective_to: z.string().date().nullable().describe('End date or null'),
    inputs: z.array(RuleInputSchema).describe('Required inputs'),
    outputs: z.array(RuleOutputSchema).describe('Computed outputs'),
    calculation: z.string().describe('Calculation formula'),
    conditions: z.string().describe('When this exemption applies'),
    source_refs: z.array(SourceRefSchema).describe('Citation sources'),
});

export type Exemption = z.infer<typeof ExemptionSchema>;

// ==================== GLOSSARY ====================

export const GlossaryTermSchema = z.object({
    term: z.string().describe('Term to define'),
    definition: z.string().describe('Plain language definition'),
    notes: z.string().optional().describe('Additional context'),
});

export type GlossaryTerm = z.infer<typeof GlossaryTermSchema>;

// ==================== VALIDATION RULES ====================

export const ValidationRuleSchema = z.object({
    validation_id: z.string().describe('Unique validation identifier'),
    applies_to: z.string().describe('What this validation applies to'),
    rule: z.string().describe('Validation logic'),
});

export type ValidationRule = z.infer<typeof ValidationRuleSchema>;

// ==================== COMPLETE RULES CATALOG ====================

export const RulesCatalogSchema = z.object({
    rulesets: z.array(RulesetSchema).describe('Available rule versions'),
    constants: z.array(ConstantSchema).describe('Tax constants (deductions, thresholds)'),
    tax_tables: z.array(TaxTableSchema).describe('Progressive/flat tax tables'),
    decision_rules: z.array(DecisionRuleSchema).describe('Logic rules (residency, withholding)'),
    exemptions: z.array(ExemptionSchema).describe('Tax exemption rules'),
    glossary: z.array(GlossaryTermSchema).describe('Term definitions'),
    validation_rules: z.array(ValidationRuleSchema).describe('Input validation rules'),
});

export type RulesCatalog = z.infer<typeof RulesCatalogSchema>;

// ==================== HELPER FUNCTIONS ====================

/**
 * Validate a rules catalog JSON against the schema
 */
export function validateRulesCatalog(data: unknown): RulesCatalog {
    return RulesCatalogSchema.parse(data);
}

/**
 * Safe validation that returns errors instead of throwing
 */
export function safeValidateRulesCatalog(data: unknown): { success: true; data: RulesCatalog } | { success: false; error: z.ZodError } {
    const result = RulesCatalogSchema.safeParse(data);
    if (result.success) {
        return { success: true, data: result.data };
    }
    return { success: false, error: result.error };
}
