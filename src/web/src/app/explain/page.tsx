"use client";

import { useState } from "react";
import { ChevronDown, ExternalLink, MessageCircle, Send, Search } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

const faqs = [
    {
        question: "Why did my tax jump this month?",
        answer: `Your monthly tax can increase due to several factors:

1. **Bonus payments**: If you received a bonus, it's added to your assessable income for that month, pushing you into higher brackets.

2. **Cumulative calculation**: Some employers calculate PIT cumulatively, meaning early months may be taxed lower and later months catch up.

3. **Allowance changes**: If a taxable allowance was added or increased, your assessable income rises.

4. **End-of-year adjustment**: December often includes true-up calculations for the annual liability.`,
        source: "Progressive bracket calculation",
        sourceUrl: "https://www.bakermckenzie.com",
    },
    {
        question: "Is overtime taxed?",
        answer: `**Partially.** According to Circular 111/2013, the **premium portion** of overtime pay is exempt from PIT.

- If your regular rate is 100k VND/hour and overtime pays 150k VND/hour, only 100k is taxed.
- The 50k premium (the extra amount above normal rate) is exempt.

This applies to legally recognized overtime under the Labor Code (nights, weekends, holidays).`,
        source: "Circular 111/2013/TT-BTC",
        sourceUrl: "https://www.accaglobal.com/content/dam/acca/global/PDF-students/acca/f6/examdocs/vnm-circular-111-2013-circular-on-personal-income-tax.pdf",
    },
    {
        question: "Non-resident vs resident — what changes?",
        answer: `**Tax calculation is fundamentally different:**

| Aspect | Resident | Non-resident |
|--------|----------|--------------|
| Rate | Progressive 5%-35% | Flat 20% |
| Deductions | Yes (15.5M + dependents) | No |
| Brackets | 5 levels | N/A |
| Filing | Annual finalization | Withholding only |

**Result:** Residents often pay less tax due to deductions and progressive rates, especially at lower incomes.`,
        source: "Law on Personal Income Tax",
        sourceUrl: "https://english.luatvietnam.vn",
    },
    {
        question: "I'm paid abroad — how is income allocated?",
        answer: `Income allocation depends on your residency status and where work is performed:

**If Resident:**
- All worldwide income is taxable in Vietnam
- Foreign-source income includes work performed abroad
- Double taxation agreements may provide credit

**If Non-resident:**
- Only Vietnam-source income is taxable
- Income for work performed in Vietnam is taxable regardless of where paid
- Days worked in Vietnam × daily rate = Vietnam-source allocation`,
        source: "Tax residency rules",
        sourceUrl: "https://globallawexperts.com",
    },
    {
        question: "How do I register dependents?",
        answer: `To claim the 6.2M VND/month deduction per dependent:

1. **Register at local tax office** with your TIN
2. **Submit Form 20/DK-TNCN** for each dependent
3. **Required documents:**
   - Birth certificate (children)
   - Marriage certificate (spouse)
   - Medical certification (for disabled dependents)
   - Proof of income below 1M VND/month

**Deadline:** Must register before claiming the deduction.`,
        source: "Circular guidance",
        sourceUrl: "https://www.gdt.gov.vn",
    },
];

export default function ExplainPage() {
    const [searchQuery, setSearchQuery] = useState("");
    const [question, setQuestion] = useState("");

    const filteredFaqs = faqs.filter(faq =>
        faq.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
        faq.answer.toLowerCase().includes(searchQuery.toLowerCase())
    );

    // Custom Markdown Components for Table Styling
    const markdownComponents = {
        table: ({ node, ...props }: any) => (
            <div className="my-6 w-full overflow-y-auto rounded-lg border border-border">
                <table className="w-full text-sm" {...props} />
            </div>
        ),
        thead: ({ node, ...props }: any) => (
            <thead className="bg-muted/50 font-medium" {...props} />
        ),
        tbody: ({ node, ...props }: any) => (
            <tbody className="[&_tr:last-child]:border-0" {...props} />
        ),
        tr: ({ node, ...props }: any) => (
            <tr className="border-b transition-colors hover:bg-muted/50" {...props} />
        ),
        th: ({ node, ...props }: any) => (
            <th className="h-10 px-4 text-left align-middle font-medium text-muted-foreground" {...props} />
        ),
        td: ({ node, ...props }: any) => (
            <td className="p-4 align-middle" {...props} />
        ),
        strong: ({ node, ...props }: any) => (
            <span className="font-semibold text-foreground" {...props} />
        ),
        ul: ({ node, ...props }: any) => (
            <ul className="my-2 ml-6 list-disc [&>li]:mt-1" {...props} />
        ),
        ol: ({ node, ...props }: any) => (
            <ol className="my-2 ml-6 list-decimal [&>li]:mt-1" {...props} />
        )
    };

    return (
        <div className="container mx-auto max-w-3xl px-4 py-12">
            <div className="text-center mb-8">
                <h1 className="text-3xl font-bold mb-4">Frequently Asked Questions</h1>
                <p className="text-muted-foreground mb-8">
                    Common questions about Vietnam PIT, with answers backed by legal sources.
                </p>

                {/* Search Bar */}
                <div className="relative max-w-md mx-auto">
                    <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="Search FAQs..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-9 bg-background/50 backdrop-blur-sm"
                    />
                </div>
            </div>

            {/* FAQ Accordion */}
            {filteredFaqs.length > 0 ? (
                <Accordion type="single" collapsible className="space-y-4">
                    {filteredFaqs.map((faq, index) => (
                        <AccordionItem key={index} value={`item-${index}`} className="border rounded-lg px-4 bg-card/50">
                            <AccordionTrigger className="text-left hover:no-underline cursor-pointer py-4">
                                <span className="font-medium text-lg">{faq.question}</span>
                            </AccordionTrigger>
                            <AccordionContent>
                                <div className="pt-2 pb-4">
                                    <div className="text-base leading-7 text-muted-foreground mb-4">
                                        <ReactMarkdown
                                            remarkPlugins={[remarkGfm]}
                                            components={markdownComponents}
                                        >
                                            {faq.answer}
                                        </ReactMarkdown>
                                    </div>
                                    <a
                                        href={faq.sourceUrl}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="inline-flex items-center gap-2 group cursor-pointer"
                                    >
                                        <Badge variant="outline" className="group-hover:bg-green-500/10 group-hover:text-green-500 group-hover:border-green-500/50 transition-colors">
                                            Source: {faq.source}
                                            <ExternalLink className="h-3 w-3 ml-1" />
                                        </Badge>
                                    </a>
                                </div>
                            </AccordionContent>
                        </AccordionItem>
                    ))}
                </Accordion>
            ) : (
                <div className="text-center py-12 text-muted-foreground">
                    <p>No questions found matching "{searchQuery}"</p>
                    <Button variant="link" onClick={() => setSearchQuery("")} className="mt-2 text-green-500">
                        Clear search
                    </Button>
                </div>
            )}

            {/* AI Chat Section */}
            <Card className="mt-12 border-dashed bg-muted/20">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-lg">
                        <MessageCircle className="h-5 w-5 text-green-500" />
                        Still have questions?
                    </CardTitle>
                    <CardDescription>
                        Ask our AI agent about specific scenarios (coming soon)
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="flex gap-2">
                        <Input
                            placeholder="e.g., How is housing allowance taxed?"
                            value={question}
                            onChange={(e) => setQuestion(e.target.value)}
                            disabled
                            className="flex-1"
                        />
                        <Button disabled className="gap-2 cursor-pointer">
                            <Send className="h-4 w-4" />
                            Ask
                        </Button>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
