export class NQueensState {
    constructor(size, queens = null) {
        this.size = size;
        // queens[row] = col
        if (queens) {
            this.queens = [...queens];
        } else {
            this.queens = NQueensState.randomState(size).queens;
        }
        this.cachedCost = null;
    }

    static randomState(size) {
        const queens = [];
        for (let i = 0; i < size; i++) {
            queens.push(Math.floor(Math.random() * size));
        }
        return new NQueensState(size, queens);
    }

    // Calculate number of pairs of queens that are attacking each other
    // H = 0 is a solution
    get cost() {
        if (this.cachedCost !== null) return this.cachedCost;

        let attacks = 0;
        for (let i = 0; i < this.size; i++) {
            for (let j = i + 1; j < this.size; j++) {
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
        this.cachedCost = attacks;
        return attacks;
    }

    // Returns a Set of row indices of queens that are under attack
    getAttackingQueens() {
        const attackedRows = new Set();
        for (let i = 0; i < this.size; i++) {
            for (let j = i + 1; j < this.size; j++) {
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
        return new NQueensState(this.size, this.queens);
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
    }
};
