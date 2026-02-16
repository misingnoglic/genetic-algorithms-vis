import { describe, it, expect } from 'vitest';
import { ConstructiveAlgorithms } from './constructive-algorithms';
import { NQueensProblem } from './problems/n-queens';
import { TSPProblem } from './problems/tsp';

describe('Constructive Algorithms', () => {

    describe('N-Queens BFS (Blind)', () => {
        it('should respect maxIterations', () => {
            const params = { size: 8, maxIterations: 10 }; // Impossible to solve N=8 in 10 steps blindly
            const iterator = ConstructiveAlgorithms.bfs(null, params, NQueensProblem);

            let lastNote = null;
            let result = iterator.next();
            while (!result.done) {
                lastNote = result.value.note;
                result = iterator.next();
            }

            expect(lastNote).toContain('Stopped (Max Iterations');
        });

        it('should find solution for N=4 (small enough)', () => {
            const params = { size: 4, maxIterations: 10000 };
            const iterator = ConstructiveAlgorithms.bfs(null, params, NQueensProblem);

            let result = iterator.next();
            let solutionFound = false;
            while (!result.done) {
                if (result.value.note === 'Solution Found!') solutionFound = true;
                result = iterator.next();
            }
            expect(solutionFound).toBe(true);
        });
    });

    describe('N-Queens DFS (Blind)', () => {
        it('should respect maxIterations', () => {
            const params = { size: 8, maxIterations: 10 };
            const iterator = ConstructiveAlgorithms.dfs(null, params, NQueensProblem);

            let lastNote = null;
            let result = iterator.next();
            while (!result.done) {
                lastNote = result.value.note;
                result = iterator.next();
            }
            expect(lastNote).toContain('Stopped (Max Iterations');
        });
    });

    describe('N-Queens Backtracking (CSP)', () => {
        it('should find a solution for N=4 with pruning', () => {
            const params = { size: 4 };
            const iterator = ConstructiveAlgorithms.backtracking(null, params, NQueensProblem);

            let result = iterator.next();
            let lastState = null;
            while (!result.done) {
                lastState = result.value.state;
                if (result.value.note === 'Solution Found!') break;
                result = iterator.next();
            }

            expect(result.value.note).toBe('Solution Found!');
            expect(lastState.cost).toBe(0);
        });

        it('should find a solution for N=8 with pruning', () => {
            const params = { size: 8 };
            const iterator = ConstructiveAlgorithms.backtracking(null, params, NQueensProblem);

            let result = iterator.next();
            let solutionFound = false;
            let steps = 0;
            while (!result.done && steps < 500000) {
                if (result.value.note === 'Solution Found!') solutionFound = true;
                result = iterator.next();
                steps++;
            }
            expect(solutionFound).toBe(true);
        });
    });

    describe('N-Queens Forward Checking', () => {
        it('should find a solution for N=4', () => {
            const params = { size: 4 };
            const iterator = ConstructiveAlgorithms.forwardChecking(null, params, NQueensProblem);

            let result = iterator.next();
            let lastState = null;
            while (!result.done) {
                lastState = result.value.state;
                if (result.value.note === 'Solution Found!') break;
                result = iterator.next();
            }

            expect(result.value.note).toBe('Solution Found!');
            expect(lastState.cost).toBe(0);
            expect(lastState.domains).toBeDefined();
        });

        // [New Test] Heuristics
        it('should support MRV heuristic', () => {
            const params = { size: 4, variableHeuristic: 'mrv' };
            const iterator = ConstructiveAlgorithms.forwardChecking(null, params, NQueensProblem);

            let result = iterator.next();
            let done = false;
            while (!result.done) {
                if (result.value.note === 'Solution Found!') done = true;
                result = iterator.next();
            }
            expect(done).toBe(true);
        });

        it('should support Random heuristic (runs without error)', () => {
            const params = { size: 4, variableHeuristic: 'random' };
            const iterator = ConstructiveAlgorithms.forwardChecking(null, params, NQueensProblem);

            let result = iterator.next();
            while (!result.done) {
                result = iterator.next();
            }
            expect(result.value).toBe('Solution Found!');
        });
    });

    // Test TSP BFS/DFS just to ensure they run/don't crash (even if slow)
    describe('TSP DFS', () => {
        it('should generate successors for TSP N=3', () => {
            const params = { size: 3 };
            // Use seeded random or fixed cities for TSP?
            // TSPProblem.emptyState logic handles city gen if missing?
            // We need to inject cities likely.
            params.cities = [{ x: 0, y: 0 }, { x: 10, y: 0 }, { x: 0, y: 10 }];

            const iterator = ConstructiveAlgorithms.dfs(null, params, TSPProblem);

            let result = iterator.next();
            let steps = 0;
            let lastNote = null;

            while (!result.done && steps < 100) {
                if (result.value) lastNote = result.value.note;
                steps++;
                result = iterator.next();
            }

            // TSP returns 'No Solution Found' when exhausted because isSolution is false
            expect(lastNote).toBe('No Solution Found');
        });
    });
});
