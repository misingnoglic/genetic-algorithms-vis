export class NQueensState {
    constructor(size, queens = null, domains = null) {
        this.size = size;
        // queens[row] = col (number) or null (unassigned)
        // Fixed-size array of length N. null = no queen on that row.
        if (queens) {
            this.queens = [...queens];
        } else {
            this.queens = NQueensState.randomState(size).queens;
        }

        // Domains: Array of Arrays. domains[row] = array of valid cols.
        // Only relevant for CSP/Constructive.
        this.domains = domains;
        this.cachedCost = null;
    }

    // Helper: count of assigned (non-null) queens
    get placedCount() {
        let count = 0;
        for (let i = 0; i < this.size; i++) {
            if (this.queens[i] !== null && this.queens[i] !== undefined) count++;
        }
        return count;
    }

    static randomState(size) {
        const queens = [];
        for (let i = 0; i < size; i++) {
            queens.push(Math.floor(Math.random() * size));
        }
        return new NQueensState(size, queens);
    }

    // For Constructive Search: Empty State (all nulls)
    static emptyState(size) {
        return new NQueensState(size, Array(size).fill(null));
    }

    // Check if state is partial
    get isPartial() {
        return this.placedCount < this.size;
    }

    // Calculate number of pairs of queens that are attacking each other
    // H = 0 is a solution
    get cost() {
        if (this.cachedCost !== null) return this.cachedCost;

        let attacks = 0;
        const n = this.size;

        // Collect assigned rows
        const assigned = [];
        for (let i = 0; i < n; i++) {
            if (this.queens[i] !== null && this.queens[i] !== undefined) {
                assigned.push(i);
            }
        }

        // Calculate attacks among placed queens
        for (let a = 0; a < assigned.length; a++) {
            for (let b = a + 1; b < assigned.length; b++) {
                const i = assigned[a];
                const j = assigned[b];
                // Same column
                if (this.queens[i] === this.queens[j]) {
                    attacks++;
                    continue;
                }
                // Diagonal
                const deltaRow = Math.abs(i - j);
                const deltaCol = Math.abs(this.queens[i] - this.queens[j]);
                if (deltaRow === deltaCol) {
                    attacks++;
                }
            }
        }

        // Penalty for partial state
        if (this.isPartial) {
            attacks += (this.size - assigned.length) * 1000;
        }

        this.cachedCost = attacks;
        return attacks;
    }

    // Returns a Set of row indices of queens that are under attack
    getAttackingQueens() {
        const attackedRows = new Set();
        const n = this.size;

        // Collect assigned rows
        const assigned = [];
        for (let i = 0; i < n; i++) {
            if (this.queens[i] !== null && this.queens[i] !== undefined) {
                assigned.push(i);
            }
        }

        for (let a = 0; a < assigned.length; a++) {
            for (let b = a + 1; b < assigned.length; b++) {
                const i = assigned[a];
                const j = assigned[b];
                let isAttacking = false;
                if (this.queens[i] === this.queens[j]) {
                    isAttacking = true;
                } else {
                    const deltaRow = Math.abs(i - j);
                    const deltaCol = Math.abs(this.queens[i] - this.queens[j]);
                    if (deltaRow === deltaCol) {
                        isAttacking = true;
                    }
                }
                if (isAttacking) {
                    attackedRows.add(i);
                    attackedRows.add(j);
                }
            }
        }
        return attackedRows;
    }

    // Generate all neighbors by moving each queen to every other square in its column
    getNeighbors() {
        const neighbors = [];
        for (let row = 0; row < this.size; row++) {
            const originalCol = this.queens[row];
            for (let col = 0; col < this.size; col++) {
                if (col === originalCol) continue;

                const newQueens = [...this.queens];
                newQueens[row] = col;
                neighbors.push(new NQueensState(this.size, newQueens));
            }
        }
        return neighbors;
    }

    // Generate a single random neighbor (O(1) compared to getNeighbors O(N^2))
    getRandomNeighbor() {
        const row = Math.floor(Math.random() * this.size);
        const originalCol = this.queens[row];
        let col = Math.floor(Math.random() * this.size);

        // Ensure we actually change the column
        while (col === originalCol) {
            col = Math.floor(Math.random() * this.size);
        }

        const newQueens = [...this.queens];
        newQueens[row] = col;
        return new NQueensState(this.size, newQueens);
    }

    // Helper to deep copy
    clone() {
        // Deep copy domains if they exist
        let newDomains = null;
        if (this.domains) {
            // domains is array of Sets or Arrays
            // Assume Array of Arrays for JSON serializability or Sets for speed? 
            // Let's stick to Arrays for visualizer safety unless perf requires Set.
            newDomains = this.domains.map(d => [...d]);
        }
        return new NQueensState(this.size, this.queens, newDomains);
    }

    toString() {
        return this.queens.join(',');
    }
}

