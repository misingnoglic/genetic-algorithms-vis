import { Algorithms } from './core/algorithms.js';
import { NQueensProblem } from './core/problems/n-queens.js';

// NQueensProblem is exported as an Object singleton in valid JS modules
// It has 'randomState' method.
const problem = NQueensProblem;
// Harder problem to force plateau
const params = { size: 8, beamWidth: 2, maxSideways: 5, maxGenerations: 1000, variant: 'deterministic' };

console.log('--- Starting Beam Search Smoke Test ---');
const iterator = Algorithms.localBeamSearch(null, params, problem);

let steps = 0;
let lastNote = '';
let stuck = false;

while (true) {
    const result = iterator.next();
    if (result.done) break;
    steps++;
    const { note, state } = result.value;
    lastNote = note;

    // Log progress every 10 steps or if interesting
    if (steps % 10 === 0 || note.includes('Stuck') || note.includes('Sideways')) {
        console.log(`Step ${steps}: ${note}, Cost: ${state.cost}`);
    }

    if (steps > 200) {
        console.log('❌ FAILED: Ran too long > 200 steps');
        process.exit(1);
    }
}

console.log(`--- Finished in ${steps} steps ---`);
console.log(`Final Note: ${lastNote}`);

if (lastNote.includes('Stuck') || lastNote.includes('Solution')) {
    console.log('✅ PASSED: Stopped correctly.');
} else {
    console.log('❌ FAILED: Did not stop with expected Stuck/Solution message.');
}
