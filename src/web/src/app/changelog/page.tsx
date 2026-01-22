import { Calendar, ArrowUp, ArrowDown, Minus, ExternalLink } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface ChangeItem {
    type: "increase" | "decrease" | "change";
    text: string;
}

interface ChangelogEntry {
    date: string;
    title: string;
    source: string;
    sourceUrl: string;
    changes: ChangeItem[];
}

const changelog: ChangelogEntry[] = [
    {
        date: "2026-01-01",
        title: "Resolution 110/2025/UBTVQH15 — Family Deductions Updated",
        source: "National Assembly Standing Committee",
        sourceUrl: "https://english.luatvietnam.vn/resolution-no-110-2025-ubtvqh15-dated-october-17-2025-of-the-national-assembly-standing-committee-on-adjustment-of-the-family-circumstance-based-ded-418037-doc1.html",
        changes: [
            { type: "increase", text: "Taxpayer deduction: 11M → 15.5M VND/month (+40.9%)" },
            { type: "increase", text: "Dependent deduction: 4.4M → 6.2M VND/month (+40.9%)" },
            { type: "change", text: "Progressive brackets simplified to 5 levels (from 7)" },
        ],
    },
    {
        date: "2020-07-01",
        title: "Previous Deduction Adjustment",
        source: "Resolution 954/2020/UBTVQH",
        sourceUrl: "https://english.luatvietnam.vn",
        changes: [
            { type: "increase", text: "Taxpayer deduction: 9M → 11M VND/month" },
            { type: "increase", text: "Dependent deduction: 3.6M → 4.4M VND/month" },
        ],
    },
    {
        date: "2013-01-01",
        title: "Circular 111/2013/TT-BTC — Withholding & Exemptions",
        source: "Ministry of Finance",
        sourceUrl: "https://www.accaglobal.com/content/dam/acca/global/PDF-students/acca/f6/examdocs/vnm-circular-111-2013-circular-on-personal-income-tax.pdf",
        changes: [
            { type: "change", text: "10% withholding on payments ≥2M VND (short-term/no contract)" },
            { type: "change", text: "Overtime premium exemption clarified" },
        ],
    },
    {
        date: "2007-01-01",
        title: "Law on Personal Income Tax — Foundation",
        source: "National Assembly",
        sourceUrl: "https://english.luatvietnam.vn",
        changes: [
            { type: "change", text: "183-day residency test established" },
            { type: "change", text: "20% flat rate for non-residents" },
            { type: "change", text: "7-level progressive bracket system (predecessor)" },
        ],
    },
];

function ChangeIcon({ type }: { type: ChangeItem["type"] }) {
    switch (type) {
        case "increase":
            return <ArrowUp className="h-4 w-4 text-green-500" />;
        case "decrease":
            return <ArrowDown className="h-4 w-4 text-red-500" />;
        default:
            return <Minus className="h-4 w-4 text-blue-500" />;
    }
}

export default function ChangelogPage() {
    return (
        <div className="container mx-auto max-w-3xl px-4 py-12">
            <div className="text-center mb-12">
                <h1 className="text-3xl font-bold mb-4">Tax Rule Changelog</h1>
                <p className="text-muted-foreground">
                    Track changes to Vietnam PIT rules over time. Most recent first.
                </p>
            </div>

            <div className="relative">
                {/* Timeline line */}
                <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-border" />

                <div className="space-y-8">
                    {changelog.map((entry, index) => (
                        <div key={entry.date} className="relative pl-12">
                            {/* Timeline dot */}
                            <div className={`absolute left-2 w-5 h-5 rounded-full border-2 border-background ${index === 0 ? "bg-green-500" : "bg-muted"
                                }`} />

                            <Card className={index === 0 ? "border-green-500/50" : ""}>
                                <CardHeader className="pb-3">
                                    <div className="flex items-center gap-2 mb-2">
                                        <Badge variant={index === 0 ? "default" : "secondary"} className="gap-1">
                                            <Calendar className="h-3 w-3" />
                                            {entry.date}
                                        </Badge>
                                        {index === 0 && (
                                            <Badge className="bg-green-500 text-white">Current</Badge>
                                        )}
                                    </div>
                                    <CardTitle className="text-lg">{entry.title}</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <ul className="space-y-2 mb-4">
                                        {entry.changes.map((change, i) => (
                                            <li key={i} className="flex items-start gap-2 text-sm">
                                                <ChangeIcon type={change.type} />
                                                <span className="text-muted-foreground">{change.text}</span>
                                            </li>
                                        ))}
                                    </ul>
                                    <a
                                        href={entry.sourceUrl}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="inline-flex items-center gap-1 text-xs text-green-500 hover:text-green-400 transition-colors cursor-pointer"
                                    >
                                        Source: {entry.source}
                                        <ExternalLink className="h-3 w-3" />
                                    </a>
                                </CardContent>
                            </Card>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
