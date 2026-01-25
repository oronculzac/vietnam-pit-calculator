import Link from "next/link";
import { ArrowRight, Shield, Scale, FileCheck, Clock, Users } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { HeroSection } from "@/components/home/hero-section";

export default function HomePage() {
  return (
    <div className="flex flex-col min-h-screen">
      <HeroSection />

      {/* Features Grid (Bento Style) */}
      <section className="py-24 bg-muted/20 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-background to-muted/20 pointer-events-none" />

        <div className="container mx-auto max-w-7xl px-4 relative z-10">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold tracking-tight mb-4">Why use VietTax Pro?</h2>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
              We separate ourselves from generic calculators by focusing on accuracy, transparency, and legal compliance.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            <Card className="bg-background/40 backdrop-blur border-white/5 hover:border-amber-500/50 transition-all duration-300 hover:shadow-[0_0_30px_-5px_rgba(245,158,11,0.1)] group">
              <CardHeader>
                <div className="h-12 w-12 rounded-lg bg-amber-500/10 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300">
                  <Shield className="h-6 w-6 text-amber-500" />
                </div>
                <CardTitle className="text-xl">Estimates Only</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-base">
                  Not legal advice. Always verify with a tax professional before making decisions.
                </CardDescription>
              </CardContent>
            </Card>

            <Card className="bg-background/40 backdrop-blur border-white/5 hover:border-green-500/50 transition-all duration-300 hover:shadow-[0_0_30px_-5px_rgba(34,197,94,0.1)] group">
              <CardHeader>
                <div className="h-12 w-12 rounded-lg bg-green-500/10 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300">
                  <FileCheck className="h-6 w-6 text-green-500" />
                </div>
                <CardTitle className="text-xl">Calculations + Citations</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-base">
                  Every number shows the formula used and links to the official circular or resolution.
                </CardDescription>
              </CardContent>
            </Card>

            <Card className="bg-background/40 backdrop-blur border-white/5 hover:border-blue-500/50 transition-all duration-300 hover:shadow-[0_0_30px_-5px_rgba(59,130,246,0.1)] group">
              <CardHeader>
                <div className="h-12 w-12 rounded-lg bg-blue-500/10 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300">
                  <Clock className="h-6 w-6 text-blue-500" />
                </div>
                <CardTitle className="text-xl">Versioned by Tax Year</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-base">
                  Rules change each year. We track versions so you always know which rules apply.
                </CardDescription>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* 2026 Highlights - Stat Cards */}
      <section className="py-24 border-y border-white/5 bg-background relative">
        <div className="container mx-auto max-w-7xl px-4">
          <div className="flex items-center justify-between mb-12">
            <h2 className="text-2xl font-semibold">2026 Key Figures</h2>
            <div className="h-px flex-1 bg-border/50 ml-8"></div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-8">
            <div className="group p-6 rounded-2xl bg-muted/20 border border-transparent hover:border-green-500/30 transition-all">
              <div className="text-4xl font-mono font-bold text-green-500 mb-2 group-hover:scale-105 transition-transform origin-left">15.5M</div>
              <div className="font-medium">Taxpayer Deduction</div>
              <div className="text-sm text-muted-foreground">VND/month</div>
            </div>

            <div className="group p-6 rounded-2xl bg-muted/20 border border-transparent hover:border-green-500/30 transition-all">
              <div className="text-4xl font-mono font-bold text-green-500 mb-2 group-hover:scale-105 transition-transform origin-left">6.2M</div>
              <div className="font-medium">Per Dependent</div>
              <div className="text-sm text-muted-foreground">VND/month</div>
            </div>

            <div className="group p-6 rounded-2xl bg-muted/20 border border-transparent hover:border-blue-500/30 transition-all">
              <div className="text-4xl font-mono font-bold text-blue-500 mb-2 group-hover:scale-105 transition-transform origin-left">5</div>
              <div className="font-medium">Tax Brackets</div>
              <div className="text-sm text-muted-foreground">5% to 35%</div>
            </div>

            <div className="group p-6 rounded-2xl bg-muted/20 border border-transparent hover:border-amber-500/30 transition-all">
              <div className="text-4xl font-mono font-bold text-amber-500 mb-2 group-hover:scale-105 transition-transform origin-left">20%</div>
              <div className="font-medium">Non-resident Rate</div>
              <div className="text-sm text-muted-foreground">Flat tax rate</div>
            </div>
          </div>
        </div>
      </section>

      {/* Quick Links Navigation */}
      <section className="py-24">
        <div className="container mx-auto max-w-7xl px-4">
          <div className="grid sm:grid-cols-2 gap-6 max-w-4xl mx-auto">
            <Link href="/changelog" className="group cursor-pointer">
              <div className="h-full p-8 rounded-2xl border border-border bg-gradient-to-br from-muted/20 to-transparent hover:from-green-500/10 hover:to-green-500/5 hover:border-green-500/30 transition-all">
                <div className="flex items-center gap-3 mb-3">
                  <div className="p-2 rounded-md bg-background border border-border group-hover:border-green-500/30 transition-colors">
                    <Scale className="h-5 w-5 text-muted-foreground group-hover:text-green-500" />
                  </div>
                  <h3 className="text-lg font-semibold group-hover:text-green-500 transition-colors">What changed in 2026?</h3>
                  <ArrowRight className="h-4 w-4 ml-auto opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all text-green-500" />
                </div>
                <p className="text-muted-foreground">
                  Deep dive into new deduction amounts, verified circulars, and the latest resolution updates.
                </p>
              </div>
            </Link>

            <Link href="/residency" className="group cursor-pointer">
              <div className="h-full p-8 rounded-2xl border border-border bg-gradient-to-br from-muted/20 to-transparent hover:from-blue-500/10 hover:to-blue-500/5 hover:border-blue-500/30 transition-all">
                <div className="flex items-center gap-3 mb-3">
                  <div className="p-2 rounded-md bg-background border border-border group-hover:border-blue-500/30 transition-colors">
                    <Users className="h-5 w-5 text-muted-foreground group-hover:text-blue-500" />
                  </div>
                  <h3 className="text-lg font-semibold group-hover:text-blue-500 transition-colors">Residency Guide</h3>
                  <ArrowRight className="h-4 w-4 ml-auto opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all text-blue-500" />
                </div>
                <p className="text-muted-foreground">
                  Understand the 183-day rule and how your tax residency status drastically impacts your rate.
                </p>
              </div>
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
