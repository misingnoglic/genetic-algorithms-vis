import { Algorithms } from './algorithms';

export const BENCHMARK_CONFIGS = [
    {
        id: 'hc_std',
        name: 'Hill Climbing (Standard)',
        algorithm: 'hillClimbing',
        params: { maxSideways: 100, maxRestarts: 5, variant: 'standard' }
    },
    {
        id: 'hc_stoch',
        name: 'Stochastic HC (Weighted)',
        algorithm: 'stochasticHillClimbing',
        params: { maxSideways: 100, maxRestarts: 5, variant: 'weighted' }
    },
    {
        id: 'beam',
        name: 'Beam Search (k=10)',
        algorithm: 'localBeamSearch',
        params: { beamWidth: 10, variant: 'stochastic', maxSideways: 10, maxRestarts: 2 }
    },
    {
        id: 'sa_fast',
        name: 'Sim. Annealing (Fast)',
        algorithm: 'simulatedAnnealing',
        params: { initialTemp: 1000, coolingRate: 0.95 }
    },
    {
        id: 'sa_slow',
        name: 'Sim. Annealing (Slow)',
        algorithm: 'simulatedAnnealing',
        params: { initialTemp: 1000, coolingRate: 0.995 }
    },
    {
        id: 'sa_extreme',
        name: 'Sim. Annealing (Extreme)',
        algorithm: 'simulatedAnnealing',
        params: { initialTemp: 10000, coolingRate: 0.9995 }
    },
    {
        id: 'ga',
        name: 'Genetic Algo',
        algorithm: 'geneticAlgorithm',
        params: { startingPopulationSize: 100, mutationRate: 0.1, elitism: true, cullRate: 0.2 }
    },
    {
        id: 'bfs',
        name: 'BFS (Uninformed)',
        algorithm: 'bfs',
        params: { maxIterations: 10000 }
    },
    {
        id: 'dfs',
        name: 'DFS (Uninformed)',
        algorithm: 'dfs',
        params: { maxIterations: 10000 }
    },
    {
        id: 'backtracking',
        name: 'Backtracking (CSP)',
        algorithm: 'backtracking',
        params: { maxIterations: 10000 }
    },
    {
        id: 'fc',
        name: 'Forward Checking',
        algorithm: 'forwardChecking',
        params: { maxIterations: 5000 }
    },
    {
        id: 'ac3',
        name: 'Arc Consistency',
        algorithm: 'arcConsistency',
        params: { maxIterations: 2000 }
    }
];

export const getValidConfigs = (problemId, problem) => {
    return BENCHMARK_CONFIGS.filter(c => {
        // If the problem doesn't support CSP, filter out CSP algorithms
        if (problem && !problem.supportsCSP) {
            return !['backtracking', 'forwardChecking', 'arcConsistency'].includes(c.algorithm);
        }
        return true;
    });
};

export class BenchmarkRunner {
    constructor(problem, problemParams) {
        this.problem = problem;
        this.problemParams = { ...problemParams };
        this.isRunning = false;
        this.cancelFlag = false;
    }

    cancel() {
        this.cancelFlag = true;
    }

