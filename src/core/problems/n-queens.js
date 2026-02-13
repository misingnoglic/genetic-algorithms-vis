export class NQueensState {
    constructor(size, queens = null, domains = null) {
        this.size = size;
        // queens[row] = col
        // If queens is passed, use it. If not, and we are NOT partial (standard local search init), random.
        // But for constructive search, we might want empty.
        // Let's assume if queens is passed, we use it. If null, we generate random full state (Local Search Default).
        // To create empty state: pass [].
        if (queens) {
            this.queens = [...queens];
        } else {
            this.queens = NQueensState.randomState(size).queens;
        }

        // Domains: Array of Arrays/Sets. domains[row] = set of valid cols.
        // Only relevant for CSP/Constructive.
        this.domains = domains;
        this.cachedCost = null;
    }

    static randomState(size) {
        const queens = [];
        for (let i = 0; i < size; i++) {
            queens.push(Math.floor(Math.random() * size));
        }
        return new NQueensState(size, queens);
    }

    // For Constructive Search: Empty State
    static emptyState(size) {
        // Initial domains: All cols valid for all rows (if tracking domains)
        return new NQueensState(size, []);
    }

    // Check if state is partial
    get isPartial() {
        return this.queens.length < this.size;
    }

    // Calculate number of pairs of queens that are attacking each other
    // H = 0 is a solution
    get cost() {
        if (this.cachedCost !== null) return this.cachedCost;

        let attacks = 0;

        // 1. Calculate actual attacks among placed queens
        const placedCount = this.queens.length;
        for (let i = 0; i < placedCount; i++) {
            for (let j = i + 1; j < placedCount; j++) {
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

        // 2. Penalty for partial state
        // If we want partial states to look "bad" compared to complete solutions
        // Add a penalty per unassigned row.
        // But for BFS goal test, we assume cost==0 AND !isPartial.
        // For visualization stats:
        if (this.isPartial) {
            attacks += (this.size - placedCount) * 1000;
        }

        this.cachedCost = attacks;
        return attacks;
    }

    // Returns a Set of row indices of queens that are under attack
    getAttackingQueens() {
        const attackedRows = new Set();
        const placedCount = this.queens.length;
        for (let i = 0; i < placedCount; i++) {
            for (let j = i + 1; j < placedCount; j++) {
                let isAttacking = false;
                // Same column
                if (this.queens[i] === this.queens[j]) {
                    isAttacking = true;
                } else {
                    // Diagonal
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

    // --- CSP Interface ---

    initializeDomains: (state) => {
        // All cols valid for all rows initially
        const n = state.size;
        return Array.from({ length: n }, () => Array.from({ length: n }, (_, i) => i));
    },

    selectUnassignedVariable: (state) => {
        // Next row to place
        if (state.queens.length < state.size) return state.queens.length;
        return null;
    },

    getDomainValues: (state, variable) => {
        return state.domains[variable];
    },

    applyMove: (state, variable, value, newDomains) => {
        // variable is row index
        const newQueens = [...state.queens, value];
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

        // Prune future rows
        let possible = true;
        for (let r = row + 1; r < n; r++) {
            const dist = r - row;
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
