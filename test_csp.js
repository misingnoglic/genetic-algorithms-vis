import { ConstructiveAlgorithms } from './src/core/constructive-algorithms.js';
import { MapColoringProblem } from './src/core/problems/map-coloring.js';

function run(algoStr, heuristic, valueOrdering) {
    const params = { graphType: 'us', numColors: 4, variableHeuristic: heuristic, valueOrdering: valueOrdering };
    const algo = ConstructiveAlgorithms[algoStr];
    
    const gen = algo(null, params, MapColoringProblem);
    let lastResult = null;
    while (true) {
        const result = gen.next();
        if (result.done) break;
        lastResult = result.value;
        if (lastResult && lastResult.state && lastResult.note === 'Solution Found!') {
            break; // Solution found Note might be the last yielded value before return.
        }
    }
    console.log(`${algoStr} + ${heuristic} + ${valueOrdering}:`, lastResult ? lastResult.evaluations : 'no evaluations field found');
}

run('forwardChecking', 'mrv', 'inOrder');
run('arcConsistency', 'mrv', 'inOrder');
run('forwardChecking', 'mrv', 'lcv');
run('arcConsistency', 'mrv', 'lcv');
run('forwardChecking', 'inOrder', 'inOrder');
run('arcConsistency', 'inOrder', 'inOrder');
