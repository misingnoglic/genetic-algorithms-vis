import { Algorithms } from './core/algorithms.js';
import { NQueensProblem } from './core/problems/n-queens.js';

// Mock params
const params = {
    size: 8,
    beamWidth: 3,
    variant: 'deterministic',
    maxGenerations: 10
};

console.log('Testing Deterministic Beam Search...');
const gen = Algorithms.localBeamSearch(null, params, NQueensProblem);

let result = gen.next();
while (!result.done) {
    const { state, population, note, evaluations } = result.value;
    console.log(`[${note}] Best Cost: ${state.cost}, Pop Size: ${population.length}, Evals: ${evaluations}`);

    // Safety break if solved
    if (state.cost === 0) break;
    result = gen.next();
}

console.log('\nTesting Stochastic Beam Search...');
const paramsStochastic = { ...params, variant: 'stochastic', beamWidth: 5 };
const genS = Algorithms.localBeamSearch(null, paramsStochastic, NQueensProblem);

result = genS.next();
while (!result.done) {
    const { state, population, note } = result.value;
    console.log(`[${note}] Best Cost: ${state.cost}, Pop Size: ${population.length}`);
    if (state.cost === 0) break;
    result = genS.next();
}

console.log('Done.');
