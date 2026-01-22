"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { ChevronRight, ChevronLeft, Plus, Trash2, Info, Calculator, FileText, HelpCircle, Scale } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Badge } from "@/components/ui/badge";
import { VN_PIT_2026, formatVND, formatPercent, RULE_SOURCES } from "@/lib/constants";
import type { PITInput, PITResult, BreakdownStep, Bonus, TaxableAllowance } from "@/types/calculator";
import { AnimatedWizardWrapper } from "@/components/shared/animated-wizard";
import { ResultsChart } from "@/components/calculator/results-chart";

type Step = "profile" | "income" | "deductions" | "results";

function CalculatorContent() {
    const searchParams = useSearchParams();
    const [step, setStep] = useState<Step>("profile");

    // Form state
    const [taxYear, setTaxYear] = useState("2026");
    const [residencyStatus, setResidencyStatus] = useState<"resident" | "non_resident">("resident");
    const [monthlySalary, setMonthlySalary] = useState<number>(0);
    const [bonuses, setBonuses] = useState<Bonus[]>([]);
    const [allowances, setAllowances] = useState<TaxableAllowance[]>([]);
    const [dependentsCount, setDependentsCount] = useState<number>(0);
    const [insuranceContributions, setInsuranceContributions] = useState<number>(0);
    const [charityDonations, setCharityDonations] = useState<number>(0);

    // Result state
    const [result, setResult] = useState<PITResult | null>(null);

    // Pre-fill residency from URL
    useEffect(() => {
        const residency = searchParams.get("residency");
        if (residency === "resident" || residency === "non_resident") {
            setResidencyStatus(residency);
        }
    }, [searchParams]);

    const steps: { key: Step; label: string }[] = [
        { key: "profile", label: "Profile" },
        { key: "income", label: "Income" },
        { key: "deductions", label: "Deductions" },
        { key: "results", label: "Results" },
    ];

    const currentStepIndex = steps.findIndex((s) => s.key === step);
    const progress = ((currentStepIndex + 1) / steps.length) * 100;

    // Mock calculation
    const calculatePIT = (): PITResult => {
        const breakdown: BreakdownStep[] = [];
        const assumptions: string[] = [];

        // Monthly gross
        breakdown.push({
            label: "Monthly Gross Salary",
            amount: monthlySalary,
        });

        // Bonuses (annualized then monthly average)
        const totalBonuses = bonuses.reduce((sum, b) => sum + b.amount, 0);
        if (totalBonuses > 0) {
            breakdown.push({
                label: "Bonuses (annualized)",
                amount: totalBonuses,
            });
        }

        // Allowances
        const totalAllowances = allowances.reduce((sum, a) => sum + a.amount, 0);
        if (totalAllowances > 0) {
            breakdown.push({
                label: "Taxable Allowances",
                amount: totalAllowances,
            });
            assumptions.push("All listed allowances treated as taxable");
        }

        // Total monthly income
        const monthlyIncome = monthlySalary + totalAllowances + (totalBonuses / 12);
        breakdown.push({
            label: "Total Monthly Income",
            amount: monthlyIncome,
        });

        let monthlyPIT: number;
        let effectiveRate: number;

        if (residencyStatus === "non_resident") {
            // Non-resident: flat 20%
            monthlyPIT = monthlyIncome * VN_PIT_2026.nonResidentRate;
            effectiveRate = VN_PIT_2026.nonResidentRate;

            breakdown.push({
                label: "Non-resident Tax (20%)",
                amount: monthlyPIT,
                formula: `${formatVND(monthlyIncome)} × 20%`,
                ruleId: "NON_RESIDENT_RATE",
            });

            assumptions.push("Non-resident: no deductions allowed");
        } else {
            // Resident: progressive calculation

            // Insurance deduction
            const insuranceDeduction = insuranceContributions;
            if (insuranceDeduction > 0) {
                breakdown.push({
                    label: "Less: Insurance Contributions",
                    amount: -insuranceDeduction,
                    isDeduction: true,
                });
            }

            // Taxpayer deduction
            breakdown.push({
                label: "Less: Taxpayer Deduction",
                amount: -VN_PIT_2026.taxpayerDeduction,
                formula: formatVND(VN_PIT_2026.taxpayerDeduction),
                ruleId: "FAMILY_DEDUCTION",
                isDeduction: true,
            });

            // Dependent deductions
            const dependentDeduction = dependentsCount * VN_PIT_2026.dependentDeduction;
            if (dependentDeduction > 0) {
                breakdown.push({
                    label: `Less: Dependent Deductions (${dependentsCount})`,
                    amount: -dependentDeduction,
                    formula: `${formatVND(VN_PIT_2026.dependentDeduction)} × ${dependentsCount}`,
                    ruleId: "FAMILY_DEDUCTION",
                    isDeduction: true,
                });
            }

            // Charity
            if (charityDonations > 0) {
                breakdown.push({
                    label: "Less: Charity Donations",
                    amount: -charityDonations,
                    isDeduction: true,
                });
            }

            // Assessable income
            const totalDeductions = insuranceDeduction + VN_PIT_2026.taxpayerDeduction + dependentDeduction + charityDonations;
            const assessableIncome = Math.max(0, monthlyIncome - totalDeductions);

            breakdown.push({
                label: "Assessable Income",
                amount: assessableIncome,
                formula: `${formatVND(monthlyIncome)} - ${formatVND(totalDeductions)}`,
            });

            // Progressive tax calculation
            let tax = 0;
            let remaining = assessableIncome;

            for (const bracket of VN_PIT_2026.brackets) {
                if (remaining <= 0) break;

                const bracketSize = bracket.max === Infinity ? remaining : Math.min(remaining, bracket.max - bracket.min);
                const bracketTax = bracketSize * bracket.rate;
                tax += bracketTax;
                remaining -= bracketSize;

                if (bracketTax > 0) {
                    breakdown.push({
                        label: `Bracket ${formatPercent(bracket.rate)} (${formatVND(bracket.min)} - ${bracket.max === Infinity ? "∞" : formatVND(bracket.max)})`,
                        amount: bracketTax,
                        formula: `${formatVND(bracketSize)} × ${formatPercent(bracket.rate)}`,
                        ruleId: "PROGRESSIVE_BRACKETS",
                    });
                }
            }

            monthlyPIT = tax;
            effectiveRate = monthlyIncome > 0 ? tax / monthlyIncome : 0;

            breakdown.push({
                label: "Monthly PIT",
                amount: monthlyPIT,
            });
        }

        const annualizedPIT = monthlyPIT * 12 + (residencyStatus === "resident" ? 0 : totalBonuses * 0.2);

        return {
            monthlyPIT,
            annualizedPIT,
            effectiveRate,
            breakdown,
            assumptions,
            rulesUsed: Object.values(RULE_SOURCES).slice(0, 3),
        };
    };

    const handleNext = () => {
        if (step === "profile") setStep("income");
        else if (step === "income") {
            if (residencyStatus === "non_resident") {
                const result = calculatePIT();
                setResult(result);
                setStep("results");
            } else {
                setStep("deductions");
            }
        }
        else if (step === "deductions") {
            const result = calculatePIT();
            setResult(result);
            setStep("results");
        }
    };

    const handleBack = () => {
        if (step === "income") setStep("profile");
        else if (step === "deductions") setStep("income");
        else if (step === "results") {
            setStep(residencyStatus === "non_resident" ? "income" : "deductions");
        }
    };

    const addBonus = () => setBonuses([...bonuses, { amount: 0, month: 1 }]);
    const removeBonus = (index: number) => setBonuses(bonuses.filter((_, i) => i !== index));

    const addAllowance = () => setAllowances([...allowances, { description: "", amount: 0 }]);
    const removeAllowance = (index: number) => setAllowances(allowances.filter((_, i) => i !== index));

    return (
        <TooltipProvider>
            <div className="container mx-auto max-w-3xl px-4 py-12">
                <div className="text-center mb-8">
                    <h1 className="text-3xl font-bold mb-2">PIT Calculator</h1>
                    <p className="text-muted-foreground">
                        Calculate your Vietnam Personal Income Tax for {taxYear}
                    </p>
                </div>

                {/* Progress */}
                <div className="mb-8">
                    <div className="flex justify-between text-sm text-muted-foreground mb-2">
                        {steps.map((s) => (
                            <span key={s.key} className={step === s.key ? "text-foreground font-medium" : ""}>
                                {s.label}
                            </span>
                        ))}
                    </div>
                    <Progress value={progress} className="h-2" />
                </div>

                <AnimatedWizardWrapper step={step}>
                    <Card>
                        <CardContent className="pt-6">
                            {/* Step 1: Profile */}
                            {step === "profile" && (
                                <div className="space-y-6">
                                    <div>
                                        <Label className="mb-2 block">Tax Year</Label>
                                        <Select value={taxYear} onValueChange={setTaxYear}>
                                            <SelectTrigger className="cursor-pointer">
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="2026">2026</SelectItem>
                                                <SelectItem value="2025">2025</SelectItem>
                                                <SelectItem value="2024">2024</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>

                                    <div>
                                        <div className="flex items-center gap-2 mb-3">
                                            <Label>Residency Status</Label>
                                            <Tooltip>
                                                <TooltipTrigger>
                                                    <Info className="h-4 w-4 text-muted-foreground" />
                                                </TooltipTrigger>
                                                <TooltipContent>
                                                    <p className="max-w-xs">Not sure? Use our Residency Checker first.</p>
                                                </TooltipContent>
                                            </Tooltip>
                                        </div>
                                        <RadioGroup
                                            value={residencyStatus}
                                            onValueChange={(v: "resident" | "non_resident") => setResidencyStatus(v)}
                                            className="space-y-2"
                                        >
                                            <div className="flex items-center space-x-3 p-3 border rounded-lg cursor-pointer hover:bg-muted/50">
                                                <RadioGroupItem value="resident" id="resident" />
                                                <Label htmlFor="resident" className="flex-1 cursor-pointer">
                                                    <span className="font-medium">Resident</span>
                                                    <p className="text-sm text-muted-foreground">Progressive rates 5%-35%, deductions allowed</p>
                                                </Label>
                                            </div>
                                            <div className="flex items-center space-x-3 p-3 border rounded-lg cursor-pointer hover:bg-muted/50">
                                                <RadioGroupItem value="non_resident" id="non_resident" />
                                                <Label htmlFor="non_resident" className="flex-1 cursor-pointer">
                                                    <span className="font-medium">Non-resident</span>
                                                    <p className="text-sm text-muted-foreground">Flat 20% rate, no deductions</p>
                                                </Label>
                                            </div>
                                        </RadioGroup>
                                    </div>
                                </div>
                            )}

                            {/* Step 2: Income */}
                            {step === "income" && (
                                <div className="space-y-6">
                                    <div>
                                        <Label htmlFor="salary" className="mb-2 block">Monthly Gross Salary (VND)</Label>
                                        <Input
                                            id="salary"
                                            type="number"
                                            min={0}
                                            value={monthlySalary || ""}
                                            onChange={(e) => setMonthlySalary(parseInt(e.target.value) || 0)}
                                            placeholder="e.g., 50000000"
                                        />
                                    </div>

                                    <div>
                                        <div className="flex items-center justify-between mb-2">
                                            <Label>Bonuses</Label>
                                            <Button variant="outline" size="sm" onClick={addBonus} className="gap-1 cursor-pointer">
                                                <Plus className="h-3 w-3" />
                                                Add
                                            </Button>
                                        </div>
                                        {bonuses.length === 0 && (
                                            <p className="text-sm text-muted-foreground">No bonuses added</p>
                                        )}
                                        <div className="space-y-2">
                                            {bonuses.map((bonus, i) => (
                                                <div key={i} className="flex gap-2 items-center">
                                                    <Input
                                                        type="number"
                                                        placeholder="Amount"
                                                        value={bonus.amount || ""}
                                                        onChange={(e) => {
                                                            const updated = [...bonuses];
                                                            updated[i].amount = parseInt(e.target.value) || 0;
                                                            setBonuses(updated);
                                                        }}
                                                        className="flex-1"
                                                    />
                                                    <Select
                                                        value={String(bonus.month)}
                                                        onValueChange={(v) => {
                                                            const updated = [...bonuses];
                                                            updated[i].month = parseInt(v);
                                                            setBonuses(updated);
                                                        }}
                                                    >
                                                        <SelectTrigger className="w-24 cursor-pointer">
                                                            <SelectValue />
                                                        </SelectTrigger>
                                                        <SelectContent>
                                                            {Array.from({ length: 12 }, (_, i) => (
                                                                <SelectItem key={i + 1} value={String(i + 1)}>
                                                                    {["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"][i]}
                                                                </SelectItem>
                                                            ))}
                                                        </SelectContent>
                                                    </Select>
                                                    <Button variant="ghost" size="icon" onClick={() => removeBonus(i)} className="cursor-pointer">
                                                        <Trash2 className="h-4 w-4 text-destructive" />
                                                    </Button>
                                                </div>
                                            ))}
                                        </div>
                                    </div>

                                    <div>
                                        <div className="flex items-center justify-between mb-2">
                                            <Label>Taxable Allowances</Label>
                                            <Button variant="outline" size="sm" onClick={addAllowance} className="gap-1 cursor-pointer">
                                                <Plus className="h-3 w-3" />
                                                Add
                                            </Button>
                                        </div>
                                        {allowances.length === 0 && (
                                            <p className="text-sm text-muted-foreground">No allowances added</p>
                                        )}
                                        <div className="space-y-2">
                                            {allowances.map((allowance, i) => (
                                                <div key={i} className="flex gap-2 items-center">
                                                    <Input
                                                        placeholder="Description"
                                                        value={allowance.description}
                                                        onChange={(e) => {
                                                            const updated = [...allowances];
                                                            updated[i].description = e.target.value;
                                                            setAllowances(updated);
                                                        }}
                                                        className="flex-1"
                                                    />
                                                    <Input
                                                        type="number"
                                                        placeholder="Amount"
                                                        value={allowance.amount || ""}
                                                        onChange={(e) => {
                                                            const updated = [...allowances];
                                                            updated[i].amount = parseInt(e.target.value) || 0;
                                                            setAllowances(updated);
                                                        }}
                                                        className="w-32"
                                                    />
                                                    <Button variant="ghost" size="icon" onClick={() => removeAllowance(i)} className="cursor-pointer">
                                                        <Trash2 className="h-4 w-4 text-destructive" />
                                                    </Button>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Step 3: Deductions (Resident only) */}
                            {step === "deductions" && (
                                <div className="space-y-6">
                                    <div>
                                        <Label htmlFor="dependents" className="mb-2 block">Number of Registered Dependents</Label>
                                        <Input
                                            id="dependents"
                                            type="number"
                                            min={0}
                                            max={10}
                                            value={dependentsCount || ""}
                                            onChange={(e) => setDependentsCount(parseInt(e.target.value) || 0)}
                                        />
                                        <p className="text-xs text-muted-foreground mt-1">
                                            Each dependent: {formatVND(VN_PIT_2026.dependentDeduction)}/month deduction
                                        </p>
                                    </div>

                                    <div>
                                        <Label htmlFor="insurance" className="mb-2 block">Monthly Insurance Contributions (VND)</Label>
                                        <Input
                                            id="insurance"
                                            type="number"
                                            min={0}
                                            value={insuranceContributions || ""}
                                            onChange={(e) => setInsuranceContributions(parseInt(e.target.value) || 0)}
                                        />
                                    </div>

                                    <div>
                                        <Label htmlFor="charity" className="mb-2 block">Monthly Charity Donations (VND) - Optional</Label>
                                        <Input
                                            id="charity"
                                            type="number"
                                            min={0}
                                            value={charityDonations || ""}
                                            onChange={(e) => setCharityDonations(parseInt(e.target.value) || 0)}
                                        />
                                    </div>
                                </div>
                            )}

                            {/* Step 4: Results */}
                            {step === "results" && result && (
                                <div className="space-y-6">
                                    {/* Summary */}
                                    <div className="grid md:grid-cols-2 gap-4">
                                        <div className="text-center p-6 bg-green-500/10 rounded-lg border border-green-500/30 flex flex-col justify-center">
                                            <p className="text-sm text-muted-foreground mb-1">Monthly PIT</p>
                                            <p className="text-4xl font-mono font-bold text-green-500">{formatVND(result.monthlyPIT)}</p>
                                            <p className="text-sm text-muted-foreground mt-2">
                                                Annualized: <span className="font-medium">{formatVND(result.annualizedPIT)}</span>
                                                {" · "}
                                                Effective rate: <span className="font-medium">{formatPercent(result.effectiveRate)}</span>
                                            </p>
                                        </div>

                                        {/* Chart Component */}
                                        <ResultsChart
                                            grossIncome={monthlySalary + bonuses.reduce((s, b) => s + b.amount, 0) / 12}
                                            netIncome={monthlySalary - result.monthlyPIT - insuranceContributions}
                                            taxLiability={result.monthlyPIT}
                                            insurance={insuranceContributions}
                                        />
                                    </div>

                                    <Tabs defaultValue="breakdown">
                                        <TabsList className="grid w-full grid-cols-4">
                                            <TabsTrigger value="breakdown" className="gap-1 cursor-pointer">
                                                <Calculator className="h-3 w-3" />
                                                <span className="hidden sm:inline">Breakdown</span>
                                            </TabsTrigger>
                                            <TabsTrigger value="assumptions" className="gap-1 cursor-pointer">
                                                <HelpCircle className="h-3 w-3" />
                                                <span className="hidden sm:inline">Assumptions</span>
                                            </TabsTrigger>
                                            <TabsTrigger value="legal" className="gap-1 cursor-pointer">
                                                <Scale className="h-3 w-3" />
                                                <span className="hidden sm:inline">Legal</span>
                                            </TabsTrigger>
                                            <TabsTrigger value="faq" className="gap-1 cursor-pointer">
                                                <FileText className="h-3 w-3" />
                                                <span className="hidden sm:inline">FAQ</span>
                                            </TabsTrigger>
                                        </TabsList>

                                        <TabsContent value="breakdown" className="mt-4">
                                            <div className="space-y-2">
                                                {result.breakdown.map((item, i) => (
                                                    <div key={i} className={`flex justify-between items-center py-2 ${item.isDeduction ? "text-red-400" : ""
                                                        } ${item.label.includes("Monthly PIT") || item.label.includes("Assessable") ? "font-semibold border-t pt-3" : ""}`}>
                                                        <div className="flex items-center gap-2">
                                                            <span className="text-sm">{item.label}</span>
                                                            {item.ruleId && (
                                                                <Tooltip>
                                                                    <TooltipTrigger>
                                                                        <Info className="h-3 w-3 text-muted-foreground" />
                                                                    </TooltipTrigger>
                                                                    <TooltipContent>
                                                                        <p className="max-w-xs text-xs">{item.formula}</p>
                                                                    </TooltipContent>
                                                                </Tooltip>
                                                            )}
                                                        </div>
                                                        <span className="font-mono text-sm">{formatVND(item.amount)}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        </TabsContent>

                                        <TabsContent value="assumptions" className="mt-4">
                                            <ul className="space-y-2">
                                                {result.assumptions.map((a, i) => (
                                                    <li key={i} className="text-sm text-muted-foreground flex items-start gap-2">
                                                        <Info className="h-4 w-4 text-blue-500 mt-0.5" />
                                                        {a}
                                                    </li>
                                                ))}
                                                <li className="text-sm text-muted-foreground flex items-start gap-2">
                                                    <Info className="h-4 w-4 text-blue-500 mt-0.5" />
                                                    Calculation uses {taxYear} rules
                                                </li>
                                            </ul>
                                        </TabsContent>

                                        <TabsContent value="legal" className="mt-4">
                                            <ul className="space-y-3">
                                                {result.rulesUsed.map((rule) => (
                                                    <li key={rule.ruleId} className="text-sm">
                                                        <p className="font-medium">{rule.ruleName}</p>
                                                        <p className="text-muted-foreground">{rule.sourceTitle}</p>
                                                        <Badge variant="secondary" className="mt-1">{rule.effectiveDate}</Badge>
                                                    </li>
                                                ))}
                                            </ul>
                                        </TabsContent>

                                        <TabsContent value="faq" className="mt-4">
                                            <div className="text-sm text-muted-foreground space-y-3">
                                                <p><strong>Q: Is this the exact amount I'll pay?</strong></p>
                                                <p>This is an estimate. Your employer may calculate slightly differently due to timing, benefits, or other factors.</p>

                                                <p><strong>Q: What about overtime?</strong></p>
                                                <p>Overtime premiums (amounts above normal rate) are exempt. Enter only normal wages above.</p>
                                            </div>
                                        </TabsContent>
                                    </Tabs>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </AnimatedWizardWrapper>

                {/* Navigation */}
                <div className="flex justify-between mt-6">
                    <Button
                        variant="outline"
                        onClick={handleBack}
                        disabled={step === "profile"}
                        className="gap-1 cursor-pointer"
                    >
                        <ChevronLeft className="h-4 w-4" />
                        Back
                    </Button>

                    {step !== "results" && (
                        <Button onClick={handleNext} className="gap-1 bg-green-500 hover:bg-green-600 cursor-pointer">
                            {step === "deductions" || (step === "income" && residencyStatus === "non_resident") ? "Calculate" : "Next"}
                            <ChevronRight className="h-4 w-4" />
                        </Button>
                    )}

                    {step === "results" && (
                        <Button variant="outline" onClick={() => setStep("profile")} className="gap-1 cursor-pointer">
                            Start Over
                        </Button>
                    )}
                </div>
            </div>
        </TooltipProvider>
    );
}

export default function CalculatorPage() {
    return (
        <Suspense fallback={<div className="container mx-auto max-w-3xl px-4 py-12 text-center">Loading...</div>}>
            <CalculatorContent />
        </Suspense>
    );
}
