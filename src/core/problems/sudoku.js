
export class SudokuState {
    constructor(size, grid, fixed = null, domains = null) {
        this.size = size;
        this.grid = grid; // 2D array [row][col] -> number (1..N) or 0 (empty)

        // Fixed mask: true if the cell is a clue (cannot be changed)
        if (fixed) {
            this.fixed = fixed;
        } else {
            // If not provided, assume all non-zero are fixed? 
            // Or create based on grid. 
            // For constructive search, we start empty, so fixed is all false.
            // For local search, we start full, so fixed must be passed.
            // Default to all false if null.
            this.fixed = Array(size).fill(null).map(() => Array(size).fill(false));
        }

        this.domains = domains;
        this.cachedCost = null;

        // Calculate box dimensions
        this.boxWidth = Math.floor(Math.sqrt(size));
        this.boxHeight = Math.ceil(size / this.boxWidth);
        // Adjust for standard sizes
        if (size === 6) { this.boxWidth = 3; this.boxHeight = 2; }
        if (size === 9) { this.boxWidth = 3; this.boxHeight = 3; }
        if (size === 12) { this.boxWidth = 4; this.boxHeight = 3; }
        if (size === 15) { this.boxWidth = 5; this.boxHeight = 3; }
        // For size 3, sqrt(3) ~ 1.7 -> width 1, height 3? Or just no boxes.
        // Let's assume N=3 is just Latin Square (no box constraint) or 3x1?
        // Let's assume no box constraint for N < 4 to be safe/simple, or just Row/Col.
    }

    clone() {
        const newGrid = this.grid.map(row => [...row]);
        // Fixed doesn't change usually, but deep copy to be safe
        // Actually fixed reference is fine if we never mutate it? 
        // Let's keep reference to save memory, or copy if needed.
        // But for clarity/safety:
        // this.fixed is usually static for a problem instance.

        // Domains deep copy
        let newDomains = null;
        if (this.domains) {
            newDomains = this.domains.map(row => row.map(d => [...d]));
        }

        return new SudokuState(this.size, newGrid, this.fixed, newDomains);
    }

    get isPartial() {
        // If any cell is 0
        for (let r = 0; r < this.size; r++) {
            for (let c = 0; c < this.size; c++) {
                if (this.grid[r][c] === 0) return true;
            }
        }
        return false;
    }

    // Number of conflicts (duplicates in row, col, box)
    get conflicts() {
        if (this.cachedCost !== null) return this.cachedCost;

        let conflicts = 0;
        const N = this.size;

        // Rows
        for (let r = 0; r < N; r++) {
            const seen = new Set();
            for (let c = 0; c < N; c++) {
                const val = this.grid[r][c];
                if (val !== 0) {
                    if (seen.has(val)) conflicts++;
                    seen.add(val);
                }
            }
        }

        // Cols
        for (let c = 0; c < N; c++) {
            const seen = new Set();
            for (let r = 0; r < N; r++) {
                const val = this.grid[r][c];
                if (val !== 0) {
                    if (seen.has(val)) conflicts++;
                    seen.add(val);
                }
            }
        }

        // Boxes
        if (N >= 4) {
            const bw = this.boxWidth;
            const bh = this.boxHeight;

            for (let br = 0; br < N; br += bh) {
                for (let bc = 0; bc < N; bc += bw) {
                    const seen = new Set();
                    for (let r = 0; r < bh; r++) {
                        for (let c = 0; c < bw; c++) {
                            const val = this.grid[br + r][bc + c];
                            if (val !== 0) {
                                if (seen.has(val)) conflicts++;
                                seen.add(val);
                            }
                        }
                    }
                }
            }
        }

        this.cachedCost = conflicts;
        return conflicts;
    }

    // Cost = Conflicts + Empty Cells
    // We want 0 to be the target.
    get cost() {
        let empty = 0;
        for (let r = 0; r < this.size; r++) {
            for (let c = 0; c < this.size; c++) {
                if (this.grid[r][c] === 0) empty++;
            }
        }
        return this.conflicts + empty;
    }

