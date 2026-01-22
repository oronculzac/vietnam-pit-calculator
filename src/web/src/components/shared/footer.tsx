import Link from "next/link";
import { Github, ExternalLink, AlertTriangle } from "lucide-react";

export function Footer() {
    return (
        <footer className="border-t border-border/40 bg-background">
            <div className="container mx-auto max-w-7xl px-4 py-8">
                {/* Disclaimer */}
                <div className="mb-6 flex items-start gap-3 rounded-lg border border-amber-500/30 bg-amber-500/5 p-4">
                    <AlertTriangle className="h-5 w-5 text-amber-500 flex-shrink-0 mt-0.5" />
                    <p className="text-sm text-muted-foreground">
                        <span className="font-semibold text-amber-500">Disclaimer:</span>{" "}
                        This calculator provides estimates only and does not constitute legal or tax advice.
                        Always consult a qualified tax professional for official guidance.
                    </p>
                </div>

                {/* Links and Copyright */}
                <div className="flex flex-col md:flex-row items-center justify-between gap-4">
                    <p className="text-sm text-muted-foreground">
                        © {new Date().getFullYear()} Vietnam PIT Calculator. Open source.
                    </p>

                    <div className="flex items-center gap-6">
                        <Link
                            href="/sources"
                            className="text-sm text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1 cursor-pointer"
                        >
                            <ExternalLink className="h-3.5 w-3.5" />
                            Legal Sources
                        </Link>
                        <Link
                            href="https://github.com/oronculzac/vietnam-pit-calculator"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-sm text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1 cursor-pointer"
                        >
                            <Github className="h-4 w-4" />
                            GitHub
                        </Link>
                    </div>
                </div>
            </div>
        </footer>
    );
}
