import { describe, it, expect } from 'vitest';
import { Algorithms } from './algorithms.js';
import { NQueensProblem } from './problems/n-queens.js';
import { TSPProblem } from './problems/tsp.js';

describe('Integration Tests: Algorithms + Problems', () => {

    const problems = [
        { name: 'N-Queens', problem: NQueensProblem, params: { size: 4 } }, // Small size for speed
        { name: 'TSP', problem: TSPProblem, params: { size: 5 } }
    ];

    problems.forEach(({ name, problem, params }) => {
        describe(`Problem: ${name}`, () => {

            it('should compatible with Hill Climbing', () => {
                const start = problem.randomState(params);
                const gen = Algorithms.hillClimbing(start, { maxRestarts: 0 }, problem);

                // Run a few steps to ensure no crash on neighbor generation / cost check / isSolution
                const result = gen.next();
                expect(result.value).toBeDefined();
                expect(result.value.state).toBeDefined();
            });

            it('should compatible with Simulated Annealing', () => {
                const start = problem.randomState(params);
                const gen = Algorithms.simulatedAnnealing(start, { initialTemp: 10 }, problem);

                const result = gen.next();
                expect(result.value).toBeDefined();
                expect(result.value.state).toBeDefined();
            });

            it('should compatible with Local Beam Search', () => {
                // Beam search initializes its own population using problem.randomState
                const beamParams = { ...params, beamWidth: 2, maxGenerations: 2 };
                const gen = Algorithms.localBeamSearch(null, beamParams, problem);

                const result = gen.next();
                expect(result.value).toBeDefined();
                expect(result.value.population).toHaveLength(2);
            });

            it('should compatible with Genetic Algorithm', () => {
                // GA initializes its own population
                const gaParams = { ...params, startingPopulationSize: 4, maxGenerations: 2 };
                const gen = Algorithms.geneticAlgorithm(null, gaParams, problem);

                // Gen 0
                let result = gen.next();
                expect(result.value.population).toHaveLength(4);

                // Gen 1 (Testing evolution cycle: selection, crossover, mutation, isSolution, clone)
                result = gen.next();
                expect(result.value.population).toHaveLength(4);
            });
        });
    });

    describe('Interface Enforcement', () => {
        problems.forEach(({ name, problem, params }) => {
            it(`${name} states should implement required methods`, () => {
                const state = problem.randomState(params);

                expect(state.cost).toBeTypeOf('number');
                expect(state.getNeighbors).toBeTypeOf('function');
                expect(state.getRandomNeighbor).toBeTypeOf('function');
                expect(state.clone).toBeTypeOf('function'); // Critical for GA
            });

            it(`${name} problem should implement required methods`, () => {
                expect(problem.isSolution).toBeTypeOf('function');
                expect(problem.randomState).toBeTypeOf('function');
                // Crossover/Mutate are used by GA/Problem, strictly speaking optional for HC but good to have
                if (problem.crossover) expect(problem.crossover).toBeTypeOf('function');
                if (problem.mutate) expect(problem.mutate).toBeTypeOf('function');
            });
        });
    });
});
