"use client";

import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from "recharts";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { formatVND, formatPercent } from "@/lib/constants";

interface ResultsChartProps {
    grossIncome: number;
    netIncome: number;
    taxLiability: number;
    insurance: number;
}

export function ResultsChart({
    grossIncome,
    netIncome,
    taxLiability,
    insurance
}: ResultsChartProps) {

    const data = [
        { name: "Net Income", value: netIncome, color: "#22C55E" }, // Green-500
        { name: "Tax Liability", value: taxLiability, color: "#EF4444" }, // Red-500
        { name: "Insurance", value: insurance, color: "#3B82F6" }, // Blue-500
    ].filter(item => item.value > 0);

    const CustomTooltip = ({ active, payload }: any) => {
        if (active && payload && payload.length) {
            const data = payload[0].payload;
            return (
                <div className="bg-background/95 border border-border/50 p-2 rounded-lg shadow-lg backdrop-blur-sm text-xs">
                    <p className="font-semibold text-foreground">{data.name}</p>
                    <p className="font-mono text-muted-foreground">
                        {formatVND(data.value)}
                    </p>
                    <p className="font-mono text-xs text-muted-foreground mt-1">
                        {formatPercent(data.value / grossIncome)} of gross
                    </p>
                </div>
            );
        }
        return null;
    };

    return (
        <Card className="h-full border-muted/40 bg-muted/5">
            <CardHeader className="pb-2">
                <CardTitle className="text-base font-medium text-center">Where does your money go?</CardTitle>
                <CardDescription className="text-center text-xs">Monthly breakdown</CardDescription>
            </CardHeader>
            <CardContent className="h-[250px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                        <Pie
                            data={data}
                            cx="50%"
                            cy="50%"
                            innerRadius={60}
                            outerRadius={80}
                            paddingAngle={2}
                            dataKey="value"
                            stroke="none"
                            cornerRadius={5}
                        >
                            {data.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={entry.color} />
                            ))}
                        </Pie>
                        <Tooltip content={<CustomTooltip />} />
                        <Legend
                            verticalAlign="bottom"
                            height={36}
                            iconType="circle"
                            iconSize={8}
                            formatter={(value) => <span className="text-xs text-muted-foreground ml-1">{value}</span>}
                        />
                    </PieChart>
                </ResponsiveContainer>
            </CardContent>
        </Card>
    );
}
