// Perplexity Search Integration
// Provides web search fallback when RAG context doesn't answer

const PERPLEXITY_API_URL = 'https://api.perplexity.ai/chat/completions';

export interface SearchResult {
    answer: string;
    citations: Array<{
        url: string;
        title?: string;
    }>;
    searchedAt: string;
}

/**
 * Search the web using Perplexity API
 * Use when local RAG context doesn't have the answer
 */
export async function searchWithPerplexity(query: string): Promise<SearchResult> {
    const apiKey = process.env.PERPLEXITY_API_KEY;

    if (!apiKey) {
        throw new Error('PERPLEXITY_API_KEY not configured');
    }

    const systemPrompt = `You are a Vietnam tax expert assistant. Answer questions about Vietnam Personal Income Tax (PIT) for expats.

Rules:
1. Be accurate and cite sources
2. Focus on 2026 tax rules when applicable
3. If unsure, say so and recommend consulting a tax professional
4. Keep answers concise but complete

Key 2026 Vietnam PIT facts:
- Taxpayer deduction: 15,500,000 VND/month
- Dependent deduction: 6,200,000 VND/month
- Progressive brackets: 5%, 10%, 20%, 30%, 35%
- Non-resident rate: 20% flat
- Residency: 183+ days in Vietnam`;

    const response = await fetch(PERPLEXITY_API_URL, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            model: 'sonar', // Perplexity's search-enabled model
            messages: [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: query },
            ],
            temperature: 0.2,
            max_tokens: 1024,
            return_citations: true,
        }),
    });

    if (!response.ok) {
        const error = await response.text();
        throw new Error(`Perplexity API error: ${error}`);
    }

    const data = await response.json();

    // Extract citations from response
    const citations = data.citations?.map((c: string) => ({
        url: c,
        title: extractDomainFromUrl(c),
    })) ?? [];

    return {
        answer: data.choices[0]?.message?.content ?? 'No answer available.',
        citations,
        searchedAt: new Date().toISOString(),
    };
}

/**
 * Search with context about what the user is doing
 */
export async function searchWithContext(
    query: string,
    context: {
        currentPage?: string;
        residencyStatus?: string;
        calculationResult?: { grossIncome?: number; monthlyPIT?: number };
    }
): Promise<SearchResult> {
    const contextStr = [
        context.currentPage ? `User is on: ${context.currentPage}` : '',
        context.residencyStatus ? `Residency status: ${context.residencyStatus}` : '',
        context.calculationResult?.grossIncome ? `Their gross income: ${context.calculationResult.grossIncome.toLocaleString()} VND` : '',
        context.calculationResult?.monthlyPIT ? `Calculated PIT: ${context.calculationResult.monthlyPIT.toLocaleString()} VND` : '',
    ].filter(Boolean).join('\n');

    const enrichedQuery = contextStr
        ? `${query}\n\nContext:\n${contextStr}`
        : query;

    return searchWithPerplexity(enrichedQuery);
}

function extractDomainFromUrl(url: string): string {
    try {
        const domain = new URL(url).hostname;
        return domain.replace('www.', '');
    } catch {
        return url;
    }
}

/**
 * Check if a query should use web search vs local RAG
 */
export function shouldUseWebSearch(query: string): boolean {
    const webSearchTriggers = [
        'latest', 'current', 'new', 'updated', '2026', '2027',
        'recently', 'now', 'today', 'this year',
        'deadline', 'due date', 'filing',
        'where can', 'how do i file', 'official',
        'register', 'registration', 'application',
    ];

    const lowerQuery = query.toLowerCase();
    return webSearchTriggers.some(trigger => lowerQuery.includes(trigger));
}
