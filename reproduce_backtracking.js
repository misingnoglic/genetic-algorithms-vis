
import { ConstructiveAlgorithms } from './src/core/constructive-algorithms.js';
import { NQueensProblem } from './src/core/problems/n-queens.js';

const run = () => {
    console.log("Starting Backtracking N=8 check...");
    const params = { size: 8 };
    const problem = NQueensProblem;
    const iterator = ConstructiveAlgorithms.backtracking(null, params, problem);

    let result = iterator.next();
    let steps = 0;
    while (!result.done) {
        steps++;
        const { state, note } = result.value;
        if (state && problem.isSolution(state)) {
            console.log(`SUCCESS: Solution found in ${steps} steps.`);
            console.log(state.queens);
            return;
        }
        if (!state && note.includes("No Solution")) {
            console.log(`FAILURE: Exhausted in ${steps} steps.`);
            return;
        }
        result = iterator.next();
    }
    console.log("Finished without implicit solution or exhaustion?");
};

run();
