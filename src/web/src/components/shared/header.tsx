"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Calculator, Home, HelpCircle, FileText, History, Users, Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState, useEffect } from "react";

const navLinks = [
    { href: "/", label: "Home", icon: Home },
    { href: "/residency", label: "Residency", icon: Users },
    { href: "/calculator", label: "Calculator", icon: Calculator },
    { href: "/explain", label: "FAQ", icon: HelpCircle },
    { href: "/sources", label: "Sources", icon: FileText },
    { href: "/changelog", label: "Changelog", icon: History },
];

export function Header() {
    const pathname = usePathname();
    const [isDark, setIsDark] = useState(true);

    useEffect(() => {
        const isDarkMode = document.documentElement.classList.contains("dark");
        setIsDark(isDarkMode);
    }, []);

    const toggleTheme = () => {
        const html = document.documentElement;
        if (isDark) {
            html.classList.remove("dark");
            setIsDark(false);
        } else {
            html.classList.add("dark");
            setIsDark(true);
        }
    };

    return (
        <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
            <div className="container mx-auto flex h-16 max-w-7xl items-center justify-between px-4">
                {/* Logo */}
                <Link
                    href="/"
                    className="flex items-center gap-2 font-semibold text-lg transition-colors hover:text-primary cursor-pointer"
                >
                    <Calculator className="h-6 w-6 text-green-500" />
                    <span className="hidden sm:inline">VN PIT Calculator</span>
                </Link>

                {/* Navigation */}
                <nav className="flex items-center gap-1">
                    {navLinks.map(({ href, label, icon: Icon }) => {
                        const isActive = pathname === href;
                        return (
                            <Link
                                key={href}
                                href={href}
                                className={`flex items-center gap-1.5 px-3 py-2 text-sm font-medium rounded-md transition-colors cursor-pointer ${isActive
                                        ? "bg-primary/10 text-primary"
                                        : "text-muted-foreground hover:text-foreground hover:bg-accent"
                                    }`}
                            >
                                <Icon className="h-4 w-4" />
                                <span className="hidden md:inline">{label}</span>
                            </Link>
                        );
                    })}
                </nav>

                {/* Theme Toggle */}
                <Button
                    variant="ghost"
                    size="icon"
                    onClick={toggleTheme}
                    className="cursor-pointer"
                    aria-label="Toggle theme"
                >
                    {isDark ? (
                        <Sun className="h-5 w-5 text-yellow-500" />
                    ) : (
                        <Moon className="h-5 w-5" />
                    )}
                </Button>
            </div>
        </header>
    );
}