export const NQueensProblem = {
    id: 'n-queens',
    name: 'N-Queens',
    description: 'Place N queens on an NxN chessboard so that no two queens attack each other.',

    // Default parameters for this problem
    defaultParams: {
        size: 8
    },

    // Factory method given params (which might contain size)
    randomState: (params) => {
        return NQueensState.randomState(params.size);
    },

    emptyState: (params) => {
        return NQueensState.emptyState(params.size);
    },

    isSolution: (state) => !state.isPartial && state.cost === 0,

    // GA: Crossover parents to create a child
    crossover: (parents, params) => {
        const size = params.size;

        // Uniform crossover generalizable to N parents: each gene comes from a random parent
        if (parents.length > 2) {
            const childQueens = [];
            for (let i = 0; i < size; i++) {
                const randomParent = parents[Math.floor(Math.random() * parents.length)];
                childQueens.push(randomParent.queens[i]);
            }
            return new NQueensState(size, childQueens);
        } else {
            // Standard random point crossover for 2 parents
            const p1 = parents[0];
            const p2 = parents[1];
            const point = Math.floor(Math.random() * size);

            const childQueens = [
                ...p1.queens.slice(0, point),
                ...p2.queens.slice(point)
            ];
            return new NQueensState(size, childQueens);
        }
    },

    // GA: Mutate a state
    mutate: (state, rate, params) => {
        for (let i = 0; i < state.size; i++) {
            if (Math.random() < rate) {
                state.queens[i] = Math.floor(Math.random() * state.size);
                state.cachedCost = null; // Invalidate cache
            }
        }
    },

    // Known optimal cost
    estimatedOptimalCost: (params) => {
        const n = params.size;
        if (n === 2 || n === 3) return 1; // Impossible to have 0 attacks
        if (n === 1 || n >= 4) return 0;
        return null;
    },

    formatCost: (cost) => {
        return (cost !== undefined && cost !== null) ? cost.toFixed(0) : '-';
    },

    getSearchSpace: (params) => {
        const n = params.size;
        // Search space is N^N (one queen per column, N choices)
        const log10Val = n * Math.log10(n);
        const exponent = Math.floor(log10Val);
        const mantissa = Math.pow(10, log10Val - exponent);

        return {
            formula: 'N^N',
            approx: `${mantissa.toFixed(2)}e+${exponent}`
        };
    },

    supportsCSP: true,

    // --- CSP Interface ---

    initializeDomains: (state) => {
        // All cols valid for all rows initially
        const n = state.size;
        return Array.from({ length: n }, () => Array.from({ length: n }, (_, i) => i));
    },

    selectUnassignedVariable: (state) => {
        // Fallback: first unassigned row (in-order)
        for (let r = 0; r < state.size; r++) {
            if (state.queens[r] === null || state.queens[r] === undefined) return r;
        }
        return null;
    },

    getUnassignedVariables: (state) => {
        // Return all rows that have no queen assigned (null)
        const unassigned = [];
        for (let r = 0; r < state.size; r++) {
            if (state.queens[r] === null || state.queens[r] === undefined) {
                unassigned.push(r);
            }
        }
        return unassigned;
    },

    getDomainSize: (state, variable) => {
        if (state.domains && state.domains[variable]) {
            return state.domains[variable].length;
        }
        return state.size; // Fallback: all columns
    },

    getDomainValues: (state, variable) => {
        return state.domains[variable];
    },

    applyMove: (state, variable, value, newDomains) => {
        // variable is row index, value is column
        const newQueens = [...state.queens];
        newQueens[variable] = value;
        return new NQueensState(state.size, newQueens, newDomains);
    },

    // Forward Checking Propagation
    // Returns { domains: newDomains, success: boolean }
    propagate: (state, variable, value) => {
        const row = variable;
        const col = value;
        const n = state.size;

        // Deep copy domains
        const nextDomains = state.domains.map(d => [...d]);
        // Assign
        nextDomains[row] = [col];

        // Prune ALL unassigned rows (not just future ones)
        let possible = true;
        for (let r = 0; r < n; r++) {
            if (r === row) continue;
            // Skip already-assigned rows (domain is singleton)
            if (state.queens[r] !== null && state.queens[r] !== undefined) continue;
            const dist = Math.abs(r - row);
            nextDomains[r] = nextDomains[r].filter(c => {
                if (c === col) return false; // Same col
                if (Math.abs(c - col) === dist) return false; // Diagonal
                return true;
            });
            if (nextDomains[r].length === 0) possible = false;
        }
        return { domains: nextDomains, success: possible };
    },

    // AC-3 Propagation
    propagateAC3: (state, variable, value) => {
        const n = state.size;
        const row = variable;
        const col = value;

        const domains = state.domains.map(d => [...d]);
        domains[row] = [col];

        const possible = NQueensProblem._runAC3(domains, n, row);
        return { domains, success: possible };
    },

    // Internal Helper for AC-3
    _runAC3: (domains, n, justAssignedRow) => {
        const queue = [];

        // 1. Initial FC Prune
        const assignedCol = domains[justAssignedRow][0];
        for (let r = 0; r < n; r++) {
            if (r === justAssignedRow) continue;
            const dist = Math.abs(r - justAssignedRow);

            let changed = false;
            let originalLen = domains[r].length;
            domains[r] = domains[r].filter(c => {
                if (c === assignedCol) return false;
                if (Math.abs(c - assignedCol) === dist) return false;
                return true;
            });

            if (domains[r].length === 0) return false;
            if (domains[r].length < originalLen) {
                // Add arcs (k, r) for all k != r
                for (let k = 0; k < n; k++) {
                    if (k !== r && k !== justAssignedRow) queue.push([k, r]);
                }
            }
        }

        // 2. Process Queue
        while (queue.length > 0) {
            const [xi, xj] = queue.shift();
            if (NQueensProblem._revise(domains, xi, xj)) {
                if (domains[xi].length === 0) return false;
                for (let xk = 0; xk < n; xk++) {
                    if (xk !== xi && xk !== xj) queue.push([xk, xi]);
                }
            }
        }
        return true;
    },

    _revise: (domains, xi, xj) => {
        let revised = false;
        const domainI = domains[xi];
        const domainJ = domains[xj];
        const newDomainI = domainI.filter(x => {
            // Is there a y in domainJ compatible with x?
            return domainJ.some(y => {
                if (x === y) return false;
                if (Math.abs(xi - xj) === Math.abs(x - y)) return false;
                return true;
            });
        });
        if (newDomainI.length < domainI.length) {
            domains[xi] = newDomainI;
            revised = true;
        }
        return revised;
    }
};
