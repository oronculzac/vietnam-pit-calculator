"use client";

import { motion, AnimatePresence } from "framer-motion";

interface AnimatedWizardProps {
    step: string;
    children: React.ReactNode;
}

const variants = {
    enter: (direction: number) => ({
        x: direction > 0 ? 50 : -50,
        opacity: 0,
        scale: 0.98,
    }),
    center: {
        zIndex: 1,
        x: 0,
        opacity: 1,
        scale: 1,
    },
    exit: (direction: number) => ({
        zIndex: 0,
        x: direction < 0 ? 50 : -50,
        opacity: 0,
        scale: 0.98,
    }),
};

export function AnimatedWizardWrapper({ step, children }: AnimatedWizardProps) {
    // We'll use a simple fade+slide for now, direction tracking requires tracking prev step
    // Ideally, passing `direction` prop based on next/back click would be better
    // But for simple "pro" feel, subtle fade+scale is safest without direction logic complexity

    return (
        <AnimatePresence mode="wait">
            <motion.div
                key={step}
                initial={{ opacity: 0, x: 20, scale: 0.98 }}
                animate={{ opacity: 1, x: 0, scale: 1 }}
                exit={{ opacity: 0, x: -20, scale: 0.98 }}
                transition={{ duration: 0.3, ease: "easeInOut" }}
                className="w-full"
            >
                {children}
            </motion.div>
        </AnimatePresence>
    );
}
