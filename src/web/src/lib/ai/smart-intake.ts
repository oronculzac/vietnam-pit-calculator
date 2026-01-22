// AI Smart Intake - Extracts calculator inputs from natural language
// Uses Vercel AI SDK with Groq for fast, cost-effective inference

import { generateObject } from 'ai';
import { createGroq } from '@ai-sdk/groq';
import {
    ResidencyIntakeSchema,
    IncomeIntakeSchema,
    AllowanceClassificationSchema,
    WithholdingIntakeSchema,
    RESIDENCY_INTAKE_PROMPT,
    INCOME_INTAKE_PROMPT,
    ALLOWANCE_CLASSIFICATION_PROMPT,
    WITHHOLDING_INTAKE_PROMPT,
    type ResidencyIntake,
    type IncomeIntake,
    type AllowanceClassification,
    type WithholdingIntake,
} from './intake-schemas';

// Initialize Groq client
const groq = createGroq({
    apiKey: process.env.GROQ_API_KEY,
});

// Use Llama 3.3 70B for best quality/speed balance
const MODEL = groq('llama-3.3-70b-versatile');

// ==================== INTAKE FUNCTIONS ====================

/**
 * Extract residency information from natural language
 */
export async function extractResidencyInfo(userMessage: string): Promise<ResidencyIntake> {
    const { object } = await generateObject({
        model: MODEL,
        schema: ResidencyIntakeSchema,
        system: RESIDENCY_INTAKE_PROMPT,
        prompt: userMessage,
    });

    return object;
}

/**
 * Extract income information from natural language
 */
export async function extractIncomeInfo(userMessage: string): Promise<IncomeIntake> {
    const { object } = await generateObject({
        model: MODEL,
        schema: IncomeIntakeSchema,
        system: INCOME_INTAKE_PROMPT,
        prompt: userMessage,
    });

    return object;
}

/**
 * Classify an allowance for tax treatment
 */
export async function classifyAllowance(
    allowanceDescription: string,
    context?: string
): Promise<AllowanceClassification> {
    const prompt = context
        ? `Allowance: ${allowanceDescription}\nContext: ${context}`
        : `Allowance: ${allowanceDescription}`;

    const { object } = await generateObject({
        model: MODEL,
        schema: AllowanceClassificationSchema,
        system: ALLOWANCE_CLASSIFICATION_PROMPT,
        prompt,
    });

    return object;
}

/**
 * Extract withholding scenario information
 */
export async function extractWithholdingInfo(userMessage: string): Promise<WithholdingIntake> {
    const { object } = await generateObject({
        model: MODEL,
        schema: WithholdingIntakeSchema,
        system: WITHHOLDING_INTAKE_PROMPT,
        prompt: userMessage,
    });

    return object;
}

// ==================== BATCH CLASSIFICATION ====================

/**
 * Classify multiple allowances at once
 */
export async function classifyMultipleAllowances(
    allowances: Array<{ description: string; amount: number }>
): Promise<AllowanceClassification[]> {
    const results = await Promise.all(
        allowances.map(a => classifyAllowance(a.description, `Amount: ${a.amount.toLocaleString()} VND`))
    );
    return results;
}

// ==================== CONVERSION TO CALCULATOR INPUT ====================

import type { PITInput, ResidencyInput } from '@/types/calculator';

/**
 * Convert intake to residency calculator input
 */
export function intakeToResidencyInput(intake: ResidencyIntake): ResidencyInput {
    return {
        firstEntryDate: intake.first_entry_date ?? new Date().toISOString().split('T')[0],
        daysPresent: intake.days_in_vietnam_tax_year,
        hasPermanentResidence: intake.has_permanent_residence,
        hasRentalContract183Days: intake.has_rental_contract_183_days,
    };
}

/**
 * Convert intake to PIT calculator input
 */
export function intakeToPITInput(
    intake: IncomeIntake,
    residencyStatus: 'resident' | 'non_resident'
): Omit<PITInput, 'ruleset'> {
    return {
        residencyStatus,
        monthlyGrossSalary: intake.monthly_gross_salary,
        bonuses: intake.bonuses.map(b => ({
            amount: b.amount,
            month: b.month ?? 12,
        })),
        taxableAllowances: intake.allowances
            .filter(a => a.classification === 'taxable' || a.classification === 'uncertain')
            .map(a => ({
                description: a.description,
                amount: a.amount,
            })),
        dependentsCount: intake.dependents_count,
        insuranceContributions: intake.insurance_contributions,
    };
}
