"use client";

import Link from "next/link";
import { ArrowRight, Calculator, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";

export function HeroSection() {
    return (
        <section className="relative py-20 lg:py-32 overflow-hidden">
            {/* Background gradient */}
            <div className="absolute inset-0 bg-gradient-to-br from-green-500/10 via-transparent to-blue-500/5" />

            <div className="container mx-auto max-w-7xl px-4 relative z-10">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5 }}
                    className="max-w-3xl mx-auto text-center"
                >
                    <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight mb-6">
                        Estimate Vietnam Personal Income Tax
                        <span className="text-green-500"> — Expats — </span>
                        <span className="text-muted-foreground">2026 Rules</span>
                    </h1>

                    <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
                        Audit-friendly breakdowns with legal citations.
                        Know exactly how your tax is calculated and which rules apply.
                    </p>

                    <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                        <Button asChild size="lg" className="gap-2 bg-green-500 hover:bg-green-600 text-white cursor-pointer">
                            <Link href="/calculator">
                                <Calculator className="h-5 w-5" />
                                Start PIT Estimate
                                <ArrowRight className="h-4 w-4" />
                            </Link>
                        </Button>

                        <Button asChild variant="outline" size="lg" className="gap-2 cursor-pointer">
                            <Link href="/residency">
                                <Users className="h-5 w-5" />
                                Check Residency
                            </Link>
                        </Button>
                    </div>
                </motion.div>
            </div>
        </section>
    );
}
