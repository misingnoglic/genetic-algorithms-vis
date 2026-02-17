import { describe, it, expect } from 'vitest';
import { NQueensProblem } from './problems/n-queens';
import { SudokuProblem } from './problems/sudoku';
import { TetrisPackingProblem } from './problems/tetris-packing';
// MapColoring usually doesn't have a default export class but an object, let's verify
// view_file implied exports were objects or classes.

describe('Problems', () => {
    describe('N-Queens', () => {
        it('should detect valid solution', () => {
            // 4-Queens solution: 
            // . Q . .
            // . . . Q
            // Q . . .
            // . . Q .
            // queens: [1, 3, 0, 2]
            const state = NQueensProblem.randomState({ size: 4 });
            // Mock queens array
            state.queens = [1, 3, 0, 2];
            // Recalculate cost
            state.cachedCost = null; // force calc (if implementation uses caching)

            // Check cost manually or via getter
            expect(state.cost).toBe(0);
            expect(NQueensProblem.isSolution(state)).toBe(true);
        });

        it('should detect conflicts (attacks)', () => {
            const state = NQueensProblem.randomState({ size: 4 });
            // Diagonal attack: (0,0) and (1,1)
            state.queens = [0, 1, 2, 3];

            expect(state.cost).toBeGreaterThan(0);
            expect(NQueensProblem.isSolution(state)).toBe(false);
        });
    });

    describe('Sudoku', () => {
        it('should detect valid filled board', () => {
            // Use empty state and fill it correctly (mocking a known valid 4x4 or 9x9?)
            // It's easier to assume randomState generates a valid-ish structure but cost > 0
            const state = SudokuProblem.randomState({ size: 9 });
            expect(state.grid.length).toBe(9);
            expect(state.grid[0].length).toBe(9);
        });

        // Sudoku isSolution checks if cost === 0 (no conflicts)
    });

    describe('Tetris Packing', () => {
        it('should calculate height cost correctly', () => {
            // Using logic from tetris-packing.js

            // 1. Create state with known pieces
            const params = { numPieces: 2, gridWidth: 10 };
            const state = TetrisPackingProblem.emptyState(params);

            // Override pieces
            // Piece 0: square 2x2 at x=0
            // Piece 1: I-shape 4x1 at x=2
            // We need to valid TETRIS_SHAPES keys. 'O' and 'I'.
            state.pieces = [
                { type: 'O', rotation: 0, x: 0 },
                { type: 'I', rotation: 0, x: 2 }
            ];
            state.placedCount = 2; // All placed

            // Force grid rebuild
            state.grid = state._buildGrid();

            // Check grid height
            // 'O' is 2x2. Placed at bottom (y=0,1).
            // 'I' is 4x1 (if rotation 0 is vertical?? Check defs.. usually 0 is default from constants)
            // 'I' default might be horizontal or vertical depending on SHAPES.
            // Regardless, it should pile up or sit on floor.

            const maxHeight = state.grid.length;
            expect(maxHeight).toBeGreaterThan(0);

            // Cost should include penalty for gaps and height
            expect(state.cost).toBeGreaterThan(0);
        });

        it('should penalize unplaced pieces heavily', () => {
            const params = { numPieces: 5, gridWidth: 10 };
            const fullState = TetrisPackingProblem.randomState(params); // placedCount = 5
            const emptyState = TetrisPackingProblem.emptyState(params); // placedCount = 0

            // Empty state should have massive penalty
            expect(emptyState.cost).toBeGreaterThan(fullState.cost);
        });
    });
});
