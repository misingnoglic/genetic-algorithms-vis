import { describe, it, expect, vi } from 'vitest';
import { Algorithms } from './algorithms';

// Mock Problem Interface
const createMockProblem = (type = 'standard') => {
    return {
        id: 'mock',
        randomState: vi.fn(() => ({
            cost: 10,
            data: 'initial',
            getNeighbors: () => [],
            clone: function () { return { ...this } }
        })),
        isSolution: vi.fn((state) => state.cost === 0),
        getNeighbors: vi.fn(() => []),
        // Add other methods as needed by specific algos
        crossover: vi.fn(() => ({
            cost: 5,
            data: 'child',
            clone: function () { return { ...this } }
        })),
        mutate: vi.fn((state) => state),
        emptyState: vi.fn(() => ({ cost: 100, data: 'empty', isPartial: true })),
        extractInstanceParams: vi.fn(() => ({})),
    };
};

describe('Algorithms', () => {
    describe('Hill Climbing', () => {
        it('should improve state until local optimum', () => {
            const problem = createMockProblem();

            // Build linked states with persistent objects
            const leaf5 = { cost: 5, getNeighbors: () => [{ cost: 5 }] }; // Best found
            const leaf9 = { cost: 9, getNeighbors: () => [{ cost: 9 }] };

            const node8 = {
                cost: 8,
                getNeighbors: () => [
                    leaf5,
                    leaf9
                ]
            };
            const node12 = { cost: 12, getNeighbors: () => [{ cost: 12 }] };

            const initialState = {
                cost: 10,
                // Return same linked objects
                getNeighbors: () => [
                    node8,
                    node12
                ]
            };

            // Leaf states need neighbors too (worse or equal to be "Stuck" at 5)
            // Leaf 5 neighbors: cost 6, 7 (worse)
            const leaf6 = { cost: 6, getNeighbors: () => [{ cost: 6 }] };
            const leaf7 = { cost: 7, getNeighbors: () => [{ cost: 7 }] };

            // Override leaf5 neighbors to simulate stuck at 5
            leaf5.getNeighbors = () => [leaf6, leaf7];


            const generator = Algorithms.hillClimbing(initialState, {}, problem);

            let result;
            let steps = 0;
            while (true) {
                const step = generator.next();
                if (step.done) {
                    result = step.value;
                    break;
                }
                steps++;
            }

            expect(result.state.cost).toBe(5);
            expect(result.note).toContain('Stuck');
        });

        it('should restart when stuck if maxRestarts > 0', () => {
            const problem = createMockProblem();
            // Mock randomState to return a better state on restart

            // Initial state (Cost 10) -> Neighbors cost 10 (Stuck)
            const badState = {
                cost: 10,
                getNeighbors: () => [
                    { cost: 10, getNeighbors: () => [{ cost: 10 }] },
                    { cost: 12, getNeighbors: () => [{ cost: 12 }] } // Not better
                ]
            };

            // Better state (Cost 2) -> Neighbors cost 2 (Stuck but better)
            const goodState = {
                cost: 2,
                getNeighbors: () => [
                    { cost: 2, getNeighbors: () => [{ cost: 2 }] },
                    { cost: 3, getNeighbors: () => [{ cost: 3 }] }
                ]
            };

            problem.randomState = vi.fn()
                .mockReturnValueOnce(badState) // Initial (Stuck immediately)
                .mockReturnValueOnce(goodState); // Restart 1 (Better)

            const generator = Algorithms.hillClimbing(null, { maxRestarts: 1 }, problem);

            // Run through generator
            for (const step of generator) {
                // Just consume
            }

            // The generator yields the restart state checking params
            expect(problem.randomState).toHaveBeenCalledTimes(2);
            // 1. Initial
            // 2. Restart 1
        });
    });

    describe('Simulated Annealing', () => {
        it('should accept worse moves with probability', () => {
            const problem = createMockProblem();
            const initialState = {
                cost: 10,
                getRandomNeighbor: () => ({ cost: 15 }) // Worse
            };

            // Force Math.random to accept (return 0)
            vi.spyOn(Math, 'random').mockReturnValue(0);

            const generator = Algorithms.simulatedAnnealing(initialState, { initialTemp: 100 }, problem);
            const step1 = generator.next(); // Initial
            const step2 = generator.next(); // Accepted worse

            expect(step2.value.note).toContain('Accepted worse');
            expect(step2.value.state.cost).toBe(15);

            vi.restoreAllMocks();
        });

        it('should freeze when temp is low', () => {
            const problem = createMockProblem();
            const initialState = { cost: 10, getRandomNeighbor: () => ({ cost: 10 }) };

            // Very fast cooling
            const generator = Algorithms.simulatedAnnealing(initialState, { initialTemp: 0.00001 }, problem);

            // Initial state yield
            let result = generator.next();
            expect(result.done).toBe(false);

            // Should be done immediately (frozen)
            result = generator.next();
            expect(result.done).toBe(true);
            expect(result.value.note).toContain('Frozen');
        });
    });

    describe('Genetic Algorithm', () => {
        it('should evolve population and yield solution', () => {
            const problem = createMockProblem();
            // Mock crossover to return improved child
            problem.crossover = vi.fn(() => ({ cost: 0, metadata: {} })); // Perfect child

            const generator = Algorithms.geneticAlgorithm(null, {
                startingPopulationSize: 4,
                maxGenerations: 1
            }, problem);

            // Initial population yield
            const init = generator.next();
            expect(init.value.population).toHaveLength(4);

            // Generation 1 (should fine solution)
            const gen1 = generator.next();
            // The generator YIELDS the solution state when found
            expect(gen1.value.state.cost).toBe(0);

            // Should be done now
            const doneStep = generator.next();
            expect(doneStep.done).toBe(true);
        });
    });

});
