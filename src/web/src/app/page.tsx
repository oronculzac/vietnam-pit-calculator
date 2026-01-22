import Link from "next/link";
import { ArrowRight, Shield, Calculator, Scale, FileCheck, Clock, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function HomePage() {
  return (
    <div className="flex flex-col">
      {/* Hero Section */}
      <section className="relative py-20 lg:py-32 overflow-hidden">
        {/* Background gradient */}
        <div className="absolute inset-0 bg-gradient-to-br from-green-500/10 via-transparent to-blue-500/5" />

        <div className="container mx-auto max-w-7xl px-4 relative z-10">
          <div className="max-w-3xl mx-auto text-center">
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
          </div>
        </div>
      </section>

      {/* Trust Strip */}
      <section className="py-16 border-y border-border/40 bg-muted/30">
        <div className="container mx-auto max-w-7xl px-4">
          <div className="grid md:grid-cols-3 gap-6">
            <Card className="bg-background/50 border-border/50">
              <CardHeader className="pb-2">
                <Shield className="h-8 w-8 text-amber-500 mb-2" />
                <CardTitle className="text-lg">Estimates Only</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription>
                  Not legal advice. Always verify with a tax professional before making decisions.
                </CardDescription>
              </CardContent>
            </Card>

            <Card className="bg-background/50 border-border/50">
              <CardHeader className="pb-2">
                <FileCheck className="h-8 w-8 text-green-500 mb-2" />
                <CardTitle className="text-lg">Calculations + Citations</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription>
                  Every number shows the formula used and links to the official legal source.
                </CardDescription>
              </CardContent>
            </Card>

            <Card className="bg-background/50 border-border/50">
              <CardHeader className="pb-2">
                <Clock className="h-8 w-8 text-blue-500 mb-2" />
                <CardTitle className="text-lg">Versioned by Tax Year</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription>
                  Rules change each year. We track versions so you always know which rules apply.
                </CardDescription>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Quick Links */}
      <section className="py-16">
        <div className="container mx-auto max-w-7xl px-4">
          <h2 className="text-2xl font-semibold mb-8 text-center">Quick Links</h2>

          <div className="grid sm:grid-cols-2 gap-4 max-w-2xl mx-auto">
            <Link href="/changelog" className="group cursor-pointer">
              <Card className="transition-all duration-200 hover:border-green-500/50 hover:shadow-lg hover:shadow-green-500/5">
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2 group-hover:text-green-500 transition-colors">
                    <Scale className="h-5 w-5" />
                    What changed in 2026?
                    <ArrowRight className="h-4 w-4 ml-auto opacity-0 group-hover:opacity-100 transition-opacity" />
                  </CardTitle>
                </CardHeader>
                <CardContent className="-mt-2">
                  <CardDescription>
                    New deduction amounts, simplified brackets, and more.
                  </CardDescription>
                </CardContent>
              </Card>
            </Link>

            <Link href="/residency" className="group cursor-pointer">
              <Card className="transition-all duration-200 hover:border-blue-500/50 hover:shadow-lg hover:shadow-blue-500/5">
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2 group-hover:text-blue-500 transition-colors">
                    <Users className="h-5 w-5" />
                    Resident vs Non-resident?
                    <ArrowRight className="h-4 w-4 ml-auto opacity-0 group-hover:opacity-100 transition-opacity" />
                  </CardTitle>
                </CardHeader>
                <CardContent className="-mt-2">
                  <CardDescription>
                    Your residency status significantly affects your tax rate.
                  </CardDescription>
                </CardContent>
              </Card>
            </Link>
          </div>
        </div>
      </section>

      {/* 2026 Highlights */}
      <section className="py-16 bg-muted/30 border-t border-border/40">
        <div className="container mx-auto max-w-7xl px-4">
          <h2 className="text-2xl font-semibold mb-8 text-center">2026 Key Numbers</h2>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-4xl mx-auto">
            <div className="text-center p-6 rounded-lg bg-background border border-border/50">
              <div className="text-3xl font-mono font-bold text-green-500">15.5M</div>
              <div className="text-sm text-muted-foreground mt-1">Taxpayer Deduction</div>
              <div className="text-xs text-muted-foreground">VND/month</div>
            </div>

            <div className="text-center p-6 rounded-lg bg-background border border-border/50">
              <div className="text-3xl font-mono font-bold text-green-500">6.2M</div>
              <div className="text-sm text-muted-foreground mt-1">Per Dependent</div>
              <div className="text-xs text-muted-foreground">VND/month</div>
            </div>

            <div className="text-center p-6 rounded-lg bg-background border border-border/50">
              <div className="text-3xl font-mono font-bold text-blue-500">5</div>
              <div className="text-sm text-muted-foreground mt-1">Tax Brackets</div>
              <div className="text-xs text-muted-foreground">5% - 35%</div>
            </div>

            <div className="text-center p-6 rounded-lg bg-background border border-border/50">
              <div className="text-3xl font-mono font-bold text-amber-500">20%</div>
              <div className="text-sm text-muted-foreground mt-1">Non-resident Rate</div>
              <div className="text-xs text-muted-foreground">Flat rate</div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
