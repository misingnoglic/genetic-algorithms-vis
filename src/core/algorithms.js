// Helper to wrap algorithm steps in a generator
// Use 'yield' to yield the current state/stats for visualization
import { ConstructiveAlgorithms } from './constructive-algorithms.js';

export const Algorithms = {
    hillClimbing: function* (initialState, params = {}, problem) {
        const { maxSideways = 0, maxRestarts = 0 } = params;

        // If initialState is null (e.g. for TSP/Beam where we might want to let alg init), 
        // handle it, but usually HC takes a start node.
        let current = initialState || problem.randomState(params);
        let restarts = 0;
        let evaluations = 0;

        while (true) {
            let sidewaysMoves = 0;
            yield { state: current, note: restarts > 0 ? `Restart #${restarts}` : 'Initial State', restartCount: restarts, evaluations };

            while (true) {
                if (problem.isSolution(current)) {
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

                // Tolerance logic
                const tolerance = params.sidewaysTolerance || 0;
                // Check if strictly better
                if (next.cost < current.cost) {
                    current = next;
                    sidewaysMoves = 0;
                    yield { state: current, note: 'Improved', restartCount: restarts, evaluations };
                } else {
                    // Check sideways
                    const isSideways = next.cost === current.cost || (tolerance > 0 && next.cost <= current.cost * (1 + tolerance));

                    if (isSideways) {
                        if (sidewaysMoves < maxSideways) {
                            const type = next.cost === current.cost ? 'Sideways' : 'Sideways (≈)';
                            current = next;
                            sidewaysMoves++;
                            yield { state: current, note: `${type} move ${sidewaysMoves}/${maxSideways}`, restartCount: restarts, evaluations };
                        } else {
                            break; // Stuck (limit)
                        }
                    } else {
                        break; // Stuck (worse)
                    }
                }
            }

            // If we are here, we are stuck. Check for restarts.
            if (restarts < maxRestarts) {
                yield { state: current, note: 'Stuck (Local Maxima) - Restarting...', restartCount: restarts, evaluations };
                restarts++;
                current = problem.randomState(params);
                evaluations++; // Count the restart state
            } else {
                yield { state: current, note: 'Stuck (Local Maxima)', restartCount: restarts, evaluations };
                return;
            }
        }
    },

    stochasticHillClimbing: function* (initialState, params = {}, problem) {
        const { maxSideways = 0, maxRestarts = 0, variant = 'standard' } = params;

        let current = initialState || problem.randomState(params);
        let restarts = 0;
        let evaluations = 0;

        while (true) {
            let sidewaysMoves = 0;
            yield { state: current, note: restarts > 0 ? `Restart #${restarts}` : 'Initial State', restartCount: restarts, evaluations };

            while (true) {
                if (problem.isSolution(current)) {
                    yield { state: current, note: 'Solution Found!', restartCount: restarts, evaluations };
                    return;
                }

                let nextState = null;
                let moveType = 'Stuck'; // Improved, Sideways, Stuck

                // --- Strategies ---

                if (variant === 'firstChoice') {
                    const MAX_ATTEMPTS = 500; // Fixed reasonable limit to prevent hang
                    let firstSideways = null;

                    for (let i = 0; i < MAX_ATTEMPTS; i++) {
                        evaluations++; // Count each check

                        // Use problem-specific random neighbor if available, or fallback
                        // Ideally state.getRandomNeighbor()
                        const neighbor = current.getRandomNeighbor();

                        if (neighbor.cost < current.cost) {
                            nextState = neighbor;
                            moveType = 'Improved';
                            break;
                        } else if (neighbor.cost === current.cost && !firstSideways) {
                            firstSideways = neighbor;
                        }
                    }

                    // If no improvement found, try sideways
                    if (!nextState && firstSideways && sidewaysMoves < maxSideways) {
                        nextState = firstSideways;
                        moveType = 'Sideways';
                    } else if (!nextState && !firstSideways) {
                        if (restarts < maxRestarts) {
                            yield { state: current, note: `Stuck (Checked ${MAX_ATTEMPTS}, No moves) - Restarting...`, restartCount: restarts, evaluations };
                            restarts++;
                            current = problem.randomState(params);
                            evaluations++;
                            continue; // Skip the outer loop yield
                        }
                    } else if (!nextState && firstSideways && sidewaysMoves >= maxSideways) {
                        if (restarts < maxRestarts) {
                            yield { state: current, note: `Stuck (Sideways limit ${maxSideways}) - Restarting...`, restartCount: restarts, evaluations };
                            restarts++;
                            current = problem.randomState(params);
                            evaluations++;
                            continue;
                        }
                    }

                } else {
                    // "Standard" (Random Uphill) and "Weighted" (Steepness) use all neighbors
                    const neighbors = current.getNeighbors();
                    evaluations += neighbors.length; // Count all generated neighbors

                    const betterNeighbors = neighbors.filter(n => n.cost < current.cost);
                    const equalNeighbors = neighbors.filter(n => n.cost === current.cost);

                    if (betterNeighbors.length > 0) {
                        moveType = 'Improved';
                        if (variant === 'weighted') {
                            // ... (weighted logic unchanged)
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
                    } else {
                        // Check for Sideways (with tolerance)
                        // Note: equalNeighbors uses strict equality. We need to filter based on tolerance.
                        // Re-filter neighbors based on tolerance logic if no better neighbors found.

                        const tolerance = params.sidewaysTolerance || 0; // percentage e.g. 0.05
                        const threshold = current.cost * (1 + tolerance);

                        // Better neighbors were already improved.
                        // Now look for "Sideways" candidates: cost > current.cost but <= threshold
                        // AND strictly equal neighbors (cost === current.cost)

                        // Actually, 'betterNeighbors' covered strictly better.
                        // We strictly want: cost >= current.cost AND cost <= threshold.
                        // But usually we just want "not worse than threshold".
                        // If tolerance is 0, we only accept equal.

                        const sidewaysCandidates = neighbors.filter(n => {
                            if (n.cost < current.cost) return false; // Already handled (better)
                            if (n.cost === current.cost) return true; // Strictly equal
                            // Tolerance check (for TSP)
                            if (tolerance > 0 && n.cost <= threshold) return true;
                            return false;
                        });

                        if (sidewaysCandidates.length > 0 && sidewaysMoves < maxSideways) {
                            nextState = sidewaysCandidates[Math.floor(Math.random() * sidewaysCandidates.length)];
                            moveType = nextState.cost === current.cost ? 'Sideways' : 'Sideways (≈)';
                        }
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
                current = problem.randomState(params);
                evaluations++;
            } else {
                yield { state: current, note: 'Stuck (Local Maxima)', restartCount: restarts, evaluations };
                return;
            }
        }
    },

    simulatedAnnealing: function* (initialState, params = {}, problem) {
        const { initialTemp = 100, coolingRate = 0.99 } = params;

        let current = initialState || problem.randomState(params);
        let temp = initialTemp;
        let evaluations = 0;

        yield { state: current, note: `T=${temp.toFixed(2)}`, evaluations };

        while (true) {
            if (problem.isSolution(current)) {
                yield { state: current, note: 'Solution Found!', evaluations };
                return;
            }

            if (temp < 0.0001) {
                yield { state: current, note: 'Frozen', evaluations };
                return;
            }

            // Random neighbor
            const next = current.getRandomNeighbor();
            evaluations++; // Count 1 check

            const deltaE = current.cost - next.cost; // Positive if next is better (lower cost)

            if (deltaE > 0) {
                current = next;
                yield { state: current, note: `T=${temp.toFixed(2)} (Improved)`, evaluations };
            } else {
                // Worse move. Accept with probability exp(deltaE / T)
                // deltaE is negative here.
                const probability = Math.exp(deltaE / temp);
                if (Math.random() < probability) {
                    current = next;
                    yield { state: current, note: `T=${temp.toFixed(2)} (Accepted worse)`, evaluations };
                } else {
                    // Stay
                    yield { state: current, note: `T=${temp.toFixed(2)}`, evaluations };
                }
            }

            // Cool down
            temp *= coolingRate;

            // If temperature gets too low and we haven't found a solution, reheat or restart
            if (temp < 0.01) {
                if (problem.isSolution(current)) { // Should have been caught, but check again
                    yield { state: current, note: 'Solution Found!', evaluations };
                    return;
                }

                // For TSP, we don't know if we have a solution by cost > 0.
                // Request: Just stop when frozen.
                yield { state: current, note: 'Frozen', evaluations };
                return;
            }
        }
    },

    localBeamSearch: function* (dummyState, params = {}, problem) {
        const { beamWidth = 5, variant = 'deterministic', maxGenerations = 1000, maxSideways = 0, maxRestarts = 0 } = params;
        let evaluations = 0;
        let restarts = 0;

        while (true) { // Restart loop

            // Initialize K random states
            let population = [];
            for (let i = 0; i < beamWidth; i++) {
                const state = problem.randomState(params);
                state.metadata = { status: 'New' };
                population.push(state);
                evaluations++;
            }

            // Initial Yield
            population.sort((a, b) => a.cost - b.cost);
            let best = population[0];
            let bestSoFar = best;
            let sidewaysMoves = 0;

            yield {
                state: best,
                population,
                note: restarts > 0 ? `Beam Init(Restart #${restarts})` : `Beam Init(k = ${beamWidth})`,
                populationStats: { size: population.length, avgCost: avgCost(population) },
                restartCount: restarts,
                evaluations
            };

            // Generation Loop
            let stuck = false;

            for (let gen = 1; gen <= maxGenerations; gen++) {
                if (problem.isSolution(best)) {
                    yield { state: best, population, note: `Solution Found!`, evaluations, restartCount: restarts };
                    return;
                }

                // Generate all successors
                let allSuccessors = [];
                for (const parent of population) {
                    const neighbors = parent.getNeighbors();
                    evaluations += neighbors.length;
                    allSuccessors.push(...neighbors);
                }

                if (allSuccessors.length === 0) {
                    stuck = true; break;
                }

                let nextPopulation = [];

                if (variant === 'stochastic') {
                    // Helper to avoid NaN if costs are huge?
                    // normalize costs relative to min?
                    // cost can be large for TSP. exp(-cost) -> 0.
                    // Need better selection for large costs.
                    // Use Rank selection or Tournament?
                    // Let's stick to weighted but maybe careful with beta.
                    // Or just use Tournament for consistency?
                    // Let's stick to implementation but normalize min cost.

                    const minCost = allSuccessors.reduce((min, s) => Math.min(min, s.cost), Infinity);
                    const beta = 1; // Sensitivity
                    // Shift costs so best is 0 to avoid underflow
                    const weights = allSuccessors.map(s => Math.exp(-beta * (s.cost - minCost)));
                    const totalWeight = weights.reduce((a, b) => a + b, 0);

                    for (let k = 0; k < beamWidth; k++) {
                        let r = Math.random() * totalWeight;
                        let selected = null;
                        for (let i = 0; i < allSuccessors.length; i++) {
                            r -= weights[i];
                            if (r <= 0) {
                                selected = allSuccessors[i];
                                break;
                            }
                        }
                        if (!selected) selected = allSuccessors[allSuccessors.length - 1];
                        selected.metadata = { status: 'Selected' };
                        nextPopulation.push(selected);
                    }
                } else {
                    // Deterministic: Select k best
                    allSuccessors.sort((a, b) => a.cost - b.cost);
                    nextPopulation = allSuccessors.slice(0, beamWidth);
                    nextPopulation.forEach(p => p.metadata = { status: 'Best' });
                }

                // Update Population
                population = nextPopulation;
                population.sort((a, b) => a.cost - b.cost);
                const newBest = population[0];

                // Check Progress / Sideways
                let note = '';
                // Fix: Only reset sideways if we improve upon the BEST seen so far, 
                // preventing oscillation (A -> B -> A) from resetting the count.
                if (!bestSoFar || newBest.cost < bestSoFar.cost) {
                    sidewaysMoves = 0;
                    bestSoFar = newBest;
                    note = `Gen ${gen} Improved: ${newBest.cost.toFixed(2)} `;
                } else {
                    sidewaysMoves++;
                    note = `Gen ${gen} Sideways(${sidewaysMoves} / ${maxSideways})`;
                }

                best = newBest; // We still move to the new population

                // Update bestSoFar if we somehow lost it or it wasn't set?
                // Actually bestSoFar logic above handles it.
                // But wait, if newBest < best.cost but >= bestSoFar?
                // e.g. 10 -> 12. bestSoFar=10. new=12. Sideways++.
                // Next: 12 -> 10. bestSoFar=10. new=10. Sideways++.
                // Yes, that works.

                yield {
                    state: best,
                    population,
                    note: note,
                    populationStats: { size: population.length, avgCost: avgCost(population) },
                    restartCount: restarts,
                    evaluations
                };

                if (problem.isSolution(best)) {
                    yield { state: best, population, note: `Solution Found!`, evaluations, restartCount: restarts };
                    return;
                }

                if (sidewaysMoves >= maxSideways) {
                    stuck = true;
                    break;
                }
            }

            if (stuck || evaluations > 0) { // If loop finished or stuck
                if (restarts < maxRestarts) {
                    yield { state: best, population, note: 'Stuck/Limit - Restarting...', restartCount: restarts, evaluations };
                    restarts++;
                    // Loop continues to re-init
                } else {
                    yield { state: best, population, note: 'Stuck (Max Restarts Reached)', restartCount: restarts, evaluations };
                    return;
                }
            }
        }
    },

    geneticAlgorithm: function* (dummyState, params = {}, problem) {
        // params now contains problem specific params too
        const {
            startingPopulationSize = 100,
            mutationRate = 0.1,
            cullRate = 0.0,
            elitism = true,
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
            note: `Gen 0 Best: ${best.cost.toFixed(2)} `,
            populationStats: { size: population.length, avgCost: avgCost(population) },
            evaluations
        };

        for (let gen = 1; gen <= maxGenerations; gen++) {
            if (problem.isSolution(best)) {
                yield { state: best, population, note: `Solution in Gen ${gen - 1} `, evaluations };
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
                const elite = survivors[0].clone(); // Clone to prevent mutation affecting previous gen stats if ref held?
                // Actually, state objects are usually immutable-ish or replaced. 
                // But deep clone is safer for elite persistence.
                elite.metadata = { status: 'Elite' };
                newPopulation.push(elite);
            }

            // Generate new population
            while (newPopulation.length < startingPopulationSize) {
                // Selection - Tournament
                const parents = [];
                for (let p = 0; p < mixingNumber; p++) {
                    const parent = tournamentSelect(survivors, 3);
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
                note: `Gen ${gen} Best: ${best.cost.toFixed(2)} `,
                populationStats: { size: population.length, avgCost: avgCost(population) },
                evaluations
            };
        }
    },

    // spread constructive
    ...ConstructiveAlgorithms
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
