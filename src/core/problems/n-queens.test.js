import { describe, it, expect } from 'vitest';
import { NQueensState, NQueensProblem } from './n-queens.js';

describe('N-Queens Logic', () => {

    describe('NQueensState', () => {
        it('should calculate cost correctly for a known solution (N=4)', () => {
            // Solution: [1, 3, 0, 2] (indices)
            // . Q . .
            // . . . Q
            // Q . . .
            // . . Q .
            const state = new NQueensState(4, [1, 3, 0, 2]);
            expect(state.cost).toBe(0);
        });

        it('should calculate cost correctly for a high-conflict state (N=4)', () => {
            // All queens in first column: [0, 0, 0, 0]
            // Attacks:
            // 0-1, 0-2, 0-3
            // 1-2, 1-3
            // 2-3
            // Total = 6 pairs vertical. 0 Diagonals.
            const state = new NQueensState(4, [0, 0, 0, 0]);
            expect(state.cost).toBe(6);
        });

        it('should calculate cost including diagonals', () => {
            // [0, 1] for N=2
            // Q .
            // . Q
            // 1 Diagonal attack
            const state = new NQueensState(2, [0, 1]);
            expect(state.cost).toBe(1);
        });

        it('getNeighbors should return N*(N-1) distinct neighbors', () => {
            const N = 4;
            const state = new NQueensState(N, [1, 3, 0, 2]);
            const neighbors = state.getNeighbors();

            // Expected count: 4 rows * 3 other positions = 12
            expect(neighbors.length).toBe(N * (N - 1));

            // Verify basic structure
            neighbors.forEach(n => {
                expect(n).toBeInstanceOf(NQueensState);
                expect(n.size).toBe(N);
                expect(n.queens).not.toEqual(state.queens); // Should be different
            });
        });

        it('getRandomNeighbor should return a single valid neighbor different from source', () => {
            const N = 8;
            const state = NQueensState.randomState(N);
            const neighbor = state.getRandomNeighbor();

            expect(neighbor).toBeInstanceOf(NQueensState);
            expect(neighbor.size).toBe(N);
            expect(neighbor.queens).not.toEqual(state.queens); // Should change at least one queen

            // Should verify that only one queen moved?
            let differences = 0;
            for (let i = 0; i < N; i++) {
                if (state.queens[i] !== neighbor.queens[i]) differences++;
            }
            expect(differences).toBe(1); // One queen moves
        });

        it('randomState should return valid state of correct size', () => {
            const N = 10;
            const state = NQueensState.randomState(N);
            expect(state.size).toBe(N);
            expect(state.queens.length).toBe(N);
            state.queens.forEach(col => {
                expect(col).toBeGreaterThanOrEqual(0);
                expect(col).toBeLessThan(N);
            });
        });
    });

    describe('NQueensProblem', () => {
        it('crossover (uniform) should mix genes from parents', () => {
            // Force 3 parents for uniform check
            const p1 = new NQueensState(4, [0, 0, 0, 0]);
            const p2 = new NQueensState(4, [1, 1, 1, 1]);
            const p3 = new NQueensState(4, [2, 2, 2, 2]);

            const child = NQueensProblem.crossover([p1, p2, p3], { size: 4 });
            expect(child.size).toBe(4);
            child.queens.forEach(q => {
                expect([0, 1, 2]).toContain(q);
            });
        });

        it('mutate should modify state with high rate', () => {
            const state = new NQueensState(10, [0, 0, 0, 0, 0, 0, 0, 0, 0, 0]); // All 0s
            // Mutate with rate 1.0 (always mutate)
            // Note: Mutate modifies in place
            // Problem: implementation uses Math.random() < rate. 
            // If rate is 1, it will always mutate.
            NQueensProblem.mutate(state, 1.0, { size: 10 });

            // Extremely likely to not be all 0s anymore
            const isAllZeros = state.queens.every(q => q === 0);
            expect(isAllZeros).toBe(false);
        });
    });
});
