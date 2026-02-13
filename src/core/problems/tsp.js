// Traveling Salesperson Problem Implementation
import { Algorithms } from '../algorithms.js';

export class TSPState {
    constructor(tour, cities) {
        this.tour = [...tour]; // Array of city indices
        this.cities = cities; // Reference to cities array {x, y}
        this.cachedCost = null;
    }

    // Check if tour is partial (doesn't visit all cities)
    get isPartial() {
        return this.tour.length < this.cities.length;
    }

    // Cost: Total distance of the tour
    get cost() {
        if (this.cachedCost !== null) return this.cachedCost;

        let dist = 0;
        const len = this.tour.length;

        if (len < 2) {
            // 0 or 1 city: distance 0?
            // Plus penalty
            return this.isPartial ? (this.cities.length - len) * 1000 : 0;
        }

        // 1. Path distance
        for (let i = 0; i < len - 1; i++) {
            const from = this.cities[this.tour[i]];
            const to = this.cities[this.tour[i + 1]];
            dist += Math.hypot(from.x - to.x, from.y - to.y);
        }

        // 2. Return to start (only if full tour)
        // If partial, do we assume return? Probably not.
        if (!this.isPartial) {
            const from = this.cities[this.tour[len - 1]];
            const to = this.cities[this.tour[0]];
            dist += Math.hypot(from.x - to.x, from.y - to.y);
        }

        // 3. Penalty for partial
        if (this.isPartial) {
            dist += (this.cities.length - len) * 1000;
        }

        this.cachedCost = dist;
        return dist;
    }

    // Neighbors: Swap 2 cities (Simple neighborhood)
    // Note: 2-Opt is better for TSP, let's implement both but use one by default?
    // Let's stick to Swap for consistency with generic "move" logic, or implement 2-Opt if Swap is too weak.
    // Swap is O(1) to generate one, but N^2 neighbors.
    getNeighbors() {
        const neighbors = [];
        const n = this.tour.length;

        // Generate all swaps
        for (let i = 0; i < n; i++) {
            for (let j = i + 1; j < n; j++) {
                const newTour = [...this.tour];
                [newTour[i], newTour[j]] = [newTour[j], newTour[i]];
                neighbors.push(new TSPState(newTour, this.cities));
            }
        }
        return neighbors;
    }

    // Random Neighbor: Random Swap
    getRandomNeighbor() {
        const n = this.tour.length;
        const i = Math.floor(Math.random() * n);
        let j = Math.floor(Math.random() * n);
        while (j === i) j = Math.floor(Math.random() * n);

        const newTour = [...this.tour];
        [newTour[i], newTour[j]] = [newTour[j], newTour[i]];

        return new TSPState(newTour, this.cities);
    }

    clone() {
        return new TSPState(this.tour, this.cities);
    }
}

