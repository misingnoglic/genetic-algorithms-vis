import { describe, it, expect } from 'vitest';
import { TSPState, TSPProblem } from './tsp.js';

describe('TSP Logic', () => {
    // Helper to create a known state
    // Square 10x10. 4 cities at corners: (0,0), (10,0), (10,10), (0,10)
    const cities = [
        { x: 0, y: 0 },
        { x: 10, y: 0 },
        { x: 10, y: 10 },
        { x: 0, y: 10 }
    ];

    it('calculates cost correctly for a square tour', () => {
        // Tour: 0 -> 1 -> 2 -> 3 -> 0
        // Distances: 10 + 10 + 10 + 10 = 40
        const tour = [0, 1, 2, 3];
        const state = new TSPState(tour, cities);

        expect(state.cost).toBeCloseTo(40);
    });

    it('calculates cost correctly for a diagonal cross tour', () => {
        // Tour: 0 -> 2 -> 1 -> 3 -> 0
        // 0->2: sqrt(200) ≈ 14.14
        // 2->1: 10
        // 1->3: sqrt(200) ≈ 14.14
        // 3->0: 10
        // Total: 48.28
        const tour = [0, 2, 1, 3];
        const state = new TSPState(tour, cities);

        expect(state.cost).toBeCloseTo(10 + 10 + Math.sqrt(200) * 2);
    });

    it('generates valid neighbors (Swap)', () => {
        const tour = [0, 1, 2, 3];
        const state = new TSPState(tour, cities);
        const neighbors = state.getNeighbors();

        // 4 cities. Swaps: (0,1), (0,2), (0,3), (1,2), (1,3), (2,3) = 6 neighbors
        expect(neighbors.length).toBe(6);

        // Check one neighbor: swap 0 and 1 -> [1, 0, 2, 3]
        const hasSwap01 = neighbors.some(n =>
            n.tour[0] === 1 && n.tour[1] === 0 && n.tour[2] === 2 && n.tour[3] === 3
        );
        expect(hasSwap01).toBe(true);
    });

    it('generates random initial state', () => {
        const params = { size: 10 };
        const state = TSPProblem.randomState(params);

        expect(state.tour.length).toBe(10);
        expect(state.cities.length).toBe(10);
        expect(params.cities).toBeDefined();
        expect(params.cities.length).toBe(10);

        const sortedTour = [...state.tour].sort((a, b) => a - b);
        expect(sortedTour).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8, 9]);
    });

    it('calculates estimated optimal cost for small N (brute force)', () => {
        // Use the 4 city square. Optimal is 40.
        const params = { cities: cities };
        const opt = TSPProblem.estimatedOptimalCost(params);
        expect(opt).toBeCloseTo(40);
    });

    it('returns an estimated optimal cost for N > 10', () => {
        const largeCities = Array.from({ length: 11 }, (_, i) => ({ x: i, y: i }));
        const params = { cities: largeCities };
        const opt = TSPProblem.estimatedOptimalCost(params);

        // Should return a number (cost)
        expect(typeof opt).toBe('number');
        expect(opt).toBeGreaterThan(0);
    });
});