    // Get list of conflicting cells (for visualization?)
    // This could be useful for the UI.
    getConflictingCells() {
        const conflicts = new Set(); // Strings "r,c"
        const N = this.size;

        const addConflict = (r, c) => conflicts.add(`${r},${c}`);

        // Rows
        for (let r = 0; r < N; r++) {
            const locations = {}; // val -> array of cols
            for (let c = 0; c < N; c++) {
                const val = this.grid[r][c];
                if (val !== 0) {
                    if (!locations[val]) locations[val] = [];
                    locations[val].push(c);
                }
            }
            for (const val in locations) {
                if (locations[val].length > 1) {
                    locations[val].forEach(c => addConflict(r, c));
                }
            }
        }

        // Cols
        for (let c = 0; c < N; c++) {
            const locations = {}; // val -> array of rows
            for (let r = 0; r < N; r++) {
                const val = this.grid[r][c];
                if (val !== 0) {
                    if (!locations[val]) locations[val] = [];
                    locations[val].push(r);
                }
            }
            for (const val in locations) {
                if (locations[val].length > 1) {
                    locations[val].forEach(r => addConflict(r, c));
                }
            }
        }

        // Boxes
        if (N >= 4) {
            const bw = this.boxWidth;
            const bh = this.boxHeight;
            for (let br = 0; br < N; br += bh) {
                for (let bc = 0; bc < N; bc += bw) {
                    const locations = {}; // val -> array of {r,c}
                    for (let r = 0; r < bh; r++) {
                        for (let c = 0; c < bw; c++) {
                            const row = br + r;
                            const col = bc + c;
                            const val = this.grid[row][col];
                            if (val !== 0) {
                                if (!locations[val]) locations[val] = [];
                                locations[val].push({ r: row, c: col });
                            }
                        }
                    }
                    for (const val in locations) {
                        if (locations[val].length > 1) {
                            locations[val].forEach(pos => addConflict(pos.r, pos.c));
                        }
                    }
                }
            }
        }

        return conflicts;
    }

    getNeighbors() {
        const neighbors = [];
        const N = this.size;

        // Strategy: Just change one mutable cell to a different value.
        // Find all mutable cells
        const mutables = [];
        for (let r = 0; r < N; r++) {
            for (let c = 0; c < N; c++) {
                if (!this.fixed[r][c]) mutables.push({ r, c });
            }
        }

        for (const { r, c } of mutables) {
            const currentVal = this.grid[r][c];
            // Try all other values
            for (let v = 1; v <= N; v++) {
                if (v !== currentVal) {
                    const newGrid = this.grid.map(row => [...row]);
                    newGrid[r][c] = v;
                    neighbors.push(new SudokuState(N, newGrid, this.fixed));
                }
            }
        }

        return neighbors;
    }

    getRandomNeighbor() {
        const N = this.size;
        // 1. Pick random mutable cell
        // 2. Change to random valid value != current

        const mutables = [];
        for (let r = 0; r < N; r++) {
            for (let c = 0; c < N; c++) {
                if (!this.fixed[r][c]) mutables.push({ r, c });
            }
        }

        if (mutables.length === 0) return this; // No moves

        const { r, c } = mutables[Math.floor(Math.random() * mutables.length)];
        const currentVal = this.grid[r][c];

        let attempts = 0;
        let newVal = currentVal;

        // Try to find a different value
        while (newVal === currentVal && attempts < 20) {
            newVal = Math.floor(Math.random() * N) + 1;
            attempts++;
        }

        // If failed to find diff value (shouldn't happen unless N=1), return this
        if (newVal === currentVal) return this;

        const newGrid = this.grid.map(row => [...row]);
        newGrid[r][c] = newVal;
        return new SudokuState(N, newGrid, this.fixed);
    }

    toString() {
        return this.grid.map(row => row.join('')).join('|');
    }
}

