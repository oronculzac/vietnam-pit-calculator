// API Route: Explain endpoint with streaming
import { streamExplanation, generateExplanation, getFAQAnswer } from '@/lib/ai/rag-explainer';

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { question, context, stream = false } = body;

        if (!question) {
            return Response.json({ error: 'Question is required' }, { status: 400 });
        }

        // Check FAQ first for instant response
        const faqAnswer = getFAQAnswer(question);
        if (faqAnswer) {
            return Response.json({
                answer: faqAnswer,
                source: 'faq',
                cached: true
            });
        }

        // Generate with AI
        if (stream) {
            // Return streaming response
            const result = streamExplanation({ question, calculationContext: context });
            return result.toTextStreamResponse();
        } else {
            // Return complete response
            const answer = await generateExplanation({ question, calculationContext: context });
            return Response.json({
                answer,
                source: 'ai',
                cached: false
            });
        }
    } catch (error) {
        console.error('Explain API error:', error);
        return Response.json(
            { error: 'Failed to generate explanation' },
            { status: 500 }
        );
    }
}
