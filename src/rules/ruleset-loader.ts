// Ruleset Loader - Loads and validates versioned rules from JSON files
// Provides runtime access to constants, tax tables, and decision rules

import { RulesCatalogSchema, type RulesCatalog, type Constant, type TaxTable, type DecisionRule, type Exemption } from './schema/rules-catalog.schema';

// Import the 2026 ruleset (in production, this could be dynamic)
import VN_PIT_2026_DATA from './VN_PIT_2026.json';

// ==================== RULESET STORAGE ====================

let loadedCatalog: RulesCatalog | null = null;

/**
 * Load and validate the rules catalog
 * Call this at app initialization
 */
export function loadRulesCatalog(): RulesCatalog {
    if (loadedCatalog) {
        return loadedCatalog;
    }

    // Validate against schema
    const result = RulesCatalogSchema.safeParse(VN_PIT_2026_DATA);

    if (!result.success) {
        console.error('Rules catalog validation failed:', result.error.format());
        throw new Error(`Invalid rules catalog: ${result.error.message}`);
    }

    loadedCatalog = result.data;
    return loadedCatalog;
}

/**
 * Get the active ruleset for a given date
 */
export function getActiveRuleset(date: Date = new Date()): string | null {
    const catalog = loadRulesCatalog();
    const dateStr = date.toISOString().split('T')[0];

    const activeRuleset = catalog.rulesets.find(rs => {
        const from = rs.effective_from;
        const to = rs.effective_to;
        return dateStr >= from && (to === null || dateStr <= to);
    });

    return activeRuleset?.ruleset_id ?? null;
}

// ==================== CONSTANTS ACCESS ====================

/**
 * Get a constant value by key
 */
export function getConstant(key: string, date: Date = new Date()): number | null {
    const catalog = loadRulesCatalog();
    const dateStr = date.toISOString().split('T')[0];

    const constant = catalog.constants.find(c => {
        if (c.key !== key) return false;
        const from = c.effective_from;
        const to = c.effective_to;
        return dateStr >= from && (to === null || dateStr <= to);
    });

    return constant?.value ?? null;
}

/**
 * Get constant with full metadata
 */
export function getConstantWithMeta(key: string, date: Date = new Date()): Constant | null {
    const catalog = loadRulesCatalog();
    const dateStr = date.toISOString().split('T')[0];

    return catalog.constants.find(c => {
        if (c.key !== key) return false;
        const from = c.effective_from;
        const to = c.effective_to;
        return dateStr >= from && (to === null || dateStr <= to);
    }) ?? null;
}

/**
 * Get all constants as a key-value map
 */
export function getAllConstants(date: Date = new Date()): Record<string, number> {
    const catalog = loadRulesCatalog();
    const dateStr = date.toISOString().split('T')[0];

    const result: Record<string, number> = {};

    for (const c of catalog.constants) {
        const from = c.effective_from;
        const to = c.effective_to;
        if (dateStr >= from && (to === null || dateStr <= to)) {
            result[c.key] = c.value;
        }
    }

    return result;
}

// ==================== TAX TABLES ACCESS ====================

/**
 * Get a tax table by ID
 */
export function getTaxTable(tableId: string, date: Date = new Date()): TaxTable | null {
    const catalog = loadRulesCatalog();
    const dateStr = date.toISOString().split('T')[0];

    return catalog.tax_tables.find(t => {
        if (t.table_id !== tableId) return false;
        const from = t.effective_from;
        const to = t.effective_to;
        return dateStr >= from && (to === null || dateStr <= to);
    }) ?? null;
}

/**
 * Get tax table by scope
 */
export function getTaxTableByScope(
    scope: 'resident_employment_income' | 'nonresident_employment_income',
    date: Date = new Date()
): TaxTable | null {
    const catalog = loadRulesCatalog();
    const dateStr = date.toISOString().split('T')[0];

    return catalog.tax_tables.find(t => {
        if (t.scope !== scope) return false;
        const from = t.effective_from;
        const to = t.effective_to;
        return dateStr >= from && (to === null || dateStr <= to);
    }) ?? null;
}

// ==================== DECISION RULES ACCESS ====================

/**
 * Get a decision rule by ID
 */
export function getDecisionRule(ruleId: string, date: Date = new Date()): DecisionRule | null {
    const catalog = loadRulesCatalog();
    const dateStr = date.toISOString().split('T')[0];

    return catalog.decision_rules.find(r => {
        if (r.rule_id !== ruleId) return false;
        const from = r.effective_from;
        const to = r.effective_to;
        return dateStr >= from && (to === null || dateStr <= to);
    }) ?? null;
}

// ==================== EXEMPTIONS ACCESS ====================

/**
 * Get an exemption rule by ID
 */
export function getExemption(exemptionId: string, date: Date = new Date()): Exemption | null {
    const catalog = loadRulesCatalog();
    const dateStr = date.toISOString().split('T')[0];

    return catalog.exemptions.find(e => {
        if (e.exemption_id !== exemptionId) return false;
        const from = e.effective_from;
        const to = e.effective_to;
        return dateStr >= from && (to === null || dateStr <= to);
    }) ?? null;
}

// ==================== GLOSSARY ACCESS ====================

/**
 * Get all glossary terms
 */
export function getGlossary(): Array<{ term: string; definition: string; notes?: string }> {
    const catalog = loadRulesCatalog();
    return catalog.glossary;
}

/**
 * Get a glossary term definition
 */
export function getTermDefinition(term: string): string | null {
    const catalog = loadRulesCatalog();
    const entry = catalog.glossary.find(g =>
        g.term.toLowerCase() === term.toLowerCase()
    );
    return entry?.definition ?? null;
}

// ==================== VALIDATION RULES ACCESS ====================

/**
 * Get validation rules for a specific context
 */
export function getValidationRules(appliesTo: string): Array<{ id: string; rule: string }> {
    const catalog = loadRulesCatalog();
    return catalog.validation_rules
        .filter(v => v.applies_to === appliesTo)
        .map(v => ({ id: v.validation_id, rule: v.rule }));
}

// ==================== CONVENIENCE EXPORTS ====================

export {
    type RulesCatalog,
    type Constant,
    type TaxTable,
    type DecisionRule,
    type Exemption,
} from './schema/rules-catalog.schema';
