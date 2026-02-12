import { Algorithms } from './core/algorithms.js';
import { NQueensProblem } from './core/problems/n-queens.js';

console.log('Starting Algorithm Smoke Tests...');

// Simple mock for App context
const mockProblemParams = { size: 8 };
const mockParams = { ...mockProblemParams }; // Combined params

function testAlgo(name, extraParams = {}, problem = NQueensProblem) {
    console.log(`Testing ${name}...`);
    try {
        // Merge params
        const fullParams = { ...mockParams, ...extraParams };

        const initialState = problem.randomState(fullParams);

        // Genetic Algorithm is special
        const generator = name === 'geneticAlgorithm'
            ? Algorithms[name](null, fullParams, problem)
            : Algorithms[name](initialState, fullParams);

        let steps = 0;
        let finalState = null;
        let result = generator.next();
        while (!result.done && steps < 1000) {
            result = generator.next();
            steps++;
        }

        if (steps >= 1000) {
            console.log(`[WARN] ${name} reached max steps without finishing (expected for some inputs).`);
        } else {
            console.log(`[PASS] ${name} finished in ${steps} steps. Final Cost: ${result.value?.state?.cost ?? 0}`);
        }
    } catch (e) {
        console.error(`[FAIL] ${name} crashed:`, e);
    }
}

// Test Hill Climbing
testAlgo('hillClimbing', { maxSideways: 10 });
testAlgo('hillClimbing', { maxSideways: 10, maxRestarts: 5 }); // Test Restart

// Test Stochastic Hill Climbing
testAlgo('stochasticHillClimbing', { variant: 'standard' });
testAlgo('stochasticHillClimbing', { variant: 'weighted' });
testAlgo('stochasticHillClimbing', { variant: 'firstChoice' });

// Test Simulated Annealing
testAlgo('simulatedAnnealing', { initialTemp: 100, coolingRate: 0.9 });

// Test Genetic Algorithm
testAlgo('geneticAlgorithm', {
    startingPopulationSize: 20,
    mutationRate: 0.1,
    maxGenerations: 50
}, NQueensProblem);

console.log('Tests Completed.');
