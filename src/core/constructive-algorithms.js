// Constructive Algorithms (CSP)
import { Algorithms } from './algorithms.js';

// Constructive Search Algorithms (Building solutions from empty/partial states)

// Helper to get successors for N-Queens
// Returns array of next states (adding 1 queen)
const getNQueensSuccessors = (state, params) => {
    // Find first unassigned (null) row
    let nextRow = -1;
    for (let r = 0; r < state.size; r++) {
        if (state.queens[r] === null || state.queens[r] === undefined) {
            nextRow = r;
            break;
        }
    }
    if (nextRow === -1) return []; // Fully assigned

    const successors = [];
    // Try all columns
    const cols = [];
    if (state.domains && state.domains[nextRow]) {
        // Use domain if available
        cols.push(...state.domains[nextRow]);
    } else {
        // All cols
        for (let c = 0; c < state.size; c++) cols.push(c);
    }

    for (const col of cols) {
        // Create new state by setting the column for this row
        const newQueens = [...state.queens];
        newQueens[nextRow] = col;

        let newDomains = null;
        if (state.domains) {
            newDomains = state.domains.map(d => [...d]); // Deep copy
            newDomains[nextRow] = [col]; // Assigned
        }

        const successState = new state.constructor(state.size, newQueens, newDomains);
        successors.push(successState);
    }
    return successors;
};

// Helper for TSP
// Returns array of next states (adding 1 city)
const getTSPSuccessors = (state, params) => {
    const n = state.cities.length;
    const currentTour = state.tour;

    if (currentTour.length >= n) return [];

    const successors = [];
    // Available cities
    const visited = new Set(currentTour);

    for (let i = 0; i < n; i++) {
        if (!visited.has(i)) {
            const newTour = [...currentTour, i];
            successors.push(new state.constructor(newTour, state.cities));
        }
    }
    return successors;
};

// Helper for Sudoku
// Returns array of next states (filling one cell)
const getSudokuSuccessors = (state, params) => {
    // Find first empty cell
    let targetR = -1, targetC = -1;
    const size = state.size;

    outer: for (let r = 0; r < size; r++) {
        for (let c = 0; c < size; c++) {
            if (state.grid[r][c] === 0) {
                targetR = r;
                targetC = c;
                break outer;
            }
        }
    }

    if (targetR === -1) return []; // Full

    const successors = [];
    let values = [];

    // Use domain if available
    if (state.domains && state.domains[targetR][targetC]) {
        values = state.domains[targetR][targetC];
    } else {
        // All 1..N
        values = Array.from({ length: size }, (_, i) => i + 1);
    }

    for (const val of values) {
        // Copy grid
        const newGrid = state.grid.map(row => [...row]);
        newGrid[targetR][targetC] = val;

        let newDomains = null;
        if (state.domains) {
            newDomains = state.domains.map(row => row.map(d => [...d]));
            newDomains[targetR][targetC] = [val];
        }

        // Create new State (Same size, passed fixed mask too?)
        // State constructor: (size, grid, fixed, domains)
        // We need to preserve 'fixed'.
        const successState = new state.constructor(size, newGrid, state.fixed, newDomains);
        successors.push(successState);
    }

    return successors;
};

const getSuccessors = (state, problem, params) => {
    // Prefer problem-specific getSuccessors method
    if (problem.getSuccessors) return problem.getSuccessors(state, params);
    // Legacy fallback
    if (problem.id === 'n-queens') return getNQueensSuccessors(state, params);
    if (problem.id === 'tsp') return getTSPSuccessors(state, params);
    if (problem.id === 'sudoku') return getSudokuSuccessors(state, params);
    return [];
};

// --- Algorithms ---

