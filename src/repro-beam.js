
import { Algorithms } from './core/algorithms.js';
import { TSPProblem } from './core/problems/tsp.js';

// Mock params matching user screenshot
const params = {
    size: 20,
    beamWidth: 10,
    maxSideways: 100,
    maxRestarts: 2,
    variant: 'deterministic',
    // We intentionally leave maxGenerations as default (1000)
};

const problem = TSPProblem;
const problemParams = { size: 20 };
// Pre-generate a problem instance
const initialParams = { ...params };
const dummyState = problem.randomState(initialParams); // Just to init cities
// Ensure cities are consistent
params.cities = dummyState.cities;

console.log("Starting Beam Search Repro...");
const iterator = Algorithms.localBeamSearch(null, params, problem);

let result = iterator.next();
let lastGenCost = Infinity;
let genCount = 0;

while (!result.done) {
    const val = result.value;
    if (val.state) {
        if (val.note.includes('Gen')) {
            genCount++;
            // Parse gen number if needed or just track count
            const isImprovement = val.state.cost < lastGenCost;

            // Check if note says "Improved" or "Sideways"
            const isSidewaysNote = val.note.includes('Sideways');

            console.log(`[${genCount}] Cost: ${val.state.cost.toFixed(2)} | Note: ${val.note} | Improved: ${isImprovement}`);

            if (isImprovement && isSidewaysNote) {
                console.error("ERROR: Note says Sideways but Cost Improved!");
            }
            if (!isImprovement && !isSidewaysNote && !val.note.includes('Gen 0') && !val.note.includes('Solution') && !val.note.includes('Restart')) {
                // Note: Gen X Improved...
                // If cost didn't improve but note says Improved
                // Wait, cost could be equal?
                if (val.state.cost === lastGenCost) {
                    console.error("ERROR: Note says Improved (presumably) but Cost Equal!");
                }
            }

            lastGenCost = val.state.cost;
        } else if (val.note.includes('Restart')) {
            console.log(`--- RESTART ---`);
            lastGenCost = Infinity;
        }
    }
    result = iterator.next();

    if (genCount > 600) {
        console.log("Force stop at 600 for repro check");
        break;
    }
}
console.log("Done.");
