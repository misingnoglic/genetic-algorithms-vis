import { describe, it, expect, beforeEach } from 'vitest';
import { BooleanSatState, BooleanSatProblem, parse, tokenize, evaluateAST } from './boolean-sat.js';

describe('Boolean Satisfiability Logic', () => {

    describe('Parser and AST', () => {
        it('should correctly parse and evaluate a simple AND expression', () => {
            const tokens = tokenize('A ^ B');
            const vars = new Set();
            const ast = parse(tokens, vars);
            
            expect(Array.from(vars)).toEqual(['A', 'B']);
            expect(evaluateAST(ast, { A: true, B: true })).toBe(true);
            expect(evaluateAST(ast, { A: true, B: false })).toBe(false);
            // Null logic short circuiting
            expect(evaluateAST(ast, { A: false, B: null })).toBe(false);
            expect(evaluateAST(ast, { A: true, B: null })).toBe(null);
        });

        it('should correctly parse and evaluate a complex expression with NOT and OR', () => {
            const tokens = tokenize('P ^ (~Q v R)');
            const vars = new Set();
            const ast = parse(tokens, vars);
            
            expect(evaluateAST(ast, { P: true, Q: false, R: false })).toBe(true);
            expect(evaluateAST(ast, { P: true, Q: true, R: false })).toBe(false);
            expect(evaluateAST(ast, { P: true, Q: true, R: true })).toBe(true);
        });
    });

    describe('BooleanSatState', () => {
        it('should report placedCount and isPartial correctly', () => {
            const state = new BooleanSatState(['A', 'B'], { A: true, B: null }, null);
            expect(state.placedCount).toBe(1);
            expect(state.isPartial).toBe(true);
            
            const state2 = new BooleanSatState(['A', 'B'], { A: true, B: false }, null);
            expect(state2.placedCount).toBe(2);
            expect(state2.isPartial).toBe(false);
        });

        it('should calculate cost properly', () => {
            // Formula: A ^ B
            const tokens = tokenize('A ^ B');
            const ast = parse(tokens, new Set());
            
            const statePass = new BooleanSatState(['A', 'B'], { A: true, B: true }, ast);
            expect(statePass.cost).toBe(0);
            
            const stateFail = new BooleanSatState(['A', 'B'], { A: true, B: false }, ast);
            // One false clause => 1 cost
            expect(stateFail.cost).toBe(1);
            
            const statePartial = new BooleanSatState(['A', 'B'], { A: true, B: null }, ast);
            // Missing 1 variable -> penalty + whatever evaluates to false
            expect(statePartial.cost).toBe(1000); // 1 * 1000 penalty
        });
    });

    describe('CSP Functions', () => {
        const expression = 'A ^ (~B v C)';
        let emptyState;

        beforeEach(() => {
            emptyState = BooleanSatProblem.emptyState({ mode: 'custom', customExpression: expression });
        });

        it('should return all 2 values [true, false] for variable domains', () => {
            const domains = BooleanSatProblem.initializeDomains(emptyState);
            expect(domains['A']).toEqual([true, false]);
        });

        it('should properly apply moves without mutating original state', () => {
            const nextState = BooleanSatProblem.applyMove(emptyState, 'A', true, emptyState.domains);
            expect(emptyState.assignments['A']).toBe(null);
            expect(nextState.assignments['A']).toBe(true);
            expect(nextState.isPartial).toBe(true);
            expect(BooleanSatProblem.getUnassignedVariables(nextState)).toEqual(['B', 'C']);
        });

        it('should propagate forward checking and prune failing branches', () => {
            // A must be true for the expression to be true. If we apply A = false, 
            // the whole expression evaluates to FALSE instantly, so Forward Checking should fail.
            const { success, domains } = BooleanSatProblem.propagate(emptyState, 'A', false);
            expect(success).toBe(false);
            
            // If we assign A = true, it's fine.
            const { success: success2 } = BooleanSatProblem.propagate(emptyState, 'A', true);
            expect(success2).toBe(true);
            
            // From A=true state, if we assign B=true, it's still possible if C=true.
            const stateAfterA = BooleanSatProblem.applyMove(emptyState, 'A', true, emptyState.domains);
            const { success: success3 } = BooleanSatProblem.propagate(stateAfterA, 'B', true);
            expect(success3).toBe(true); // C can still be true
            
            // Now apply B=true too. C must be true.
            const stateAfterB = BooleanSatProblem.applyMove(stateAfterA, 'B', true, stateAfterA.domains);
            const { success: successFail } = BooleanSatProblem.propagate(stateAfterB, 'C', false);
            expect(successFail).toBe(false); // C=false makes it fail
            
            const { success: successPass } = BooleanSatProblem.propagate(stateAfterB, 'C', true);
            expect(successPass).toBe(true);
        });

        it('should confirm solution correctly', () => {
            const statePass = BooleanSatProblem.applyMove(emptyState, 'A', true, emptyState.domains);
            const statePass2 = BooleanSatProblem.applyMove(statePass, 'B', false, emptyState.domains);
            const finalState = BooleanSatProblem.applyMove(statePass2, 'C', false, emptyState.domains);
            
            expect(finalState.isPartial).toBe(false);
            expect(BooleanSatProblem.isSolution(finalState)).toBe(true);
        });
    });
});