    async run(onProgress) {
        this.isRunning = true;
        this.cancelFlag = false;

        // Filter configs based on problem compatibility
        const validConfigs = getValidConfigs(this.problem.id, this.problem);

        const numSeeds = 5;
        const totalRuns = numSeeds * validConfigs.length;
        let completedRuns = 0;

        // Results structure
        const results = {};
        validConfigs.forEach(c => {
            results[c.id] = {
                config: c,
                bestCosts: [],
                steps: [],
                evaluations: [],
                times: [],
                solutionsFound: 0
            };
        });

        // 1. Generate Seeds
        const seeds = [];
        for (let i = 0; i < numSeeds; i++) {
            seeds.push(this.problem.randomState(this.problemParams));
        }

        const runStart = performance.now();

        // 2. Loop
        for (let i = 0; i < numSeeds; i++) {
            const seedState = seeds[i];

            for (const config of validConfigs) {
                if (this.cancelFlag) return null;

                const algoStart = performance.now();
                const params = { ...this.problemParams, ...config.params };
                let gen;

                // For Constructive Algos:
                // They shouldn't use the 'random' seedState as a start point usually.
                // They start from 'empty'.
                // BUT if we want to solve a specific Sudoku puzzle, the seedState IS the puzzle.
                // The algorithms.js implementations of bfs/dfs/backtracking handle dummyState logic:
                // "if (dummyState && problem.id === 'sudoku') ... use it as puzzle source"
                // For N-Queens, seedState is random full board -> they ignore it and start empty.
                // For TSP, seedState has cities -> they extract cities?
                // constructive-algorithms.js logic:
                // bfs: "let root = problem.emptyState(params)"
                // It doesn't look at seedState for TSP cities?
                // Wait, emptyState(params) uses params.cities!
                // So we MUST ensure params.cities is set from seedState for TSP.

                // Generic instance params extraction
                if (this.problem.extractInstanceParams) {
                    Object.assign(params, this.problem.extractInstanceParams(seedState));
                }

                if (config.algorithm === 'geneticAlgorithm' || config.algorithm === 'localBeamSearch') {
                    gen = Algorithms[config.algorithm](null, params, this.problem);
                } else {
                    gen = Algorithms[config.algorithm](seedState, params, this.problem);
                }

                // Execute Fast
                let steps = 0;
                let bestCost = Infinity;
                let finalState = null;
                let finalVal = null;
                const MAX_STEPS = config.params.maxIterations || 50000;

                while (true) {
                    const res = gen.next();
                    if (res.done) {
                        try {
                            if (res.value && typeof res.value === 'object' && res.value.state) {
                                // Sometimes return value is just "Solution Found" string
                                // Check if it yielded a final state/stats
                                finalVal = res.value;
                            }
                        } catch (e) { }
                        break;
                    }

                    const val = res.value;
                    if (val) {
                        finalVal = val;
                        if (val.state && val.state.cost < bestCost) bestCost = val.state.cost;
                        finalState = val.state;
                    }
                    steps++;

                    if (steps > MAX_STEPS) break;
                }

                // Final cleanup for results
                if (bestCost === Infinity && finalState) bestCost = finalState.cost;
                // For Constructive, if no solution found, cost might be high or undefined?
                // The state usually has a cost.
                // If it failed (bfs exhausted), bestCost might be the last specific state?
                // BFS/DFS yield { state: ... } on failure?
                // They yield { state: null, note: 'No Solution' } at end.
                // So finalState might be null.
                // In that case, bestCost = Infinity.
                // Which is correct (failed).

                // But for N-Queens, if we time out, we want the best partial cost?
                // Or initialized cost (empty)?
                if (bestCost === Infinity) bestCost = 9999; // Fallback for charts

                const algoEnd = performance.now();

                results[config.id].bestCosts.push(bestCost);
                results[config.id].steps.push(steps);
                results[config.id].evaluations.push(finalVal ? (finalVal.evaluations || 0) : 0);
                results[config.id].times.push(algoEnd - algoStart);
                if (bestCost === 0) results[config.id].solutionsFound++;

                completedRuns++;
                onProgress(completedRuns / totalRuns);

                await new Promise(r => setTimeout(r, 0));
            }
        }

        // 3. Aggregate
        const finalStats = Object.values(results).map(r => {
            const minCost = Math.min(...r.bestCosts);
            const avgCost = r.bestCosts.reduce((a, b) => a + b, 0) / r.bestCosts.length;
            const avgSteps = r.steps.reduce((a, b) => a + b, 0) / r.steps.length;
            const avgEvaluations = r.evaluations.reduce((a, b) => a + b, 0) / r.evaluations.length;
            const avgTime = r.times.reduce((a, b) => a + b, 0) / r.times.length;

            return {
                id: r.config.id,
                name: r.config.name,
                minCost,
                avgCost,
                avgSteps,
                avgEvaluations,
                avgTime,
                successRate: (r.solutionsFound / numSeeds) * 100
            };
        });

        // Sort by Min Cost then Avg Evaluations (Efficiency)
        finalStats.sort((a, b) => {
            if (a.minCost !== b.minCost) return a.minCost - b.minCost;
            return a.avgEvaluations - b.avgEvaluations;
        });

        return finalStats;
    }
}
