import { NQueensState } from './problems/n-queens.js'; // Optional: keep for now if needed, but ideally remove dependency

// Helper to wrap algorithm steps in a generator
// Use 'yield' to yield the current state/stats for visualization

export const Algorithms = {
    hillClimbing: function* (initialState, { maxSideways = 0, maxRestarts = 0 } = {}) {
        let current = initialState;
        let restarts = 0;
        let evaluations = 0;

        while (true) {
            let sidewaysMoves = 0;
            yield { state: current, note: restarts > 0 ? `Restart #${restarts}` : 'Initial State', restartCount: restarts, evaluations };

            while (true) {
                if (current.cost === 0) {
                    yield { state: current, note: 'Solution Found!', restartCount: restarts, evaluations };
                    return;
                }

                const neighbors = current.getNeighbors();
                evaluations += neighbors.length; // Count all generated neighbors

                // Find best neighbor
                let bestNeighbor = neighbors[0];
                let bestCost = bestNeighbor.cost;
                let dataset = [bestNeighbor];

                for (let i = 1; i < neighbors.length; i++) {
                    const cost = neighbors[i].cost;
                    if (cost < bestCost) {
                        bestCost = cost;
                        bestNeighbor = neighbors[i];
                        dataset = [neighbors[i]];
                    } else if (cost === bestCost) {
                        dataset.push(neighbors[i]);
                    }
                }

                // Random tie breaking
                const next = dataset[Math.floor(Math.random() * dataset.length)];

                if (next.cost < current.cost) {
                    current = next;
                    sidewaysMoves = 0;
                    yield { state: current, note: 'Improved', restartCount: restarts, evaluations };
                } else if (next.cost === current.cost) {
                    if (sidewaysMoves < maxSideways) {
                        current = next;
                        sidewaysMoves++;
                        yield { state: current, note: `Sideways move ${sidewaysMoves}/${maxSideways}`, restartCount: restarts, evaluations };
                    } else {
                        // Stuck
                        break;
                    }
                } else {
                    // Stuck
                    break;
                }
            }

            // If we are here, we are stuck. Check for restarts.
            if (restarts < maxRestarts) {
                yield { state: current, note: 'Stuck (Local Maxima) - Restarting...', restartCount: restarts, evaluations };
                restarts++;
                current = NQueensState.randomState(initialState.size);
                evaluations++; // Count the restart state
            } else {
                yield { state: current, note: 'Stuck (Local Maxima)', restartCount: restarts, evaluations };
                return;
            }
        }
    },

    stochasticHillClimbing: function* (initialState, { maxSideways = 0, maxRestarts = 0, variant = 'standard' } = {}) {
        let current = initialState;
        let restarts = 0;
        let evaluations = 0;

        while (true) {
            let sidewaysMoves = 0;
            yield { state: current, note: restarts > 0 ? `Restart #${restarts}` : 'Initial State', restartCount: restarts, evaluations };

            while (true) {
                if (current.cost === 0) {
                    yield { state: current, note: 'Solution Found!', restartCount: restarts, evaluations };
                    return;
                }

                let nextState = null;
                let moveType = 'Stuck'; // Improved, Sideways, Stuck

                // --- Strategies ---

                if (variant === 'firstChoice') {
                    // Generate neighbors randomly until better found or max attempts reached
                    // "First-choice hill climbing implements stochastic hill climbing by generating successors randomly until one is generated that is better"
                    // We need a limit to prevent infinite loops if local optima
                    const MAX_ATTEMPTS = current.size * current.size; // reasonable limit

                    for (let i = 0; i < MAX_ATTEMPTS; i++) {
                        evaluations++; // Count each check

                        // Generate random neighbor: pick random queen, move to random col
                        const queens = [...current.queens];
                        const row = Math.floor(Math.random() * current.size);
                        const col = Math.floor(Math.random() * current.size);

                        // Avoid self (not strictly necessary but efficient)
                        if (queens[row] === col) {
                            i--; continue;
                        }

                        queens[row] = col;
                        const neighbor = new NQueensState(current.size, queens);

                        if (neighbor.cost < current.cost) {
                            nextState = neighbor;
                            moveType = 'Improved';
                            break;
                        }
                    }
                    // Sideways not typically compatible with pure First Choice in strict definition, 
                    // but we could add it. For now, let's stick to "looking for better".

                } else {
                    // "Standard" (Random Uphill) and "Weighted" (Steepness) use all neighbors
                    const neighbors = current.getNeighbors();
                    evaluations += neighbors.length; // Count all generated neighbors

                    const betterNeighbors = neighbors.filter(n => n.cost < current.cost);
                    const equalNeighbors = neighbors.filter(n => n.cost === current.cost);

                    if (betterNeighbors.length > 0) {
                        moveType = 'Improved';
                        if (variant === 'weighted') {
                            // Probability proportional to steepness (improvement)
                            const improvements = betterNeighbors.map(n => current.cost - n.cost);
                            const totalImprovement = improvements.reduce((a, b) => a + b, 0);
                            let r = Math.random() * totalImprovement;

                            for (let i = 0; i < betterNeighbors.length; i++) {
                                r -= improvements[i];
                                if (r <= 0) {
                                    nextState = betterNeighbors[i];
                                    break;
                                }
                            }
                            // Fallback (rounding errors)
                            if (!nextState) nextState = betterNeighbors[betterNeighbors.length - 1];

                        } else {
                            // Standard: Random better neighbor
                            nextState = betterNeighbors[Math.floor(Math.random() * betterNeighbors.length)];
                        }
                    } else if (equalNeighbors.length > 0 && sidewaysMoves < maxSideways) {
                        // Sideways allowed in these modes if configured
                        nextState = equalNeighbors[Math.floor(Math.random() * equalNeighbors.length)];
                        moveType = 'Sideways';
                    }
                }

                // --- Apply Move ---

                if (nextState) {
                    current = nextState;
                    if (moveType === 'Improved') {
                        sidewaysMoves = 0;
                        yield { state: current, note: 'Improved', restartCount: restarts, evaluations };
                    } else {
                        sidewaysMoves++;
                        yield { state: current, note: `Sideways move ${sidewaysMoves}/${maxSideways}`, restartCount: restarts, evaluations };
                    }
                } else {
                    // Stuck
                    break;
                }
            }

            // If we are here, we are stuck. Check for restarts.
            if (restarts < maxRestarts) {
                yield { state: current, note: 'Stuck (Local Maxima) - Restarting...', restartCount: restarts, evaluations };
                restarts++;
                current = NQueensState.randomState(initialState.size);
                evaluations++;
            } else {
                yield { state: current, note: 'Stuck (Local Maxima)', restartCount: restarts, evaluations };
                return;
            }
        }
    },

    simulatedAnnealing: function* (initialState, { initialTemp = 100, coolingRate = 0.99 } = {}) {
        let current = initialState;
        let temp = initialTemp;
        let evaluations = 0;

        yield { state: current, note: `T=${temp.toFixed(2)}`, evaluations };

        while (true) {
            if (current.cost === 0) {
                yield { state: current, note: 'Solution Found!', evaluations };
                return;
            }

            if (temp < 0.0001) {
                yield { state: current, note: 'Frozen', evaluations };
                return;
            }

            // Random neighbor
            const neighbors = current.getNeighbors();
            const next = neighbors[Math.floor(Math.random() * neighbors.length)];
            evaluations++; // Count 1 check

            const deltaE = current.cost - next.cost; // Positive if next is better (lower cost)

            if (deltaE > 0) {
                current = next;
                yield { state: current, note: `T=${temp.toFixed(2)} (Improved)`, evaluations };
            } else {
                // Probability loop
                const prob = Math.exp(deltaE / temp);
                if (Math.random() < prob) {
                    current = next;
                    yield { state: current, note: `T=${temp.toFixed(2)} (Accepted worse)`, evaluations };
                } else {
                    // Stay
                    yield { state: current, note: `T=${temp.toFixed(2)}`, evaluations };
                }
            }

            temp *= coolingRate;
        }
    },

    geneticAlgorithm: function* (dummyState, params = {}, problem) {
        // params now contains problem specific params too
        const {
            startingPopulationSize = 100,
            mutationRate = 0.1,
            // mixingNumber = 2, // Hardcoded to 2 for visualization simplicity
            cullRate = 0.0, // Percentage of population to kill off before selection
            elitism = true, // Keep best individual
            maxGenerations = 1000
        } = params;

        const mixingNumber = 2; // Fixed
        let evaluations = 0;

        // Initialize Population
        let population = [];
        for (let i = 0; i < startingPopulationSize; i++) {
            const ind = problem.randomState(params);
            ind.metadata = { status: 'New' }; // Abstract metadata
            population.push(ind);
            evaluations++;
        }

        // Sort by fitness (lowest cost is best)
        population.sort((a, b) => a.cost - b.cost);

        // Track best
        let best = population[0];
        yield {
            state: best,
            population: population, // Yield full population
            note: `Gen 0 Best: ${best.cost}`,
            populationStats: { size: population.length, avgCost: avgCost(population) },
            evaluations
        };

        for (let gen = 1; gen <= maxGenerations; gen++) {
            if (best.cost === 0) {
                yield { state: best, population, note: `Solution in Gen ${gen - 1}`, evaluations };
                return;
            }

            // Mark everyone as 'Survivor' initially
            population.forEach(p => p.metadata = { status: 'Survivor' });

            // Culling
            let survivors = population;
            if (cullRate > 0) {
                const keepCount = Math.floor(population.length * (1 - cullRate));
                // Mark culled
                for (let i = keepCount; i < population.length; i++) {
                    population[i].metadata = { status: 'Culled' };
                }
                survivors = population.slice(0, keepCount);
            }

            const newPopulation = [];

            // Elitism: Keep best
            if (elitism) {
                const elite = survivors[0]; // Assuming sorted
                elite.metadata = { status: 'Elite' }; // Mark elite
                newPopulation.push(elite);
                // Elites don't count as new evaluations, they are just copied
            }

            // Generate new population
            while (newPopulation.length < startingPopulationSize) {
                // Selection - Tournament
                const parents = [];
                for (let p = 0; p < mixingNumber; p++) {
                    const parent = tournamentSelect(survivors, 3);
                    // parent.metadata = { status: 'Parent' }; // Could mark, but they can be reused
                    parents.push(parent);
                }

                // Crossover
                const childState = problem.crossover(parents, params);

                // Mutation
                problem.mutate(childState, mutationRate, params);

                childState.metadata = { status: 'Child' }; // New child
                newPopulation.push(childState);
                evaluations++;
            }

            population = newPopulation;
            population.sort((a, b) => a.cost - b.cost);
            best = population[0];

            yield {
                state: best,
                population: population,
                note: `Gen ${gen} Best: ${best.cost}`,
                populationStats: { size: population.length, avgCost: avgCost(population) },
                evaluations
            };
        }
    }
};