export const SudokuProblem = {
    id: 'sudoku',
    name: 'Sudoku',
    description: 'Fill a grid so that every row, column, and subgrid contains all digits from 1 to N.',

    defaultParams: {
        size: 9 // Default standard Sudoku
    },

    // Create an empty state (for Constructive Search)
    emptyState: (params) => {
        const size = params.size;
        // Constructive search starts with clues! 
        // So validation/solving implies we start with the Puzzle, not a blank grid.
        // Wait, "emptyState" for N-Queens is empty board.
        // For Sudoku, "emptyState" is the Initial Puzzle configuration.

        // We need to generate a puzzle first. 
        // Problem: This is called by the algorithm wrapper.
        // If we want a specific puzzle instance, we should probably generate it once 
        // and pass it in params? Or have the problem Generate one if not provided?

        // Let's generate a random puzzle here if one isn't passed in params.grid?
        // Ideally App.jsx handles "generateNewProblem" and passes the grid in params or 
        // sets it as `initialState`.

        // But `Algorithms` calls `problem.emptyState(params)`. 
        // If params contains the puzzle grid, use it.

        if (params.initialGrid && params.fixedMask) {
            // If provided with a grid (likely full from Local Search init), 
            // we must clear the mutable cells to get the "Empty" (Puzzle) state for constructive search.
            const grid = params.initialGrid.map(r => [...r]);
            const fixed = params.fixedMask;
            const size = params.size; // Ensure size is used

            for (let r = 0; r < size; r++) {
                for (let c = 0; c < size; c++) {
                    if (!fixed[r][c]) {
                        grid[r][c] = 0;
                    }
                }
            }
            return new SudokuState(size, grid, fixed);
        }

        // Fallback: Generate a fresh one right now (might be slow if large?)
        // Better to have App.jsx generate it.
        // For now, return a blank grid? No, Sudoku needs clues.
        // Let's generate a simple one.
        return SudokuGenerator.generate(size, 0.5); // 50% removed?
    },

    // Create a random full state (for Local Search)
    randomState: (params) => {
        // Starts with the puzzle (fixed numbers) and fills the rest randomly.
        // Ideally respects domains (valid numbers)? 
        // Local Search usually starts with "all cells filled" but potentially conflicting.

        // We need the "Puzzle" (Clues) to be consistent. 
        // If params has it, use it.
        let state;
        if (params.initialGrid && params.fixedMask) {
            state = new SudokuState(params.size, params.initialGrid.map(r => [...r]), params.fixedMask);
        } else {
            // Determine k from params if generating fresh
            state = SudokuGenerator.generate(params.size, params.removeCount);
        }

        // Now fill mutable cells randomly
        for (let r = 0; r < state.size; r++) {
            for (let c = 0; c < state.size; c++) {
                if (!state.fixed[r][c]) {
                    state.grid[r][c] = Math.floor(Math.random() * state.size) + 1;
                }
            }
        }
        return state;
    },

    isSolution: (state) => {
        return state.cost === 0;
    },

    formatCost: (cost) => cost,

    estimatedOptimalCost: (params) => {
        // A valid Sudoku puzzle always has a solution with 0 conflicts/empty cells.
        return 0;
    },

    // GA: Crossover
    // Simple single-point crossover by rows
    crossover: (parents, params) => {
        const size = params.size;
        // Assume 2 parents for now
        const p1 = parents[0];
        const p2 = parents[1];

        // Random split point (row index)
        const point = Math.floor(Math.random() * size);

        // Child takes rows 0..point-1 from p1, and point..size-1 from p2
        const childGrid = [];
        for (let r = 0; r < size; r++) {
            if (r < point) {
                childGrid.push([...p1.grid[r]]);
            } else {
                childGrid.push([...p2.grid[r]]);
            }
        }

        // Fixed mask should be same for all (assuming same puzzle)
        return new SudokuState(size, childGrid, p1.fixed);
    },

    // GA: Mutate
    mutate: (state, rate, params) => {
        // Rate is prob of mutating the state? Or per cell?
        // Usually per state in this framework (rate passed from algoParams)
        // Let's say if we mutate, we change 1 random mutable cell.

        if (Math.random() < rate) {
            // Pick random mutable cell
            const mutables = [];
            for (let r = 0; r < state.size; r++) {
                for (let c = 0; c < state.size; c++) {
                    if (!state.fixed[r][c]) mutables.push({ r, c });
                }
            }

            if (mutables.length > 0) {
                const { r, c } = mutables[Math.floor(Math.random() * mutables.length)];
                // Change to random 1..N
                state.grid[r][c] = Math.floor(Math.random() * state.size) + 1;
                state.cachedCost = null;
            }
        }
    },

    getSearchSpace: (params, state) => {
        const n = params.size;
        let k = 'k';
        let approx = '?';

        if (state && state.grid) {
            const gridSize = state.grid.length;

            // Calculate k (degrees of freedom) based on Fixed Mask if available
            // This represents the PROBLEM complexity, not distinct from current state emptiness.
            let k = 0;
            if (state.fixed) {
                for (let r = 0; r < gridSize; r++) {
                    for (let c = 0; c < gridSize; c++) {
                        if (!state.fixed[r][c]) k++;
                    }
                }
            } else {
                // Fallback to params or empty count if no fixed mask (shouldn't happen for valid puzzle)
                k = params.removeCount || 0;
            }

            // Calculate actual number: N^k
            // Check if N is consistent, if not use gridSize
            const base = gridSize;

            const log10Val = k * Math.log10(base);
            let approx = '?';

            if (log10Val >= 5) { // Use scientific for anything > 100000 roughly
                const exponent = Math.floor(log10Val);
                const mantissa = Math.pow(10, log10Val - exponent);
                approx = `${mantissa.toFixed(2)}e+${exponent}`;
            } else {
                // For small numbers, just show full number or standard notation
                approx = Math.pow(base, k).toLocaleString();
            }

            return {
                formula: `${base}^${k}`,
                approx: approx
            };
        }

        // Fallback if no state
        return {
            formula: `${n}^k`,
            approx: `~${n}^k`
        };
    },

    // --- CSP Interface ---

    initializeDomains: (state) => {
        const size = state.size;
        // Init domains: 1..N
        const domains = Array.from({ length: size }, () =>
            Array.from({ length: size }, () =>
                Array.from({ length: size }, (_, i) => i + 1)
            )
        );

        // Pre-propagate fixed/filled cells
        for (let r = 0; r < size; r++) {
            for (let c = 0; c < size; c++) {
                if (state.grid[r][c] !== 0) {
                    const val = state.grid[r][c];
                    // Restrict domain to [val]
                    domains[r][c] = [val];

                    // Propagate to neighbors immediately to have clean start state
                    SudokuProblem._prunePeers(domains, state, r, c, val);
                }
            }
        }
        return domains;
    },

    getUnassignedVariables: (state) => {
        const unassigned = [];
        for (let r = 0; r < state.size; r++) {
            for (let c = 0; c < state.size; c++) {
                if (state.grid[r][c] === 0) {
                    unassigned.push({ r, c });
                }
            }
        }
        return unassigned;
    },

    getDomainSize: (state, variable) => {
        const { r, c } = variable;
        if (state.domains && state.domains[r][c]) {
            return state.domains[r][c].length;
        }
        return 999;
    },

    selectUnassignedVariable: (state) => {
        // Default to finding first empty cell (In-Order)
        // This is used if heuristic is not specified or fallback
        for (let r = 0; r < state.size; r++) {
            for (let c = 0; c < state.size; c++) {
                if (state.grid[r][c] === 0) return { r, c };
            }
        }
        return null;
    },

    getDomainValues: (state, variable) => {
        const { r, c } = variable;
        return state.domains[r][c];
    },

    applyMove: (state, variable, value, newDomains) => {
        const { r, c } = variable;
        const newGrid = state.grid.map(row => [...row]);
        newGrid[r][c] = value;
        return new SudokuState(state.size, newGrid, state.fixed, newDomains);
    },

    propagate: (state, variable, value) => {
        const { r, c } = variable;

        // Deep copy domains
        const nextDomains = state.domains.map(row => row.map(d => [...d]));
        nextDomains[r][c] = [value];

        // Prune peers (One Step)
        const possible = SudokuProblem._prunePeers(nextDomains, state, r, c, value);

        return { domains: nextDomains, success: possible };
    },

    propagateAC3: (state, variable, value) => {
        const { r, c } = variable;
        const nextDomains = state.domains.map(row => row.map(d => [...d]));
        nextDomains[r][c] = [value];

        // Queue for cascading inferences
        const queue = [{ r, c, val: value }];
        let possible = true;

        while (queue.length > 0) {
            const current = queue.shift();

            // Prune peers of current
            const peers = SudokuProblem._getPeers(state, current.r, current.c);
            for (const peer of peers) {
                const { pr, pc } = peer;
                const d = nextDomains[pr][pc];
                const originalLen = d.length;

                // Filter
                if (d.includes(current.val)) {
                    const newD = d.filter(v => v !== current.val);
                    if (newD.length === 0) {
                        possible = false;
                        nextDomains[pr][pc] = []; // Explicit empty for visualization
                        return { domains: nextDomains, success: false };
                    }
                    nextDomains[pr][pc] = newD;

                    // Cascasde: If reduced to singleton, add to queue
                    if (newD.length === 1 && originalLen > 1) {
                        queue.push({ r: pr, c: pc, val: newD[0] });
                    }
                }
            }
        }

        return { domains: nextDomains, success: true };
    },

    _getPeers: (state, r, c) => {
        const peers = [];
        const size = state.size;

        // Row
        for (let i = 0; i < size; i++) {
            if (i !== c) peers.push({ pr: r, pc: i });
        }
        // Col
        for (let i = 0; i < size; i++) {
            if (i !== r) peers.push({ pr: i, pc: c });
        }
        // Box
        if (size >= 4) {
            const bw = state.boxWidth;
            const bh = state.boxHeight;
            const br = Math.floor(r / bh) * bh;
            const bc = Math.floor(c / bw) * bw;

            for (let i = 0; i < bh; i++) {
                for (let j = 0; j < bw; j++) {
                    const rr = br + i;
                    const cc = bc + j;
                    if (rr !== r || cc !== c) {
                        // Check duplicates (already added by row/col?)
                        const isRow = rr === r;
                        const isCol = cc === c;
                        if (!isRow && !isCol) peers.push({ pr: rr, pc: cc });
                    }
                }
            }
        }
        return peers;
    },

    _prunePeers: (domains, state, r, c, val) => {
        const peers = SudokuProblem._getPeers(state, r, c);
        for (const { pr, pc } of peers) {
            const d = domains[pr][pc];
            if (d.includes(val)) {
                const newD = d.filter(v => v !== val);
                if (newD.length === 0) {
                    domains[pr][pc] = [];
                    return false;
                }
                domains[pr][pc] = newD;
            }
        }
        return true;
    },

    supportsCSP: true,

    extractInstanceParams: (state) => {
        return {
            initialGrid: state.grid,
            fixedMask: state.fixed,
        };
    }
};
const SudokuGenerator = {
    generate: (size, removeCount) => {
        // Default removeCount if not provided
        if (removeCount === undefined) {
            // Default 60% as per user request
            removeCount = Math.floor(size * size * 0.60);
        }

        // 1. Generate full valid grid
        const grid = Array(size).fill(0).map(() => Array(size).fill(0));
        const domains = null; // not tracking domains for init

        // Backtracking to fill
        solve(grid, size);

        // 2. Remove numbers
        const fixed = Array(size).fill(0).map(() => Array(size).fill(false));
        const finalGrid = grid.map(row => [...row]);

        const totalCells = size * size;
        const actualRemove = Math.min(removeCount, totalCells); // Safety cap

        let removed = 0;
        // Simple random removal
        // To be more efficient for high remove counts, we could shuffle indices and pick first N
        const indices = [];
        for (let r = 0; r < size; r++) {
            for (let c = 0; c < size; c++) {
                indices.push({ r, c });
            }
        }

        // Shuffle indices
        for (let i = indices.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [indices[i], indices[j]] = [indices[j], indices[i]];
        }

        // Remove the first 'actualRemove' cells
        for (let i = 0; i < actualRemove; i++) {
            const { r, c } = indices[i];
            finalGrid[r][c] = 0;
            removed++;
        }

        // Set fixed mask for remaining numbers
        for (let r = 0; r < size; r++) {
            for (let c = 0; c < size; c++) {
                if (finalGrid[r][c] !== 0) fixed[r][c] = true;
            }
        }

        return new SudokuState(size, finalGrid, fixed);
    }
};

