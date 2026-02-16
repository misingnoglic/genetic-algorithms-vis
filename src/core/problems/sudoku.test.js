
import { describe, it, expect } from 'vitest';
import { SudokuState, SudokuProblem } from './sudoku.js';

describe('Sudoku Logic', () => {

    // Simple 4x4 (2x2 boxes) for testing
    // Full valid grid
    const fullGrid4 = [
        [1, 2, 3, 4],
        [3, 4, 1, 2],
        [2, 1, 4, 3],
        [4, 3, 2, 1]
    ];
    // Fixed mask (all fixed for this test)
    const fixed4 = fullGrid4.map(r => r.map(() => true));

    describe('SudokuState', () => {
        it('should calculate cost correctly (0 for valid)', () => {
            const state = new SudokuState(4, fullGrid4, fixed4);
            expect(state.conflicts).toBe(0);
            expect(state.cost).toBe(0);
        });

        it('should detect conflicts in Row', () => {
            const grid = [
                [1, 1, 3, 4], // 1-1 collision
                [3, 4, 1, 2],
                [2, 1, 4, 3],
                [4, 3, 2, 1]
            ];
            const state = new SudokuState(4, grid);
            // Row 0 has 1 conflict pair (1,1) -> +1 conflict count
            expect(state.conflicts).toBeGreaterThan(0);
        });

        it('should detect conflicts in Col', () => {
            const grid = [
                [1, 2, 3, 4],
                [1, 4, 1, 2], // Col 0 has 1, 1
                [2, 1, 4, 3],
                [4, 3, 2, 1]
            ];
            const state = new SudokuState(4, grid);
            expect(state.conflicts).toBeGreaterThan(0);
        });

        it('should detect conflicts in Box', () => {
            // 4x4, Box size 2x2.
            // Box 0: (0,0), (0,1), (1,0), (1,1)
            // Let's put duplicates there.
            const grid = [
                [1, 2, 3, 4],
                [4, 3, 2, 1], // Box 0: [1,2, 4,3] -> OK
                [2, 1, 4, 3],
                [3, 4, 1, 2]
            ];
            // Let's break Box 0
            grid[1][1] = 1; // Box 0 now has 1, 1
            const state = new SudokuState(4, grid);
            expect(state.conflicts).toBeGreaterThan(0);
        });

        it('getUnassignedVariables should return all empty cells', () => {
            const grid = [
                [1, 0, 3, 0],
                [0, 4, 0, 2],
                [2, 1, 4, 3],
                [4, 3, 2, 1]
            ];
            const state = new SudokuState(4, grid);
            const vars = SudokuProblem.getUnassignedVariables(state);
            expect(vars.length).toBe(4);
            expect(vars).toContainEqual({ r: 0, c: 1 });
            expect(vars).toContainEqual({ r: 0, c: 3 });
        });
    });

    describe('SudokuProblem', () => {
        it('should initialize domains correctly', () => {
            const grid = [
                [1, 0, 0, 0],
                [0, 0, 0, 0],
                [0, 0, 0, 0],
                [0, 0, 0, 0]
            ];
            const state = new SudokuState(4, grid);
            const domains = SudokuProblem.initializeDomains(state);

            // (0,0) is fixed to 1
            expect(domains[0][0]).toEqual([1]);

            // (0,1) cannot be 1 (Row constraint)
            expect(domains[0][1]).not.toContain(1);

            // (1,0) cannot be 1 (Col constraint)
            expect(domains[1][0]).not.toContain(1);

            // (1,1) cannot be 1 (Box constraint)
            expect(domains[1][1]).not.toContain(1);
        });

        it('selectUnassignedVariable (MRV) should pick most constrained', () => {
            // Construct a state where one cell has only 1 option, others have many.
            const grid = [
                [0, 0, 0, 0],
                [0, 0, 0, 0],
                [0, 0, 0, 0],
                [0, 0, 0, 0]
            ];
            const state = new SudokuState(4, grid);
            state.domains = SudokuProblem.initializeDomains(state);

            // Artificially restrict (0,0) to [1]
            state.domains[0][0] = [1];

            // MRV should pick (0,0)
            const best = SudokuProblem.selectUnassignedVariable(state);
            expect(best).toEqual({ r: 0, c: 0 });
        });
    });
});
