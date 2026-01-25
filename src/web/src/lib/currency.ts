// Currency conversion utilities for Vietnam PIT Calculator
// Provides VND ↔ USD conversion for expat users

// Default exchange rate (approximate market rate)
// Note: For production, fetch from an API like exchangerate-api.com
export const USD_VND_RATE = 25_400; // 1 USD = 25,400 VND (Jan 2026 approx)

export type Currency = 'VND' | 'USD';

/**
 * Convert VND to USD
 */
export function vndToUsd(vnd: number): number {
    return vnd / USD_VND_RATE;
}

/**
 * Convert USD to VND
 */
export function usdToVnd(usd: number): number {
    return usd * USD_VND_RATE;
}

/**
 * Format amount in specified currency
 * Assumes input amount is always in VND, converts to USD when needed
 */
export function formatCurrency(vndAmount: number, currency: Currency): string {
    if (currency === 'USD') {
        const usdAmount = vndToUsd(vndAmount);
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD',
            minimumFractionDigits: 0,
            maximumFractionDigits: 0,
        }).format(usdAmount);
    }

    return new Intl.NumberFormat('vi-VN', {
        style: 'currency',
        currency: 'VND',
        maximumFractionDigits: 0,
    }).format(vndAmount);
}

/**
 * Format amount in both currencies
 */
export function formatDualCurrency(vndAmount: number): { vnd: string; usd: string } {
    return {
        vnd: formatCurrency(vndAmount, 'VND'),
        usd: formatCurrency(vndToUsd(vndAmount), 'USD'),
    };
}

/**
 * Parse input amount based on currency
 * Returns VND amount regardless of input currency
 */
export function parseToVnd(amount: number, inputCurrency: Currency): number {
    if (inputCurrency === 'USD') {
        return usdToVnd(amount);
    }
    return amount;
}

/**
 * Convert VND amount to display currency
 */
export function convertForDisplay(vndAmount: number, displayCurrency: Currency): number {
    if (displayCurrency === 'USD') {
        return vndToUsd(vndAmount);
    }
    return vndAmount;
}
