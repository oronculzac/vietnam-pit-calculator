// AI Augmentation Layer - Smart Intake
// Uses OpenAI Structured Outputs to extract calculator inputs from natural language

import { z } from 'zod';

// ==================== SCHEMAS FOR STRUCTURED OUTPUTS ====================

/**
 * Schema for extracting residency information from user input
 */
export const ResidencyIntakeSchema = z.object({
    days_in_vietnam_tax_year: z.number()
        .min(0).max(366)
        .describe('Number of days physically present in Vietnam during the current tax year'),

    days_in_12_consecutive_months: z.number()
        .min(0).max(366)
        .optional()
        .describe('Number of days present in any 12 consecutive months from first entry'),

    first_entry_date: z.string()
        .optional()
        .describe('Date of first entry to Vietnam in YYYY-MM-DD format'),

    has_permanent_residence: z.boolean()
        .optional()
        .describe('Whether the person has registered permanent residence in Vietnam'),

    has_rental_contract_183_days: z.boolean()
        .optional()
        .describe('Whether the person has a rental contract for 183 days or more'),

    missing_info: z.array(z.string())
        .describe('List of information that could not be determined from the input'),

    confidence: z.enum(['high', 'medium', 'low'])
        .describe('Confidence level in the extracted information'),
});

export type ResidencyIntake = z.infer<typeof ResidencyIntakeSchema>;

/**
 * Schema for extracting income information from user input
 */
export const IncomeIntakeSchema = z.object({
    monthly_gross_salary: z.number()
        .min(0)
        .describe('Monthly gross salary in VND'),

    currency_mentioned: z.enum(['VND', 'USD', 'EUR', 'other'])
        .default('VND')
        .describe('Currency mentioned by user (convert to VND if possible)'),

    bonuses: z.array(z.object({
        amount: z.number().describe('Bonus amount in VND'),
        month: z.number().min(1).max(12).optional().describe('Month bonus was/will be paid'),
        type: z.string().optional().describe('Type of bonus (annual, performance, etc.)'),
    })).default([])
        .describe('Any bonuses mentioned'),

    allowances: z.array(z.object({
        description: z.string().describe('Description of the allowance'),
        amount: z.number().describe('Amount in VND'),
        classification: z.enum(['taxable', 'exempt', 'uncertain'])
            .describe('Whether this allowance is likely taxable'),
        classification_reason: z.string()
            .describe('Why this classification was chosen'),
    })).default([])
        .describe('Housing, transport, phone, or other allowances'),

    dependents_count: z.number()
        .min(0).max(20)
        .default(0)
        .describe('Number of registered dependents'),

    insurance_contributions: z.number()
        .min(0)
        .default(0)
        .describe('Monthly insurance contributions in VND'),

    overtime_pay: z.object({
        actual_amount: z.number().optional(),
        normal_equivalent: z.number().optional(),
    }).optional()
        .describe('Overtime pay details if mentioned'),

    missing_info: z.array(z.string())
        .describe('List of information that could not be determined'),

    clarifying_questions: z.array(z.string())
        .describe('Questions to ask user for better accuracy'),

    confidence: z.enum(['high', 'medium', 'low'])
        .describe('Overall confidence in extracted information'),
});

export type IncomeIntake = z.infer<typeof IncomeIntakeSchema>;

/**
 * Schema for classifying allowance types
 */
export const AllowanceClassificationSchema = z.object({
    allowance_description: z.string()
        .describe('The allowance as described by user'),

    classification: z.enum(['taxable', 'exempt', 'partially_exempt', 'uncertain'])
        .describe('Tax treatment classification'),

    confidence: z.enum(['high', 'medium', 'low'])
        .describe('Confidence in classification'),

    reasoning: z.string()
        .describe('Why this classification was chosen'),

    evidence_needed: z.array(z.string())
        .describe('What documentation would verify this classification'),

    relevant_rule: z.string()
        .optional()
        .describe('Relevant tax rule or circular reference'),
});

export type AllowanceClassification = z.infer<typeof AllowanceClassificationSchema>;

/**
 * Schema for withholding scenario extraction
 */
export const WithholdingIntakeSchema = z.object({
    has_labor_contract: z.boolean()
        .describe('Whether the person has a formal labor contract'),

    contract_duration_months: z.number()
        .optional()
        .describe('Duration of contract in months'),

    payment_amount: z.number()
        .describe('Payment amount per time in VND'),

    payment_frequency: z.enum(['one_time', 'per_project', 'monthly', 'unknown'])
        .default('unknown')
        .describe('How often payments are made'),

    missing_info: z.array(z.string())
        .describe('Information needed for accurate determination'),
});

export type WithholdingIntake = z.infer<typeof WithholdingIntakeSchema>;

// ==================== SYSTEM PROMPTS ====================

export const RESIDENCY_INTAKE_PROMPT = `You are an assistant helping extract tax residency information for Vietnam PIT calculation.

Extract the following from the user's message:
- Days present in Vietnam during the tax year
- Days present in any 12 consecutive months from first entry
- First entry date to Vietnam
- Whether they have permanent residence
- Whether they have a rental contract >= 183 days

If information is missing, list it in missing_info.
Be conservative - if unsure, mark confidence as 'low'.

Vietnam residency rule: 183 days or more in a calendar year OR in any 12 consecutive months from first arrival.`;

export const INCOME_INTAKE_PROMPT = `You are an assistant helping extract income information for Vietnam PIT calculation.

Extract salary, bonuses, allowances, dependents, and insurance from the user's message.

For allowances, classify each as:
- taxable: Housing cash, transport cash, phone cash allowances are typically taxable
- exempt: Certain in-kind benefits may be exempt
- uncertain: When unclear, mark as uncertain

Important 2026 rules:
- Taxpayer deduction: 15,500,000 VND/month
- Dependent deduction: 6,200,000 VND/month per dependent
- Progressive brackets: 5%, 10%, 20%, 30%, 35%

Ask clarifying questions if critical info is missing.`;

export const ALLOWANCE_CLASSIFICATION_PROMPT = `You are a Vietnam tax expert classifying income allowances.

For each allowance, determine if it's:
- taxable: Cash allowances for housing, transport, phone, etc.
- exempt: Certain regulated in-kind benefits
- partially_exempt: Like overtime (only premium portion exempt)
- uncertain: When rules are unclear

Cite relevant Circular 111/2013 rules when applicable.
Always specify what evidence/documentation would verify the classification.`;

export const WITHHOLDING_INTAKE_PROMPT = `You are extracting information to determine Vietnam 10% withholding requirements.

The 10% withholding applies when:
- No labor contract OR contract < 3 months
- AND payment >= 2,000,000 VND per time

Extract contract status, duration, and payment amount.
If any critical info is missing, list it.`;
