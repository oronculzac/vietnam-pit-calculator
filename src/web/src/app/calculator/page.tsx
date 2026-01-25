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
import { formatVND, formatPercent, RULE_SOURCES } from "@/lib/constants";
import type { PITResult, Bonus, TaxableAllowance } from "@/types/calculator";
import { AnimatedWizardWrapper } from "@/components/shared/animated-wizard";
import { ResultsChart } from "@/components/calculator/results-chart";
import { calculatePIT as calculatePITEngine, grossToNet as grossToNetEngine, netToGross as netToGrossEngine, type SalaryZone } from "../../../../engine/calculator";
import { getConstant } from "../../../../rules/ruleset-loader";
import { formatCurrency, vndToUsd, USD_VND_RATE, type Currency } from "@/lib/currency";

type Step = "profile" | "income" | "deductions" | "results";

function CalculatorContent() {
    const searchParams = useSearchParams();
    const [step, setStep] = useState<Step>("profile");

    // View Mode
    const [viewMode, setViewMode] = useState<"monthly" | "annual">("monthly");

    // Form state
    const [taxYear, setTaxYear] = useState("2026");
    const [residencyStatus, setResidencyStatus] = useState<"resident" | "non_resident">("resident");
    const [monthlySalary, setMonthlySalary] = useState<number>(0);
    const [bonuses, setBonuses] = useState<Bonus[]>([]);
    const [allowances, setAllowances] = useState<TaxableAllowance[]>([]);
    const [dependentsCount, setDependentsCount] = useState<number>(0);
    const [insuranceContributions, setInsuranceContributions] = useState<number>(0);
    const [charityDonations, setCharityDonations] = useState<number>(0);

    // Gross-to-Net state
    const [calculationMode, setCalculationMode] = useState<"pit" | "gross_to_net" | "net_to_gross">("pit");
    const [salaryZone, setSalaryZone] = useState<1 | 2 | 3 | 4>(1);
    const [isExpat, setIsExpat] = useState(true); // Default to expat for target audience
    const [targetNetSalary, setTargetNetSalary] = useState<number>(0);

    // Currency display
    const [displayCurrency, setDisplayCurrency] = useState<"VND" | "USD">("VND");

    // Result state
    const [result, setResult] = useState<PITResult | null>(null);
    const [grossNetContext, setGrossNetContext] = useState<{ gross: number; net: number; insurance: number } | null>(null);

    const assessmentDate = new Date(`${taxYear}-01-01T00:00:00Z`);
    const taxpayerDeduction = getConstant("FAMILY_DEDUCTION_TAXPAYER_MONTHLY", assessmentDate) ?? 15_500_000;
    const dependentDeduction = getConstant("FAMILY_DEDUCTION_DEPENDENT_MONTHLY", assessmentDate) ?? 6_200_000;

    const totalBonuses = bonuses.reduce((sum, b) => sum + b.amount, 0);
    const totalAllowances = allowances.reduce((sum, a) => sum + a.amount, 0);
    const monthlyBonus = totalBonuses / 12;
    const grossSalaryForCalc = monthlySalary + monthlyBonus;
    const monthlyIncome = grossSalaryForCalc + totalAllowances;

    const rulesUsed = residencyStatus === "non_resident"
        ? [RULE_SOURCES.NON_RESIDENT_RATE]
        : [RULE_SOURCES.FAMILY_DEDUCTION, RULE_SOURCES.PROGRESSIVE_BRACKETS];

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

    // Calculation function - handles all modes (PIT only, Gross→Net, Net→Gross)
    const calculatePIT = (): PITResult => {
        const assumptions: string[] = [];

        // Handle Gross-to-Net and Net-to-Gross modes with auto-insurance
        if (calculationMode === "gross_to_net" || calculationMode === "net_to_gross") {
            const salaryToUse = calculationMode === "net_to_gross" ? targetNetSalary : monthlySalary;
            const result = calculationMode === "gross_to_net"
                ? grossToNetEngine({
                    grossSalary: salaryToUse,
                    residencyStatus,
                    dependentsCount,
                    zone: salaryZone,
                    isExpat,
                })
                : netToGrossEngine({
                    netSalary: salaryToUse,
                    residencyStatus,
                    dependentsCount,
                    zone: salaryZone,
                    isExpat,
                });

            setGrossNetContext({
                gross: result.gross,
                net: result.net,
                insurance: result.insurance.total,
            });

            assumptions.push(isExpat ? "Expat: exempt from unemployment insurance" : "Local: full insurance contributions");
            assumptions.push(`Zone ${salaryZone} minimum wage applied for UI cap`);
            if (calculationMode === "net_to_gross") {
                assumptions.push("Gross salary calculated from target net via binary search");
            }

            return {
                monthlyPIT: result.pit,
                annualizedPIT: result.pit * 12,
                effectiveRate: result.effectiveRate,
                breakdown: result.breakdown,
                assumptions,
                rulesUsed,
            };
        }

        const pitResult = calculatePITEngine({
            residencyStatus,
            grossSalary: grossSalaryForCalc,
            taxableAllowances: totalAllowances,
            dependentsCount,
            insuranceContributions,
            charityDonations,
            assessmentDate,
        });

        const breakdown = pitResult.breakdown.map(step => {
            if (step.label === "Gross Salary" && totalBonuses > 0) {
                return { ...step, label: "Gross Salary (incl. annualized bonuses)" };
            }
            return step;
        });

        const pitAssumptions = [...pitResult.assumptions];
        if (totalBonuses > 0) {
            pitAssumptions.push("Bonuses are spread evenly across months");
        }
        if (totalAllowances > 0 && !pitAssumptions.some((assumption) => assumption.includes("allowances"))) {
            pitAssumptions.push("All listed allowances treated as taxable");
        }
        setGrossNetContext({
            gross: monthlyIncome,
            net: monthlyIncome - pitResult.monthlyPIT - insuranceContributions,
            insurance: insuranceContributions,
        });

        return {
            monthlyPIT: pitResult.monthlyPIT,
            annualizedPIT: pitResult.annualizedPIT,
            effectiveRate: pitResult.effectiveRate,
            breakdown,
            assumptions: pitAssumptions,
            rulesUsed: pitResult.rulesUsed.map(r => {
                const found = Object.values(RULE_SOURCES).find(source => source.ruleId === r.ruleId);
                return found || {
                    ruleId: r.ruleId,
                    ruleName: r.ruleId,
                    effectiveDate: "2026-01-01",
                    sourceUrl: "",
                    sourceTitle: r.citation
                };
            }),
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

    const chartGrossIncome = calculationMode === "pit" ? monthlyIncome : grossNetContext?.gross ?? 0;
    const chartNetIncome = calculationMode === "pit"
        ? monthlyIncome - (result?.monthlyPIT ?? 0) - insuranceContributions
        : grossNetContext?.net ?? 0;
    const chartInsurance = calculationMode === "pit" ? insuranceContributions : grossNetContext?.insurance ?? 0;

    return (
        <TooltipProvider>
            <div className="container mx-auto max-w-3xl px-4 py-12">
                <div className="text-center mb-8">
                    <h1 className="text-3xl font-bold mb-2">PIT Calculator</h1>
                    <p className="text-muted-foreground">
                        Calculate your Vietnam Personal Income Tax for {taxYear}
                        {result && (
                            <span className="block mt-2 text-sm">
                                <span className={viewMode === "monthly" ? "text-foreground font-medium" : "text-muted-foreground"}>Monthly</span>
                                <span className="mx-2">/</span>
                                <span className={viewMode === "annual" ? "text-foreground font-medium" : "text-muted-foreground"}>Annual</span>
                            </span>
                        )}
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
                                    {/* Calculation Mode */}
                                    <div>
                                        <Label className="mb-2 block">Calculation Mode</Label>
                                        <RadioGroup
                                            value={calculationMode}
                                            onValueChange={(v: "pit" | "gross_to_net" | "net_to_gross") => setCalculationMode(v)}
                                            className="grid grid-cols-3 gap-2"
                                        >
                                            <div className={`flex items-center justify-center p-3 border rounded-lg cursor-pointer hover:bg-muted/50 ${calculationMode === "pit" ? "border-green-500 bg-green-500/10" : ""}`}>
                                                <RadioGroupItem value="pit" id="mode_pit" className="sr-only" />
                                                <Label htmlFor="mode_pit" className="cursor-pointer text-center">
                                                    <span className="font-medium text-sm">PIT Only</span>
                                                </Label>
                                            </div>
                                            <div className={`flex items-center justify-center p-3 border rounded-lg cursor-pointer hover:bg-muted/50 ${calculationMode === "gross_to_net" ? "border-green-500 bg-green-500/10" : ""}`}>
                                                <RadioGroupItem value="gross_to_net" id="mode_gtn" className="sr-only" />
                                                <Label htmlFor="mode_gtn" className="cursor-pointer text-center">
                                                    <span className="font-medium text-sm">Gross→Net</span>
                                                </Label>
                                            </div>
                                            <div className={`flex items-center justify-center p-3 border rounded-lg cursor-pointer hover:bg-muted/50 ${calculationMode === "net_to_gross" ? "border-green-500 bg-green-500/10" : ""}`}>
                                                <RadioGroupItem value="net_to_gross" id="mode_ntg" className="sr-only" />
                                                <Label htmlFor="mode_ntg" className="cursor-pointer text-center">
                                                    <span className="font-medium text-sm">Net→Gross</span>
                                                </Label>
                                            </div>
                                        </RadioGroup>
                                    </div>

                                    <div>
                                        <Label className="mb-2 block">Tax Year</Label>
                                        <Select value={taxYear} onValueChange={setTaxYear}>
                                            <SelectTrigger className="cursor-pointer">
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="2026">2026</SelectItem>
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

                                    {/* Zone & Expat (for Gross-to-Net modes) */}
                                    {calculationMode !== "pit" && (
                                        <div className="grid grid-cols-2 gap-4 p-4 bg-muted/30 rounded-lg">
                                            <div>
                                                <div className="flex items-center gap-2 mb-2">
                                                    <Label>Salary Zone</Label>
                                                    <Tooltip>
                                                        <TooltipTrigger>
                                                            <Info className="h-4 w-4 text-muted-foreground" />
                                                        </TooltipTrigger>
                                                        <TooltipContent>
                                                            <p className="max-w-xs">Zone 1: HCMC/Hanoi urban. Zone 2-4: Lower minimum wages.</p>
                                                        </TooltipContent>
                                                    </Tooltip>
                                                </div>
                                                <Select value={String(salaryZone)} onValueChange={(v) => setSalaryZone(parseInt(v) as 1 | 2 | 3 | 4)}>
                                                    <SelectTrigger className="cursor-pointer">
                                                        <SelectValue />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        <SelectItem value="1">Zone 1 (HCMC/Hanoi)</SelectItem>
                                                        <SelectItem value="2">Zone 2</SelectItem>
                                                        <SelectItem value="3">Zone 3</SelectItem>
                                                        <SelectItem value="4">Zone 4</SelectItem>
                                                    </SelectContent>
                                                </Select>
                                            </div>
                                            <div>
                                                <Label className="mb-2 block">Employee Type</Label>
                                                <RadioGroup
                                                    value={isExpat ? "expat" : "local"}
                                                    onValueChange={(v) => setIsExpat(v === "expat")}
                                                    className="flex gap-4"
                                                >
                                                    <div className="flex items-center space-x-2">
                                                        <RadioGroupItem value="expat" id="expat" />
                                                        <Label htmlFor="expat" className="cursor-pointer text-sm">Expat</Label>
                                                    </div>
                                                    <div className="flex items-center space-x-2">
                                                        <RadioGroupItem value="local" id="local" />
                                                        <Label htmlFor="local" className="cursor-pointer text-sm">Local</Label>
                                                    </div>
                                                </RadioGroup>
                                                <p className="text-xs text-muted-foreground mt-1">
                                                    {isExpat ? "No unemployment insurance" : "Full insurance"}
                                                </p>
                                            </div>
                                        </div>
                                    )}

                                    {/* Display Currency */}
                                    <div className="flex items-center justify-between p-3 border rounded-lg">
                                        <div className="flex items-center gap-2">
                                            <Label>Display Currency</Label>
                                            <Tooltip>
                                                <TooltipTrigger>
                                                    <Info className="h-4 w-4 text-muted-foreground" />
                                                </TooltipTrigger>
                                                <TooltipContent>
                                                    <p className="max-w-xs">Show amounts in VND or USD (rate: ₫{USD_VND_RATE.toLocaleString()}/USD)</p>
                                                </TooltipContent>
                                            </Tooltip>
                                        </div>
                                        <div className="flex gap-1 border rounded-lg p-1">
                                            <button
                                                type="button"
                                                onClick={() => setDisplayCurrency("VND")}
                                                className={`px-3 py-1 text-sm rounded transition-colors ${displayCurrency === "VND" ? "bg-green-500 text-white" : "hover:bg-muted"}`}
                                            >
                                                VND ₫
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => setDisplayCurrency("USD")}
                                                className={`px-3 py-1 text-sm rounded transition-colors ${displayCurrency === "USD" ? "bg-green-500 text-white" : "hover:bg-muted"}`}
                                            >
                                                USD $
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Step 2: Income */}
                            {step === "income" && (
                                <div className="space-y-6">
                                    <div>
                                        <Label htmlFor="salary" className="mb-2 block">
                                            {calculationMode === "net_to_gross" ? "Target Net Salary (VND)" : "Monthly Gross Salary (VND)"}
                                        </Label>
                                        <Input
                                            id="salary"
                                            type="number"
                                            min={0}
                                            value={calculationMode === "net_to_gross" ? targetNetSalary || "" : monthlySalary || ""}
                                            onChange={(e) => {
                                                const value = parseInt(e.target.value) || 0;
                                                if (calculationMode === "net_to_gross") {
                                                    setTargetNetSalary(value);
                                                } else {
                                                    setMonthlySalary(value);
                                                }
                                            }}
                                            placeholder="e.g., 50000000"
                                        />
                                    </div>

                                    {calculationMode === "pit" && (
                                        <>
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
                                                                            {[
                                                                                "Jan",
                                                                                "Feb",
                                                                                "Mar",
                                                                                "Apr",
                                                                                "May",
                                                                                "Jun",
                                                                                "Jul",
                                                                                "Aug",
                                                                                "Sep",
                                                                                "Oct",
                                                                                "Nov",
                                                                                "Dec",
                                                                            ][i]}
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
                                        </>
                                    )}
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
                                            Each dependent: {formatVND(dependentDeduction)}/month deduction
                                        </p>
                                    </div>

                                    {calculationMode === "pit" && (
                                        <>
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
                                        </>
                                    )}
                                </div>
                            )}

                            {/* Step 4: Results */}
                            {step === "results" && result && (
                                <div className="space-y-6">
                                    {/* View Toggle */}
                                    <div className="flex justify-center mb-4">
                                        <div className="flex items-center space-x-2 bg-muted p-1 rounded-lg">
                                            <Button
                                                variant={viewMode === "monthly" ? "default" : "ghost"}
                                                size="sm"
                                                onClick={() => setViewMode("monthly")}
                                                className="text-xs"
                                            >
                                                Monthly View
                                            </Button>
                                            <Button
                                                variant={viewMode === "annual" ? "default" : "ghost"}
                                                size="sm"
                                                onClick={() => setViewMode("annual")}
                                                className="text-xs"
                                            >
                                                Annual View
                                            </Button>
                                        </div>
                                    </div>

                                    {/* Summary */}
                                    <div className="grid md:grid-cols-2 gap-4">
                                        <div className="text-center p-6 bg-green-500/10 rounded-lg border border-green-500/30 flex flex-col justify-center">
                                            <p className="text-sm text-muted-foreground mb-1">{viewMode === "annual" ? "Annual" : "Monthly"} PIT</p>
                                            <p className="text-4xl font-mono font-bold text-green-500">
                                                {formatCurrency(viewMode === "annual" ? result.annualizedPIT : result.monthlyPIT, displayCurrency)}
                                            </p>
                                            <p className="text-sm text-muted-foreground mt-2">
                                                {viewMode === "annual" ? "Monthly" : "Annualized"}: <span className="font-medium">
                                                    {formatCurrency(viewMode === "annual" ? result.monthlyPIT : result.annualizedPIT, displayCurrency)}
                                                </span>
                                                {" · "}
                                                Effective rate: <span className="font-medium">{formatPercent(result.effectiveRate)}</span>
                                            </p>
                                        </div>

                                        {/* Chart Component */}
                                        <ResultsChart
                                            grossIncome={chartGrossIncome * (viewMode === "annual" ? 12 : 1)}
                                            netIncome={chartNetIncome * (viewMode === "annual" ? 12 : 1)}
                                            taxLiability={result.monthlyPIT * (viewMode === "annual" ? 12 : 1)}
                                            insurance={chartInsurance * (viewMode === "annual" ? 12 : 1)}
                                            viewMode={viewMode}
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
                                                            <span className="text-sm">
                                                                {item.label.replace("Monthly", viewMode === "annual" ? "Annual" : "Monthly")}
                                                            </span>
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
                                                        <span className="font-mono text-sm">
                                                            {formatCurrency(item.amount * (viewMode === "annual" ? 12 : 1), displayCurrency)}
                                                        </span>
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