function solve(grid, size) {
    // Determine box constraints
    let bw = Math.floor(Math.sqrt(size));
    let bh = Math.ceil(size / bw);
    if (size === 6) { bw = 3; bh = 2; }
    if (size === 9) { bw = 3; bh = 3; }
    if (size === 15) { bw = 5; bh = 3; }

    for (let r = 0; r < size; r++) {
        for (let c = 0; c < size; c++) {
            if (grid[r][c] === 0) {
                // Try values
                // Shuffle 1..N
                const vals = Array.from({ length: size }, (_, i) => i + 1).sort(() => Math.random() - 0.5);

                for (const v of vals) {
                    if (isValid(grid, r, c, v, size, bw, bh)) {
                        grid[r][c] = v;
                        if (solve(grid, size)) return true;
                        grid[r][c] = 0;
                    }
                }
                return false;
            }
        }
    }
    return true;
}

function isValid(grid, r, c, val, size, bw, bh) {
    // Row/Col
    for (let i = 0; i < size; i++) {
        if (grid[r][i] === val) return false;
        if (grid[i][c] === val) return false;
    }

    // Box
    if (size >= 4) {
        const br = Math.floor(r / bh) * bh;
        const bc = Math.floor(c / bw) * bw;
        for (let i = 0; i < bh; i++) {
            for (let j = 0; j < bw; j++) {
                if (grid[br + i][bc + j] === val) return false;
            }
        }
    }
    return true;
}
