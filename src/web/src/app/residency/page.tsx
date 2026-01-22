"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Calendar, Home, ChevronRight, ChevronLeft, Info, CheckCircle, XCircle, HelpCircle } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import type { ResidencyResult } from "@/types/calculator";

type Step = "presence" | "housing" | "result";

export default function ResidencyPage() {
    const router = useRouter();
    const [step, setStep] = useState<Step>("presence");

    // Form state
    const [firstEntryDate, setFirstEntryDate] = useState("");
    const [daysPresent, setDaysPresent] = useState<number>(0);
    const [hasPermanentResidence, setHasPermanentResidence] = useState<boolean | undefined>(undefined);
    const [hasRentalContract, setHasRentalContract] = useState<boolean | undefined>(undefined);

    // Result state
    const [result, setResult] = useState<ResidencyResult | null>(null);

    const steps: { key: Step; label: string }[] = [
        { key: "presence", label: "Travel & Presence" },
        { key: "housing", label: "Housing Indicators" },
        { key: "result", label: "Result" },
    ];

    const currentStepIndex = steps.findIndex((s) => s.key === step);
    const progress = ((currentStepIndex + 1) / steps.length) * 100;

    // Mock residency determination
    const determineResidency = (): ResidencyResult => {
        const factors: string[] = [];
        const whatWouldChange: string[] = [];

        // 183-day test
        if (daysPresent >= 183) {
            factors.push(`Present in Vietnam for ${daysPresent} days (≥183 threshold)`);
        } else {
            factors.push(`Only ${daysPresent} days present in Vietnam`);
            whatWouldChange.push(`Staying ${183 - daysPresent} more days would trigger residency`);
        }

        // Housing indicators
        if (hasPermanentResidence === true) {
            factors.push("Has registered permanent residence");
        }
        if (hasRentalContract === true) {
            factors.push("Has rental contract ≥183 days");
        }

        // Determine status
        let status: ResidencyResult["status"];
        let confidence: ResidencyResult["confidence"];

        if (daysPresent >= 183) {
            status = "resident";
            confidence = "high";
        } else if (hasPermanentResidence || hasRentalContract) {
            status = "resident";
            confidence = "medium";
            factors.push("Housing indicator suggests residency despite <183 days");
        } else if (daysPresent >= 150) {
            status = "uncertain";
            confidence = "low";
            whatWouldChange.push("Registering permanent residence or rental would clarify status");
        } else {
            status = "non_resident";
            confidence = daysPresent < 90 ? "high" : "medium";
        }

        return { status, confidence, factors, whatWouldChange, rulesUsed: [] };
    };

    const handleNext = () => {
        if (step === "presence") {
            setStep("housing");
        } else if (step === "housing") {
            const result = determineResidency();
            setResult(result);
            setStep("result");
        }
    };

    const handleBack = () => {
        if (step === "housing") setStep("presence");
        else if (step === "result") setStep("housing");
    };

    const handleUseInCalculator = () => {
        const status = result?.status === "resident" ? "resident" : "non_resident";
        router.push(`/calculator?residency=${status}`);
    };

    const StatusBadge = ({ status }: { status: ResidencyResult["status"] }) => {
        switch (status) {
            case "resident":
                return (
                    <Badge className="bg-green-500 text-white gap-1 text-lg py-1 px-3">
                        <CheckCircle className="h-4 w-4" />
                        Resident
                    </Badge>
                );
            case "non_resident":
                return (
                    <Badge className="bg-amber-500 text-white gap-1 text-lg py-1 px-3">
                        <XCircle className="h-4 w-4" />
                        Non-resident
                    </Badge>
                );
            default:
                return (
                    <Badge className="bg-blue-500 text-white gap-1 text-lg py-1 px-3">
                        <HelpCircle className="h-4 w-4" />
                        Uncertain
                    </Badge>
                );
        }
    };

    return (
        <TooltipProvider>
            <div className="container mx-auto max-w-2xl px-4 py-12">
                <div className="text-center mb-8">
                    <h1 className="text-3xl font-bold mb-2">Residency Status Checker</h1>
                    <p className="text-muted-foreground">
                        Determine if you&apos;re a tax resident of Vietnam for PIT purposes.
                    </p>
                </div>

                {/* Progress */}
                <div className="mb-8">
                    <div className="flex justify-between text-sm text-muted-foreground mb-2">
                        {steps.map((s, i) => (
                            <span key={s.key} className={step === s.key ? "text-foreground font-medium" : ""}>
                                {s.label}
                            </span>
                        ))}
                    </div>
                    <Progress value={progress} className="h-2" />
                </div>

                <Card>
                    <CardContent className="pt-6">
                        {/* Step 1: Presence */}
                        {step === "presence" && (
                            <div className="space-y-6">
                                <div>
                                    <div className="flex items-center gap-2 mb-2">
                                        <Label htmlFor="entryDate">First Entry Date to Vietnam</Label>
                                        <Tooltip>
                                            <TooltipTrigger>
                                                <Info className="h-4 w-4 text-muted-foreground" />
                                            </TooltipTrigger>
                                            <TooltipContent>
                                                <p className="max-w-xs">The first date you entered Vietnam during the tax year in question.</p>
                                            </TooltipContent>
                                        </Tooltip>
                                    </div>
                                    <Input
                                        id="entryDate"
                                        type="date"
                                        value={firstEntryDate}
                                        onChange={(e) => setFirstEntryDate(e.target.value)}
                                    />
                                </div>

                                <div>
                                    <div className="flex items-center gap-2 mb-2">
                                        <Label htmlFor="daysPresent">Total Days Present in Vietnam</Label>
                                        <Tooltip>
                                            <TooltipTrigger>
                                                <Info className="h-4 w-4 text-muted-foreground" />
                                            </TooltipTrigger>
                                            <TooltipContent>
                                                <p className="max-w-xs">Count partial days as full days. Both arrival and departure days count as present.</p>
                                            </TooltipContent>
                                        </Tooltip>
                                    </div>
                                    <Input
                                        id="daysPresent"
                                        type="number"
                                        min={0}
                                        max={365}
                                        value={daysPresent || ""}
                                        onChange={(e) => setDaysPresent(parseInt(e.target.value) || 0)}
                                        placeholder="e.g., 200"
                                    />
                                    <p className="text-xs text-muted-foreground mt-1">
                                        183+ days = automatic residency
                                    </p>
                                </div>
                            </div>
                        )}

                        {/* Step 2: Housing */}
                        {step === "housing" && (
                            <div className="space-y-6">
                                <p className="text-sm text-muted-foreground">
                                    These are secondary indicators. They can establish residency even with less than 183 days.
                                </p>

                                <div>
                                    <Label className="mb-3 block">Do you have registered permanent residence in Vietnam?</Label>
                                    <RadioGroup
                                        value={hasPermanentResidence === undefined ? "" : hasPermanentResidence ? "yes" : "no"}
                                        onValueChange={(v) => setHasPermanentResidence(v === "yes")}
                                    >
                                        <div className="flex items-center space-x-2">
                                            <RadioGroupItem value="yes" id="perm-yes" />
                                            <Label htmlFor="perm-yes" className="cursor-pointer">Yes</Label>
                                        </div>
                                        <div className="flex items-center space-x-2">
                                            <RadioGroupItem value="no" id="perm-no" />
                                            <Label htmlFor="perm-no" className="cursor-pointer">No</Label>
                                        </div>
                                    </RadioGroup>
                                </div>

                                <div>
                                    <Label className="mb-3 block">Do you have a rental contract ≥183 days in Vietnam?</Label>
                                    <RadioGroup
                                        value={hasRentalContract === undefined ? "" : hasRentalContract ? "yes" : "no"}
                                        onValueChange={(v) => setHasRentalContract(v === "yes")}
                                    >
                                        <div className="flex items-center space-x-2">
                                            <RadioGroupItem value="yes" id="rental-yes" />
                                            <Label htmlFor="rental-yes" className="cursor-pointer">Yes</Label>
                                        </div>
                                        <div className="flex items-center space-x-2">
                                            <RadioGroupItem value="no" id="rental-no" />
                                            <Label htmlFor="rental-no" className="cursor-pointer">No</Label>
                                        </div>
                                    </RadioGroup>
                                </div>
                            </div>
                        )}

                        {/* Step 3: Result */}
                        {step === "result" && result && (
                            <div className="space-y-6">
                                <div className="text-center">
                                    <StatusBadge status={result.status} />
                                    <p className="text-sm text-muted-foreground mt-2">
                                        Confidence: <span className="font-medium">{result.confidence}</span>
                                    </p>
                                </div>

                                <div>
                                    <h4 className="font-medium mb-2">Factors Considered:</h4>
                                    <ul className="space-y-1">
                                        {result.factors.map((f, i) => (
                                            <li key={i} className="text-sm text-muted-foreground flex items-start gap-2">
                                                <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 shrink-0" />
                                                {f}
                                            </li>
                                        ))}
                                    </ul>
                                </div>

                                {result.whatWouldChange.length > 0 && (
                                    <div>
                                        <h4 className="font-medium mb-2">What Would Change This:</h4>
                                        <ul className="space-y-1">
                                            {result.whatWouldChange.map((w, i) => (
                                                <li key={i} className="text-sm text-muted-foreground flex items-start gap-2">
                                                    <Info className="h-4 w-4 text-blue-500 mt-0.5 shrink-0" />
                                                    {w}
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                )}

                                <Button onClick={handleUseInCalculator} className="w-full gap-2 bg-green-500 hover:bg-green-600 cursor-pointer">
                                    Use This Result in Calculator
                                    <ChevronRight className="h-4 w-4" />
                                </Button>
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* Navigation */}
                <div className="flex justify-between mt-6">
                    <Button
                        variant="outline"
                        onClick={handleBack}
                        disabled={step === "presence"}
                        className="gap-1 cursor-pointer"
                    >
                        <ChevronLeft className="h-4 w-4" />
                        Back
                    </Button>

                    {step !== "result" && (
                        <Button onClick={handleNext} className="gap-1 cursor-pointer">
                            Next
                            <ChevronRight className="h-4 w-4" />
                        </Button>
                    )}
                </div>
            </div>
        </TooltipProvider>
    );
}