export const TSPProblem = {
    id: 'tsp',
    name: 'Traveling Salesperson',
    description: 'Find the shortest path verifying all cities exactly once.',

    defaultParams: {
        size: 20 // Number of cities
    },

    // Create random cities and initial random tour
    // Params might contain 'cities' if we want to reuse them, or just size
    randomState: (params) => {
        let cities = params.cities;

        // If cities not provided, generate them
        if (!cities) {
            cities = [];
            const size = params.size || 20;
            for (let i = 0; i < size; i++) {
                // Generate cities in 100x100 grid for simplicity
                cities.push({
                    x: Math.random() * 100,
                    y: Math.random() * 100,
                    name: i < 26 ? String.fromCharCode(65 + i) : `C${i}` // A..Z then C26...
                });
            }
            // HACK: Store cities in params so subsequent calls (restarts) use same map
            params.cities = cities;
        }

        // Generate random permutation
        const tour = Array.from({ length: cities.length }, (_, i) => i);
        for (let i = tour.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [tour[i], tour[j]] = [tour[j], tour[i]];
        }

        return new TSPState(tour, cities);
    },

    // Empty state (start with no cities visited? or start city?)
    // Usually Constructive TSP starts at city 0 or random city.
    // Let's say empty tour.
    emptyState: (params) => {
        let cities = params.cities;
        // If cities missing, must gen (should shouldn't happen in BFS context usually)
        if (!cities) {
            // Fallback or Error?
            // Let's assume params has cities
            cities = [];
        }
        return new TSPState([], cities);
    },

    // Is Solution? For TSP, we don't know the optimal cost easily.
    // So we never return true unless we hit a specific target (unlikely).
    // Algorithms will run until max iterations/restarts.
    isSolution: (state) => {
        return false;
    },

    // GA: Order Crossover (OX1)
    crossover: (parents, params) => {
        const p1 = parents[0].tour;
        const p2 = parents[1].tour;
        const size = p1.length;

        // Pick 2 random cut points
        let start = Math.floor(Math.random() * size);
        let end = Math.floor(Math.random() * size);
        if (start > end) [start, end] = [end, start];

        // Output child array
        const childTour = new Array(size).fill(-1);

        // Copy segment from P1
        for (let i = start; i <= end; i++) {
            childTour[i] = p1[i];
        }

        // Fill remaining from P2 in order, skipping existing
        let p2Index = 0;
        for (let i = 0; i < size; i++) {
            // Find next empty slot in child (wrapping around from end+1)
            let childIndex = (end + 1 + i) % size;

            // Find next valid city in P2
            // We start checking P2 from end+1 too? Standard OX1 says yes?
            // Simplified: Just scan P2 from 0.
            while (childTour.includes(p2[p2Index])) {
                p2Index++;
            }
            if (p2Index < size && childTour[childIndex] === -1) {
                childTour[childIndex] = p2[p2Index];
            }
        }

        // Fallback for safety (though logic above should fill all)
        return new TSPState(childTour, parents[0].cities);
    },

    mutate: (state, rate, params) => {
        // Swap mutation
        if (Math.random() < rate) {
            const n = state.tour.length;
            const i = Math.floor(Math.random() * n);
            const j = Math.floor(Math.random() * n);
            [state.tour[i], state.tour[j]] = [state.tour[j], state.tour[i]];
            state.cachedCost = null;
        }
    },

    // Calculate or estimate the optimal cost
    estimatedOptimalCost: (params) => {
        const cities = params.cities;
        if (!cities) return null;

        const n = cities.length;

        // Brute force for small N
        if (n <= 10) {
            // Helper to calc distance
            const dist = (c1, c2) => Math.hypot(c1.x - c2.x, c1.y - c2.y);

            // Generate all permutations
            const indices = Array.from({ length: n }, (_, i) => i);
            let minCost = Infinity;

            // Heap's algorithm for permutations
            const generate = (k, A) => {
                if (k === 1) {
                    // Check cost
                    let cost = 0;
                    for (let i = 0; i < n; i++) {
                        cost += dist(cities[A[i]], cities[A[(i + 1) % n]]);
                    }
                    if (cost < minCost) minCost = cost;
                } else {
                    generate(k - 1, A);
                    for (let i = 0; i < k - 1; i++) {
                        if (k % 2 === 0) {
                            [A[i], A[k - 1]] = [A[k - 1], A[i]];
                        } else {
                            [A[0], A[k - 1]] = [A[k - 1], A[0]];
                        }
                        generate(k - 1, A);
                    }
                }
            };

            generate(n, [...indices]);
            return minCost;
        } else {
            // Run a quick Hill Climbing (Standard) with restarts to estimate
            const estimateParams = {
                maxSideways: 100,
                maxRestarts: 10,
                variant: 'standard'
            };

            // We need to pass the current cities in params!
            estimateParams.cities = cities;

            const problem = TSPProblem; // Self reference

            let bestEstimate = Infinity;

            // Run the generator
            const iterator = Algorithms.hillClimbing(null, estimateParams, problem);

            // Fast forward
            let result = iterator.next();
            while (!result.done) {
                if (result.value.state && result.value.state.cost < bestEstimate) {
                    bestEstimate = result.value.state.cost;
                }
                result = iterator.next();
            }
            // Check final
            if (result.value && result.value.state && result.value.state.cost < bestEstimate) {
                bestEstimate = result.value.state.cost;
            }

            return bestEstimate;
        }
    },

    formatCost: (cost) => {
        return (cost !== undefined && cost !== null && cost !== Infinity) ? cost.toFixed(3) : '-';
    },

    getSearchSpace: (params) => {
        const n = params.size;
        // Search space is (N-1)! / 2
        // log10((N-1)!/2) = sum(log10(i) for i=1 to N-1) - log10(2)
        let logSum = 0;
        for (let i = 1; i < n; i++) {
            logSum += Math.log10(i);
        }
        logSum -= Math.log10(2);

        const exponent = Math.floor(logSum);
        const mantissa = Math.pow(10, logSum - exponent);

        return {
            formula: '(N-1)!/2',
            approx: `${mantissa.toFixed(2)}e+${exponent}`
        };
    }
};
