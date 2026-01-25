import fs from 'fs';
import path from 'path';

// Define the shape of Firecrawl Search Response (partial)
interface SearchResult {
    title: string;
    url: string;
    description: string;
    published_date?: string;
}

interface SearchResponse {
    success: boolean;
    data: SearchResult[];
}

const FIRECRAWL_API_KEY = process.env.FIRECRAWL_API_KEY;
const LOG_FILE_PATH = path.join(process.cwd(), 'LEGAL_WATCH_LOG.md');

if (!FIRECRAWL_API_KEY) {
    console.error('Error: FIRECRAWL_API_KEY environment variable is not set.');
    process.exit(1);
}

const QUERIES = [
    "Vietnam Personal Income Tax Law amendment 2026",
    "Vietnam new family deduction resolution 2026",
    "Circular 111/2013/TT-BTC update 2025 2026"
];

async function searchFirecrawl(query: string): Promise<SearchResult[]> {
    try {
        const response = await fetch('https://api.firecrawl.dev/v1/search', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${FIRECRAWL_API_KEY}`
            },
            body: JSON.stringify({
                query: query,
                limit: 3,
                lang: "en",
                country: "vn"
            })
        });

        if (!response.ok) {
            console.error(`Failed to fetch for query "${query}": ${response.status} ${response.statusText}`);
            return [];
        }

        const json = await response.json() as SearchResponse;
        if (json.success && Array.isArray(json.data)) {
            return json.data;
        }
        return [];
    } catch (error) {
        console.error(`Error searching for "${query}":`, error);
        return [];
    }
}

async function main() {
    console.log('Starting Legal Watchdog search...');

    let allResults: Record<string, SearchResult> = {};

    for (const query of QUERIES) {
        console.log(`Searching: "${query}"...`);
        const results = await searchFirecrawl(query);
        results.forEach(r => {
            // Deduplicate by URL
            allResults[r.url] = r;
        });
        // Small delay to be nice to API
        await new Promise(resolve => setTimeout(resolve, 1000));
    }

    const uniqueResults = Object.values(allResults);

    if (uniqueResults.length === 0) {
        console.log('No results found.');
        return;
    }

    console.log(`Found ${uniqueResults.length} unique results. Updating log...`);

    const today = new Date().toISOString().split('T')[0];
    let logEntry = `\n## Usage Run: ${today}\n\n`;

    if (uniqueResults.length > 0) {
        logEntry += `Found **${uniqueResults.length}** potential updates:\n\n`;
        uniqueResults.forEach(r => {
            logEntry += `- **[${r.title}](${r.url})**\n`;
            logEntry += `  - ${r.description}\n`;
            if (r.published_date) logEntry += `  - *Date: ${r.published_date}*\n`;
        });
    } else {
        logEntry += "No significant updates found.\n";
    }

    // Append to log file
    if (!fs.existsSync(LOG_FILE_PATH)) {
        fs.writeFileSync(LOG_FILE_PATH, '# Vietnam PIT Legal Watchdog Log\n\nAutomated weekly search results for tax regulation changes.\n');
    }

    fs.appendFileSync(LOG_FILE_PATH, logEntry);
    console.log('Log updated successfully.');
}

main().catch(console.error);
