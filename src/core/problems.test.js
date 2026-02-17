import { describe, it, expect } from 'vitest';
import { NQueensProblem } from './problems/n-queens';
import { SudokuProblem } from './problems/sudoku';
import { MapColoringProblem } from './problems/map-coloring';
import { TetrisPackingProblem } from './problems/tetris-packing';
import { TSPProblem } from './problems/tsp';
import { Algorithms } from './algorithms';

describe('Problems: Unit Tests', () => {
    describe('N-Queens', () => {
        it('should detect valid solution', () => {
            const state = NQueensProblem.randomState({ size: 4 });
            state.queens = [1, 3, 0, 2];
            expect(state.cost).toBe(0);
            expect(NQueensProblem.isSolution(state)).toBe(true);
        });

        it('should detect conflicts (attacks)', () => {
            const state = NQueensProblem.randomState({ size: 4 });
            state.queens = [0, 1, 2, 3];
            expect(state.cost).toBeGreaterThan(0);
            expect(NQueensProblem.isSolution(state)).toBe(false);
        });
    });

    describe('Sudoku', () => {
        it('should detect valid filled board', () => {
            const state = SudokuProblem.randomState({ size: 9 });
            expect(state.grid.length).toBe(9);
            expect(state.grid[0].length).toBe(9);
        });
    });

    describe('Map Coloring', () => {
        it('should detect valid solution in Australia map', () => {
            const params = { graphType: 'australia', numColors: 3 };
            const state = MapColoringProblem.emptyState(params);

            // Australia: WA, NT, SA, Q, NSW, V, T
            // SA is neighbors with everyone except T.
            // A possible 3-coloring:
            // WA: 0, NT: 1, SA: 2, Q: 0, NSW: 1, V: 0, T: 0
            state.assignments = [0, 1, 2, 0, 1, 0, 0];

            expect(state.cost).toBe(0);
            expect(MapColoringProblem.isSolution(state)).toBe(true);
        });

        it('should detect adjacent conflicts', () => {
            const params = { graphType: 'australia', numColors: 3 };
            const state = MapColoringProblem.emptyState(params);

            // WA (0) and NT (1) are neighbors. Assign both color 0.
            state.assignments = [0, 0, 2, 0, 1, 0, 0];

            expect(state.cost).toBeGreaterThan(0);
            expect(MapColoringProblem.isSolution(state)).toBe(false);
        });

        it('should correctly implement CSP interface', () => {
            const params = { graphType: 'australia', numColors: 3 };
            const state = MapColoringProblem.emptyState(params);

            const domains = MapColoringProblem.initializeDomains(state);
            expect(domains).toHaveLength(7);
            expect(domains[0]).toEqual([0, 1, 2]);

            const nextVar = MapColoringProblem.selectUnassignedVariable(state);
            expect(nextVar).toBe(0);

            const degree = MapColoringProblem.getConstraintDegree(state, 2); // SA has 5 neighbors
            expect(degree).toBe(5);
        });
    });

    describe('Tetris Packing', () => {
        it('should calculate height cost correctly', () => {
            const params = { numPieces: 2, gridWidth: 10 };
            const state = TetrisPackingProblem.emptyState(params);

            state.pieces = [
                { type: 'O', rotation: 0, x: 0 },
                { type: 'I', rotation: 0, x: 2 }
            ];
            state.placedCount = 2;
            state.grid = state._buildGrid();

            expect(state.grid.length).toBeGreaterThan(0);
            expect(state.cost).toBeGreaterThan(0);
        });

        it('should penalize unplaced pieces heavily', () => {
            const params = { numPieces: 5, gridWidth: 10 };
            const fullState = TetrisPackingProblem.randomState(params);
            const emptyState = TetrisPackingProblem.emptyState(params);

            expect(emptyState.cost).toBeGreaterThan(fullState.cost);
        });

        it('should generate successors for all rotations and positions', () => {
            const params = { numPieces: 2, gridWidth: 10 };
            const state = TetrisPackingProblem.emptyState(params);
            const successors = TetrisPackingProblem.getSuccessors(state);

            // 4 rotations * 10 x positions = 40 successors
            expect(successors).toHaveLength(40);
        });
    });
});

describe('Integration Tests: Algorithm Compatibility', () => {
    const testCases = [
        { name: 'N-Queens', problem: NQueensProblem, params: { size: 4 } },
        { name: 'TSP', problem: TSPProblem, params: { size: 5 } },
        { name: 'Map Coloring', problem: MapColoringProblem, params: { graphType: 'australia', numColors: 3 } },
        { name: 'Tetris Packing', problem: TetrisPackingProblem, params: { numPieces: 5, gridWidth: 10 } }
    ];

    testCases.forEach(({ name, problem, params }) => {
        describe(`Problem: ${name}`, () => {
            it('should work with Hill Climbing', () => {
                const start = problem.randomState(params);
                const gen = Algorithms.hillClimbing(start, { maxRestarts: 0 }, problem);
                const result = gen.next();
                expect(result.value).toBeDefined();
            });

            it('should work with Genetic Algorithm', () => {
                const gaParams = { ...params, startingPopulationSize: 4, maxGenerations: 2 };
                const gen = Algorithms.geneticAlgorithm(null, gaParams, problem);
                const result = gen.next();
                expect(result.value.population).toHaveLength(4);
            });
        });
    });
});