export const ConstructiveAlgorithms = {

    // Breadth-First Search (Uninformed / Blind)
    // Does NOT prune. Explores all partial states until full.
    bfs: function* (dummyState, params, problem) {
        // If dummyState is provided and valid match, use it as root. 
        // For N-Queens, dummyState is usually partial/full random, so we ignore.
        // For Sudoku, dummyState is the Puzzle.
        let root = problem.emptyState(params);
        if (dummyState && problem.cleanStateForConstructive) {
            root = problem.cleanStateForConstructive(dummyState);
        } else if (dummyState && problem.id === 'sudoku') {
            // Legacy Sudoku handling
            const cleanGrid = dummyState.grid.map((row, r) =>
                row.map((val, c) => dummyState.fixed[r][c] ? val : 0)
            );
            root = new dummyState.constructor(dummyState.size, cleanGrid, dummyState.fixed);
        }

        const queue = [root];
        let evaluations = 0;
        let steps = 0;
        const maxIter = params.maxIterations || 10000; // User defined limit

        while (queue.length > 0) {
            const current = queue.shift(); // FIFO
            steps++;

            yield { state: current, note: `BFS Queue: ${queue.length}`, evaluations };

            // Goal Test: Only check if Complete AND Valid?
            // "Blind" search typically checks goal at node generation or expansion.
            // If we are strictly "Blind", we don't look at constraints until we have a full board?
            // Or do we check if it is a solution?
            // isSolution checks cost==0.
            if (problem.isSolution(current)) {
                yield { state: current, note: `Solution Found!`, evaluations };
                return 'Solution Found!';
            }

            if (steps >= maxIter) {
                yield { state: current, note: `Stopped (Max Iterations ${maxIter})`, evaluations };
                return `Stopped (Max Iterations)`;
            }

            // Generate Successors (Blindly)
            // Do NOT prune based on conflicts.
            // Only prune if "Full" (handled by getSuccessors returning empty)
            const successors = getSuccessors(current, problem, params);
            evaluations += successors.length;
            queue.push(...successors);
        }

        yield { state: null, note: `No Solution Found (Exhausted)`, evaluations };
        return 'No Solution Found (Exhausted)';
    },

    // Depth-First Search (Blind)
    // Does NOT prune.
    dfs: function* (dummyState, params, problem) {
        let root = problem.emptyState(params);
        if (dummyState && problem.id === 'sudoku') {
            const cleanGrid = dummyState.grid.map((row, r) =>
                row.map((val, c) => dummyState.fixed[r][c] ? val : 0)
            );
            root = new dummyState.constructor(dummyState.size, cleanGrid, dummyState.fixed);
        }

        const stack = [root];
        let evaluations = 0;
        let steps = 0;
        const maxIter = params.maxIterations || 10000;

        while (stack.length > 0) {
            const current = stack.pop(); // LIFO
            steps++;

            yield { state: current, note: `DFS Stack: ${stack.length}`, evaluations };

            if (problem.isSolution(current)) {
                yield { state: current, note: `Solution Found!`, evaluations };
                return 'Solution Found!';
            }

            if (steps >= maxIter) {
                yield { state: current, note: `Stopped (Max Iterations ${maxIter})`, evaluations };
                return `Stopped (Max Iterations)`;
            }

            // Generate Successors (Blindly)
            const successors = getSuccessors(current, problem, params);
            evaluations += successors.length;

            // Push in reverse for 0->N order
            for (let i = successors.length - 1; i >= 0; i--) {
                stack.push(successors[i]);
            }
        }
        yield { state: null, note: `No Solution Found`, evaluations };
        return 'No Solution Found (Exhausted)';
    },

    // Backtracking Search (CSP)
    // DFS with Pruning (Constraint Check)
    backtracking: function* (dummyState, params, problem) {
        let root = problem.emptyState(params);
        if (dummyState && problem.id === 'sudoku') {
            const cleanGrid = dummyState.grid.map((row, r) =>
                row.map((val, c) => dummyState.fixed[r][c] ? val : 0)
            );
            root = new dummyState.constructor(dummyState.size, cleanGrid, dummyState.fixed);
        }

        const stack = [root];
        let evaluations = 0;
        let steps = 0;
        const maxIter = params.maxIterations || 10000; // Add limit for safety

        while (stack.length > 0) {
            const current = stack.pop();
            steps++;

            yield { state: current, note: `Backtrack Stack: ${stack.length}`, evaluations };

            if (problem.isSolution(current)) {
                yield { state: current, note: `Solution Found!`, evaluations };
                return 'Solution Found!';
            }

            if (steps >= maxIter) {
                yield { state: current, note: `Stopped (Max Iterations ${maxIter})`, evaluations };
                return `Stopped (Max Iterations)`;
            }

            // Pruning (Constraint Check)
            // This is what makes it "Backtracking" vs "DFS"
            let isValid = true;
            if (problem.isPartiallyValid) {
                // Generic constraint check — preferred
                isValid = problem.isPartiallyValid(current);
            } else if (problem.id === 'n-queens') {
                if (current.getAttackingQueens().size > 0) isValid = false;
            } else if (problem.id === 'sudoku') {
                if (current.conflicts > 0) isValid = false;
            }

            if (isValid) {
                const successors = getSuccessors(current, problem, params);
                evaluations += successors.length;
                for (let i = successors.length - 1; i >= 0; i--) {
                    stack.push(successors[i]);
                }
            }
        }
        yield { state: null, note: `No Solution Found`, evaluations };
        return 'No Solution Found (Exhausted)';
    },

    // Forward Checking (Generic CSP)
    // Look ahead to prune domains.
    forwardChecking: function* (dummyState, params, problem) {
        // 1. Initialize Domains if not present
        // We need a specific method to get initial domains if the state doesn't have them.
        // For Sudoku, clean start might imply domains = all possibilities.

        let root = problem.emptyState(params);
        if (dummyState && problem.id === 'sudoku') {
            // ... (Sanitize logic from before, but ALSO ensure domains are init)
            const cleanGrid = dummyState.grid.map((row, r) =>
                row.map((val, c) => dummyState.fixed[r][c] ? val : 0)
            );
            // We need to re-calculate domains for this partial state if not present
            // But usually emptyState does simple init.
            // Let's assume problem.initializeDomains logic exists or we do it here?
            // Better: state.domains should be present.

            // If we restart from a partial state, we need to run FC once to filter domains?
            root = new dummyState.constructor(dummyState.size, cleanGrid, dummyState.fixed);

            // Initial Domain Propagation (for fixed cells)
            // If problem supports it, we should "solve" the fixed cells constraints first.
            if (problem.initializeDomains) {
                root.domains = problem.initializeDomains(root);
            }
        } else {
            if (problem.initializeDomains) {
                root.domains = problem.initializeDomains(root);
            }
        }

        const stack = [root];
        let evaluations = 0;

        while (stack.length > 0) {
            const current = stack.pop();

            yield { state: current, note: `FC Stack: ${stack.length}`, evaluations };

            if (problem.isSolution(current)) {
                yield { state: current, note: `Solution Found!`, evaluations };
                return 'Solution Found!';
            }

            // CSP: Select Variable
            const variable = selectVariable(current, problem, params);

            if (variable !== null) {
                // Get ordered values: problem.getOrdering(state, variable)?
                // Or just use domain.
                // We need to know specific domain structure. 
                // For Queens: variable=row, domain=list of cols.
                // For Sudoku: variable={r,c}, domain=list of numbers.

                // Let's assume current.domains is accessible via variable index/key
                let domainValues = [];
                if (problem.getDomainValues) {
                    domainValues = problem.getDomainValues(current, variable);
                } else {
                    // Fallback for NQueens (variable is row index)
                    domainValues = current.domains[variable];
                }

                if (!domainValues) domainValues = [];

                // Try each value (LIFO)
                for (let i = domainValues.length - 1; i >= 0; i--) {
                    const value = domainValues[i];

                    // Prune / Forward Check
                    // We need a generic "propagate" function that returns NEW domains or null
                    const result = problem.propagate ? problem.propagate(current, variable, value) : null;

                    if (result && result.domains) {
                        const nextDomains = result.domains;
                        // Check for wipeout or explicit failure flag from propagate
                        if (result.success !== false) {
                            // Valid move
                            const nextState = problem.applyMove(current, variable, value, nextDomains);
                            stack.push(nextState);
                            evaluations++;
                        } else {
                            // Wipeout / Failure - VISUALIZE IT
                            // Create the state that would have happened (broken state)
                            const failState = problem.applyMove(current, variable, value, nextDomains);
                            yield { state: failState, note: `Pruned (Wipeout on ${JSON.stringify(variable)})`, evaluations: evaluations + 1 };
                        }
                    } else {
                        // null result means something went wrong or generic failure without domains
                        yield { state: current, note: `Pruned (Invalid Move)`, evaluations: evaluations + 1 };
                    }
                }
            } else {
                // No variable left but not solution? Dead end.
            }
        }

        yield { state: null, note: `No Solution Found (Exhausted)`, evaluations };
        return 'No Solution Found (Exhausted)';
    },

    // Arc Consistency (AC-3)
    arcConsistency: function* (dummyState, params, problem) {
        // 1. Initialize
        let root = problem.emptyState(params);
        if (dummyState && problem.id === 'sudoku') {
            const cleanGrid = dummyState.grid.map((row, r) =>
                row.map((val, c) => dummyState.fixed[r][c] ? val : 0)
            );
            root = new dummyState.constructor(dummyState.size, cleanGrid, dummyState.fixed);
        }

        if (problem.initializeDomains) {
            root.domains = problem.initializeDomains(root);
        }

        const stack = [root];
        let evaluations = 0;

        while (stack.length > 0) {
            const current = stack.pop();

            yield { state: current, note: `AC-3 Stack: ${stack.length}`, evaluations };

            if (problem.isSolution(current)) {
                yield { state: current, note: `Solution Found!`, evaluations };
                return 'Solution Found!';
            }

            const variable = problem.selectUnassignedVariable ? problem.selectUnassignedVariable(current) : null;

            if (variable !== null) {
                let domainValues = problem.getDomainValues ? problem.getDomainValues(current, variable) : current.domains[variable];
                if (!domainValues) domainValues = [];

                for (let i = domainValues.length - 1; i >= 0; i--) {
                    const value = domainValues[i];

                    // Assign AND Run AC-3
                    const result = problem.propagateAC3 ? problem.propagateAC3(current, variable, value) : null;

                    if (result && result.domains) {
                        const nextDomains = result.domains;
                        if (result.success !== false) {
                            const nextState = problem.applyMove(current, variable, value, result.domains);
                            stack.push(nextState);
                            evaluations++;
                        } else {
                            // VISUALIZE AC-3 FAILURE
                            const failState = problem.applyMove(current, variable, value, result.domains);
                            yield { state: failState, note: `AC-3 Inconsistency`, evaluations: evaluations + 1 };
                        }
                    } else {
                        yield { state: current, note: `AC-3 Pruned`, evaluations: evaluations + 1 };
                    }
                }
            }
        }

        yield { state: null, note: `No Solution Found (Exhausted)`, evaluations };
        return 'No Solution Found (Exhausted)';
    }
};

