"use client";

import Link from "next/link";
import { ArrowRight, Calculator, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";

export function HeroSection() {
    return (
        <section className="relative py-20 lg:py-0 lg:min-h-[calc(100vh-4rem)] flex items-center overflow-hidden">
            {/* Background Effects */}
            <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)] pointer-events-none" />
            <div className="absolute inset-0 bg-gradient-to-br from-green-500/5 via-transparent to-blue-500/5 pointer-events-none" />
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-green-500/20 rounded-full blur-3xl opacity-20 pointer-events-none" />

            <div className="container mx-auto max-w-7xl px-4 relative z-10 grid lg:grid-cols-2 gap-12 items-center">
                {/* Left Content */}
                <motion.div
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.6, ease: "easeOut" }}
                    className="text-center lg:text-left pt-10 lg:pt-0"
                >
                    <div className="inline-flex items-center rounded-full border border-green-500/30 bg-green-500/10 px-3 py-1 text-sm font-medium text-green-500 mb-6">
                        <span className="flex h-2 w-2 rounded-full bg-green-500 mr-2 animate-pulse"></span>
                        Updated for 2026 Rules
                    </div>

                    <h1 className="text-4xl md:text-5xl lg:text-7xl font-bold tracking-tight mb-6 leading-[1.1]">
                        Estimate Your <br className="hidden lg:block" />
                        <span className="text-transparent bg-clip-text bg-gradient-to-r from-green-400 to-blue-500">
                            Vietnam PIT
                        </span>
                    </h1>

                    <p className="text-lg md:text-xl text-muted-foreground mb-8 max-w-2xl mx-auto lg:mx-0 leading-relaxed">
                        The professional tax calculator for expats. <br className="hidden md:inline" />
                        Get audit-friendly breakdowns with legally cited sources.
                    </p>

                    <div className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-4">
                        <Button asChild size="lg" className="h-12 px-8 text-base gap-2 bg-gradient-to-r from-green-600 to-green-500 hover:from-green-500 hover:to-green-400 text-white shadow-lg shadow-green-500/25 transition-all w-full sm:w-auto">
                            <Link href="/calculator">
                                <Calculator className="h-5 w-5" />
                                Start Estimate
                            </Link>
                        </Button>

                        <Button asChild variant="outline" size="lg" className="h-12 px-8 text-base gap-2 border-border/50 hover:bg-accent/50 w-full sm:w-auto">
                            <Link href="/residency">
                                <Users className="h-5 w-5" />
                                Check Residency
                            </Link>
                        </Button>
                    </div>
                </motion.div>

                {/* Right Visual */}
                <motion.div
                    initial={{ opacity: 0, scale: 0.95, y: 20 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    transition={{ duration: 0.8, delay: 0.2, ease: "easeOut" }}
                    className="relative mx-auto max-w-[500px] lg:max-w-none w-full"
                >
                    <div className="relative rounded-2xl overflow-hidden border border-white/10 shadow-2xl shadow-green-500/10 bg-black/40 backdrop-blur-sm group">
                        <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent pointer-events-none" />
                        <img
                            src="/hero-ui-mock.png"
                            alt="Vietnam Tax Calculator Preview"
                            className="w-full h-auto transform transition-transform duration-700 group-hover:scale-105"
                        />
                    </div>
                    {/* Decorative Elements */}
                    <div className="absolute -z-10 -top-10 -right-10 w-40 h-40 bg-blue-500/30 rounded-full blur-3xl opacity-40 animate-pulse" />
                    <div className="absolute -z-10 -bottom-10 -left-10 w-40 h-40 bg-green-500/30 rounded-full blur-3xl opacity-40 animate-pulse delay-75" />
                </motion.div>
            </div>
        </section>
    );
}
