import { ExternalLink, Calendar, FileText, Scale } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { RULE_SOURCES } from "@/lib/constants";

const sourceCategories = [
    {
        title: "Residency Rules",
        icon: Scale,
        sources: [
            {
                ...RULE_SOURCES.RESIDENCY_183_DAY,
                description: "Primary test for determining tax residency status based on physical presence.",
            },
        ],
    },
    {
        title: "Rates & Brackets",
        icon: FileText,
        sources: [
            {
                ...RULE_SOURCES.PROGRESSIVE_BRACKETS,
                description: "2026 progressive tax brackets for resident taxpayers (5% - 35%).",
            },
            {
                ...RULE_SOURCES.NON_RESIDENT_RATE,
                description: "Flat 20% rate for non-resident taxpayers on Vietnam-sourced income.",
            },
        ],
    },
    {
        title: "Family Deductions",
        icon: Calendar,
        sources: [
            {
                ...RULE_SOURCES.FAMILY_DEDUCTION,
                description: "Updated deduction amounts: 15.5M VND for taxpayer, 6.2M VND per dependent.",
            },
        ],
    },
    {
        title: "Withholding Rules",
        icon: FileText,
        sources: [
            {
                ...RULE_SOURCES.WITHHOLDING_10_PERCENT,
                description: "10% withholding for single payments ≥2M VND from individuals without labor contracts.",
            },
        ],
    },
    {
        title: "Exempt Income",
        icon: FileText,
        sources: [
            {
                ...RULE_SOURCES.OVERTIME_EXEMPTION,
                description: "Overtime pay premium (amount exceeding normal rate) is exempt from PIT.",
            },
        ],
    },
];

export default function SourcesPage() {
    return (
        <div className="container mx-auto max-w-4xl px-4 py-12">
            <div className="text-center mb-12">
                <h1 className="text-3xl font-bold mb-4">Legal Basis & Sources</h1>
                <p className="text-muted-foreground max-w-2xl mx-auto">
                    Every calculation in this tool is based on official Vietnamese tax law and regulations.
                    Below are the primary sources we reference.
                </p>
            </div>

            <div className="space-y-8">
                {sourceCategories.map((category) => (
                    <div key={category.title}>
                        <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                            <category.icon className="h-5 w-5 text-green-500" />
                            {category.title}
                        </h2>

                        <div className="space-y-4">
                            {category.sources.map((source) => (
                                <Card key={source.ruleId} className="group">
                                    <CardHeader className="pb-2">
                                        <div className="flex items-start justify-between gap-4">
                                            <div>
                                                <CardTitle className="text-base">{source.ruleName}</CardTitle>
                                                <CardDescription className="mt-1">
                                                    {source.description}
                                                </CardDescription>
                                            </div>
                                            <Badge variant="secondary" className="shrink-0">
                                                <Calendar className="h-3 w-3 mr-1" />
                                                {source.effectiveDate}
                                            </Badge>
                                        </div>
                                    </CardHeader>
                                    <CardContent>
                                        <a
                                            href={source.sourceUrl}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="inline-flex items-center gap-1.5 text-sm text-green-500 hover:text-green-400 transition-colors cursor-pointer"
                                        >
                                            <FileText className="h-4 w-4" />
                                            {source.sourceTitle}
                                            <ExternalLink className="h-3 w-3" />
                                        </a>
                                    </CardContent>
                                </Card>
                            ))}
                        </div>
                    </div>
                ))}
            </div>

            <div className="mt-12 p-6 rounded-lg bg-muted/30 border border-border/50">
                <h3 className="font-semibold mb-2">Additional Resources</h3>
                <ul className="text-sm text-muted-foreground space-y-2">
                    <li>
                        • <a href="https://www.gdt.gov.vn" target="_blank" rel="noopener noreferrer" className="text-green-500 hover:underline cursor-pointer">
                            General Department of Taxation (GDT)
                        </a> — Official government tax authority
                    </li>
                    <li>
                        • <a href="https://english.luatvietnam.vn" target="_blank" rel="noopener noreferrer" className="text-green-500 hover:underline cursor-pointer">
                            LuatVietnam
                        </a> — English translations of Vietnamese law
                    </li>
                </ul>
            </div>
        </div>
    );
}