// AC-3 Helper (Generic Logic moved to Problem or kept here if standarized?)
// Since constraints are problem specific, 'runAC3' logic usually needs 'getNeighbors' and 'satisfies(ci, cj)'.
// Best to delegate to problem.propagateAC3.

const selectVariable = (state, problem, params) => {
    const heuristic = params.variableHeuristic || 'inOrder';

    // Get all unassigned variables
    // Problem needs to support 'getUnassignedVariables'.
    // If not, fallback to 'selectUnassignedVariable' (single).
    if (!problem.getUnassignedVariables) {
        return problem.selectUnassignedVariable ? problem.selectUnassignedVariable(state) : null;
    }

    const unassigned = problem.getUnassignedVariables(state);
    if (unassigned.length === 0) return null;

    if (heuristic === 'inOrder') {
        return unassigned[0]; // First
    } else if (heuristic === 'random') {
        return unassigned[Math.floor(Math.random() * unassigned.length)];
    } else if (heuristic === 'mrv') {
        // Most Constrained Variable (Minimum Remaining Values)
        // We need domain size for each variable.
        // Assuming problem.getDomainSize(state, var) or state.domains[var].length
        let best = unassigned[0];
        let minSize = getDomainSize(state, best, problem);

        for (let i = 1; i < unassigned.length; i++) {
            const v = unassigned[i];
            const size = getDomainSize(state, v, problem);
            if (size < minSize) {
                minSize = size;
                best = v;
            }
        }
        return best;
    } else if (heuristic === 'leastConstrained') {
        // Least Constrained (Max Remaining Values) - Educational/Bad heuristic
        let best = unassigned[0];
        let maxSize = getDomainSize(state, best, problem);

        for (let i = 1; i < unassigned.length; i++) {
            const v = unassigned[i];
            const size = getDomainSize(state, v, problem);
            if (size > maxSize) {
                maxSize = size;
                best = v;
            }
        }
        return best;
    }

    return unassigned[0];
};

const getDomainSize = (state, variable, problem) => {
    // Prefer problem-specific getDomainSize (handles Sudoku's {r,c} variables)
    if (problem.getDomainSize) {
        return problem.getDomainSize(state, variable);
    }
    // Fallback for integer variables (N-Queens)
    if (state.domains && state.domains[variable]) {
        return state.domains[variable].length;
    }
    if (problem.getDomainValues) {
        return problem.getDomainValues(state, variable).length;
    }
    return 9999;
};
