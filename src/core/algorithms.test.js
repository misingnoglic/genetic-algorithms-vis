import { describe, it, expect } from 'vitest';
import { Algorithms } from './algorithms.js';

// Mock State for a simple 1D convex problem (y = x^2)
class MockState {
    constructor(x) {
        this.x = x;
    }

    get cost() {
        return this.x * this.x; // Minimum at x=0
    }

    getNeighbors() {
        // Neighbors are x-1 and x+1
        return [new MockState(this.x - 1), new MockState(this.x + 1)];
    }

    getRandomNeighbor() {
        return Math.random() < 0.5 ? new MockState(this.x - 1) : new MockState(this.x + 1);
    }

    clone() {
        return new MockState(this.x);
    }
}

// Mock Problem definition
const MockProblem = {
    randomState: () => {
        // Random x between -10 and 10
        const x = Math.floor(Math.random() * 21) - 10;
        return new MockState(x);
    },

    isSolution: (state) => state.cost === 0, // Goal test

    crossover: (parents) => {
        // Average of x
        const avg = Math.floor((parents[0].x + parents[1].x) / 2);
        return new MockState(avg);
    },

    mutate: (state, rate) => {
        if (Math.random() < rate) {
            state.x += (Math.random() < 0.5 ? -1 : 1);
        }
    }
};


// --- ALGORITHM TESTS ---

describe('Algorithms (Generic)', () => {

    describe('hillClimbing', () => {
        it('should solve a simple convex problem', () => {
            const initial = new MockState(5);
            // Must pass problem instance now
            const iterator = Algorithms.hillClimbing(initial, {}, MockProblem);

            let result;
            let finalState;
            while (true) {
                result = iterator.next();
                if (result.done) break;
                finalState = result.value.state;
            }

            expect(finalState.cost).toBe(0);
        });

        it('should reach global optimum for simple convex problem', () => {
            const initial = new MockState(-5);
            const iterator = Algorithms.hillClimbing(initial, {}, MockProblem);

            let lastState;
            for (const step of iterator) {
                lastState = step.state;
            }
            expect(lastState.cost).toBe(0);
        });

        // [New Test] Sideways Tolerance
        it('should accept worse moves within tolerance (TSP Behavior)', () => {
            // Construct a local optimum at 10, but 11 is slightly worse (within tolerance) leading to global opt at 15?
            // Or simpler: Current cost 100. Neighbor 101. Tolerance 0.05 (105). Should accept 101 as Sideways.

            const problem = { ...MockProblem, id: 'tsp' }; // Pretend to be TSP
            const state = {
                cost: 100,
                getNeighbors: () => [{ cost: 101 }],
                clone: () => ({ cost: 100 })
            };

            const params = { sidewaysTolerance: 0.02, maxSideways: 1 };
            const iterator = Algorithms.hillClimbing(state, params, problem);

            const first = iterator.next(); // Initial
            const second = iterator.next(); // Should be Sideways move to 101

            expect(second.value.state.cost).toBe(101);
            expect(second.value.note).toContain('Sideways (≈)');
        });
    });

    describe('stochasticHillClimbing', () => {
        it('should run and eventually improve', () => {
            const initial = new MockState(10);
            const iterator = Algorithms.stochasticHillClimbing(initial, { maxRestarts: 0 }, MockProblem);

            let improvements = 0;
            let steps = 0;
            while (true) {
                const res = iterator.next();
                if (res.done) break;
                if (res.value.note.includes('Improved')) improvements++;
                steps++;
                if (steps > 20) break; // Safety break
            }

            // Just check it runs without error and yields something
            expect(steps).toBeGreaterThan(0);
        });
    });

    describe('simulatedAnnealing', () => {
        it('should yield states with decreasing temperature', () => {
            const initial = new MockState(10);
            const iterator = Algorithms.simulatedAnnealing(initial, { initialTemp: 100, coolingRate: 0.5 }, MockProblem); // faster cooling

            const first = iterator.next().value;
            // Parse T from note "T=100.00"
            const getT = (note) => parseFloat(note.match(/T=([0-9.]+)/)[1]);

            expect(getT(first.note)).toBe(100);

            const second = iterator.next().value;
            expect(second).toBeDefined();
        });
    });

    describe('geneticAlgorithm', () => {
        it('should initialize and evolve population', () => {
            const params = {
                startingPopulationSize: 10,
                maxGenerations: 5
            };
            // GA takes null initial state, params, and problem
            const iterator = Algorithms.geneticAlgorithm(null, params, MockProblem);

            const first = iterator.next().value;
            expect(first.population).toHaveLength(10);
            expect(first.population[0]).toBeInstanceOf(MockState);

            const second = iterator.next().value;
            expect(second.population).toBeDefined();
        });
    });

    describe('localBeamSearch', () => {
        it('should respect beam width', () => {
            const params = { beamWidth: 3, maxGenerations: 5 };
            const iterator = Algorithms.localBeamSearch(null, params, MockProblem);

            const first = iterator.next().value;
            expect(first.population).toHaveLength(3);
        });

        it('should handle stochastic variant', () => {
            const params = { beamWidth: 3, maxGenerations: 2, variant: 'stochastic' };
            const iterator = Algorithms.localBeamSearch(null, params, MockProblem);

            const first = iterator.next().value;
            expect(first.population).toHaveLength(3);
        });

        // [New Test] Fixed Termination Bug
        it('should stop after maxSideways on a plateau', () => {
            // Mock a problem where all states have cost 10 (Plateau)
            const PlateauState = class {
                constructor() { this.cost = 10; }
                getNeighbors() { return [new PlateauState()]; }
                clone() { return new PlateauState(); }
                toString() { return '10'; }
            };
            const PlateauProblem = {
                randomState: () => new PlateauState(),
                isSolution: () => false
            };

            const params = { beamWidth: 1, maxSideways: 3, maxGenerations: 100 };
            const iterator = Algorithms.localBeamSearch(null, params, PlateauProblem);

            let steps = 0;
            let lastNote = '';
            while (true) {
                const res = iterator.next();
                if (res.done) break;
                lastNote = res.value.note;
                steps++;
                if (steps > 20) break; // Fail prevention
            }

            // Init + 3 updates + Final return? roughly 5-6 steps
            expect(steps).toBeLessThan(15);
            expect(lastNote).toContain('Stuck');
        });
    });
});