// --- GA Helpers ---

function avgCost(pop) {
    const sum = pop.reduce((acc, s) => acc + s.cost, 0);
    return (sum / pop.length).toFixed(2);
}

function tournamentSelect(population, k = 3) {
    let best = null;
    for (let i = 0; i < k; i++) {
        const ind = population[Math.floor(Math.random() * population.length)];
        if (!best || ind.cost < best.cost) {
            best = ind;
        }
    }
    return best;
}

function crossover(parents, size) {
    // If mixingNumber (rho) = 2, standard crossover
    // If > 2, we can do uniform crossover from pool

    // Uniform crossover generalizable to N parents: each gene comes from a random parent
    if (parents.length > 2) {
        const childQueens = [];
        for (let i = 0; i < size; i++) {
            const randomParent = parents[Math.floor(Math.random() * parents.length)];
            childQueens.push(randomParent.queens[i]);
        }
        return new NQueensState(size, childQueens);
    } else {
        // Standard random point crossover for 2 parents
        // Or Uniform (50/50)
        // Let's implement single point for 2 parents as it's classic
        const p1 = parents[0];
        const p2 = parents[1];
        const point = Math.floor(Math.random() * size);

        const childQueens = [
            ...p1.queens.slice(0, point),
            ...p2.queens.slice(point)
        ];
        return new NQueensState(size, childQueens);
    }
}

function mutate(state, rate) {
    for (let i = 0; i < state.size; i++) {
        if (Math.random() < rate) {
            state.queens[i] = Math.floor(Math.random() * state.size);
            state.cachedCost = null; // Invalidate cache
        }
    }
}
