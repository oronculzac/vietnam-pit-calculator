// API Route: Smart Intake - Extract calculator inputs from natural language
import {
    extractResidencyInfo,
    extractIncomeInfo,
    extractWithholdingInfo,
    classifyAllowance,
    intakeToResidencyInput,
    intakeToPITInput,
} from '@/lib/ai/smart-intake';

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { message, type } = body;

        if (!message) {
            return Response.json({ error: 'Message is required' }, { status: 400 });
        }

        switch (type) {
            case 'residency': {
                const intake = await extractResidencyInfo(message);
                const input = intakeToResidencyInput(intake);
                return Response.json({
                    intake,
                    calculatorInput: input,
                    confidence: intake.confidence,
                    missingInfo: intake.missing_info,
                });
            }

            case 'income': {
                const intake = await extractIncomeInfo(message);
                // Can't convert to PITInput without residency status
                return Response.json({
                    intake,
                    confidence: intake.confidence,
                    missingInfo: intake.missing_info,
                    clarifyingQuestions: intake.clarifying_questions,
                });
            }

            case 'withholding': {
                const intake = await extractWithholdingInfo(message);
                return Response.json({
                    intake,
                    missingInfo: intake.missing_info,
                });
            }

            case 'classify_allowance': {
                const { allowance, context } = body;
                if (!allowance) {
                    return Response.json({ error: 'Allowance description required' }, { status: 400 });
                }
                const classification = await classifyAllowance(allowance, context);
                return Response.json({ classification });
            }

            default:
                return Response.json(
                    { error: 'Invalid type. Use: residency, income, withholding, or classify_allowance' },
                    { status: 400 }
                );
        }
    } catch (error) {
        console.error('Intake API error:', error);
        return Response.json(
            { error: 'Failed to process intake' },
            { status: 500 }
        );
    }
}
