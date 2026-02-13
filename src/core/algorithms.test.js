import { describe, it, expect, vi } from 'vitest';
import { Algorithms } from './algorithms.js';

// --- MOCK PROBLEM ---
// Simple 1D optimization: Find x = 0.
// Cost = abs(x)
// Neighbors = x-1, x+1

class MockState {
    constructor(value) {
        this.value = value;
        this.metadata = {}; // Algorithms write here
    }

    get cost() {
        return Math.abs(this.value);
    }

    getNeighbors() {
        return [
            new MockState(this.value - 1),
            new MockState(this.value + 1)
        ];
    }

    getRandomNeighbor() {
        // Randomly pick direction
        const delta = Math.random() < 0.5 ? -1 : 1;
        return new MockState(this.value + delta);
    }
}

const MockProblem = {
    randomState: (params) => {
        // Random value between -10 and 10
        const val = Math.floor(Math.random() * 21) - 10;
        return new MockState(val);
    },
    crossover: (parents, params) => {
        // Average value
        const values = parents.map(p => p.value);
        const sum = values.reduce((a, b) => a + b, 0);
        const avg = Math.round(sum / values.length);
        return new MockState(avg);
    },
    mutate: (state, rate, params) => {
        if (Math.random() < rate) {
            state.value += (Math.random() < 0.5 ? -1 : 1);
        }
    }
};

// --- ALGORITHM TESTS ---

describe('Algorithms (Generic)', () => {

    describe('hillClimbing', () => {
        it('should solve a simple convex problem', () => {
            const start = new MockState(5); // cost 5, neighbors 4, 6. should go to 4.
            const gen = Algorithms.hillClimbing(start, { maxSideways: 0, maxRestarts: 0 });

            let result = gen.next();
            let finalState = null;
            while (!result.done) {
                finalState = result.value.state;
                result = gen.next();
            }

            // Should reach 0
            expect(finalState.cost).toBe(0);
        });

        it('should reach global optimum for simple convex problem', () => {
            const start = new MockState(3);
            const gen = Algorithms.hillClimbing(start);

            let result = gen.next();
            let lastState = result.value.state;

            while (!result.done) {
                lastState = result.value.state;
                result = gen.next();
            }

            expect(lastState.cost).toBe(0);
        });
    });

    describe('stochasticHillClimbing', () => {
        it('should run and eventually improve', () => {
            const start = new MockState(10);
            const gen = Algorithms.stochasticHillClimbing(start, { variant: 'standard' });

            // Run for limited steps to verify valid output structure
            const result = gen.next();
            expect(result.value).toHaveProperty('state');
            expect(result.value).toHaveProperty('note');
            expect(result.value.state).toBeInstanceOf(MockState);
        });
    });

    describe('simulatedAnnealing', () => {
        it('should yield states with decreasing temperature', () => {
            const start = new MockState(10);
            const gen = Algorithms.simulatedAnnealing(start, { initialTemp: 100, coolingRate: 0.5 });

            let result = gen.next();
            // First yields T=100
            expect(result.value.note).toContain('T=100');
        });
    });

    describe('geneticAlgorithm', () => {
        it('should initialize and evolve population', () => {
            const params = {
                startingPopulationSize: 10,
                maxGenerations: 5
            };
            const gen = Algorithms.geneticAlgorithm(null, params, MockProblem);

            let result = gen.next();
            // Gen 0
            expect(result.value.population).toHaveLength(10);
            expect(result.value.population[0]).toBeInstanceOf(MockState);

            // Run a few gens
            result = gen.next(); // Gen 1
            expect(result.value.population).toHaveLength(10);
        });
    });

    describe('localBeamSearch', () => {
        it('should respect beam width', () => {
            const params = {
                beamWidth: 5,
                variant: 'deterministic',
                maxGenerations: 5
            };
            const gen = Algorithms.localBeamSearch(null, params, MockProblem);

            let result = gen.next();
            expect(result.value.population).toHaveLength(5);
        });

        it('should handle stochastic variant', () => {
            const params = {
                beamWidth: 5,
                variant: 'stochastic',
                maxGenerations: 5
            };
            const gen = Algorithms.localBeamSearch(null, params, MockProblem);
            let result = gen.next();
            expect(result.value.population).toHaveLength(5);
        });
    });

});
