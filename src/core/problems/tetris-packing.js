
// Tetris Bin Packing Problem
// Goal: Pack a set of pieces into a 10-wide grid to minimize total height.

// ============================================================
// Tetromino Definitions
// ============================================================
import { TETRIS_SHAPES as SHAPES, TETRIS_COLORS as COLORS } from '../constants.js';

const SHAPE_KEYS = Object.keys(SHAPES);

// ============================================================
// Helpers
// ============================================================

// Rotate shape 90 degrees clockwise
function rotateShape(shape) {
    return shape.map(([y, x]) => [x, -y]);
}

// Get bounds of a shape
function getBounds(shape) {
    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    shape.forEach(([y, x]) => {
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
    });
    return { minX, maxX, minY, maxY, width: maxX - minX + 1, height: maxY - minY + 1 };
}

// ============================================================
// TetrisPackingState
// ============================================================
export class TetrisPackingState {
    constructor(gridWidth, pieces, placedCount = 0, grid = null) {
        this.gridWidth = gridWidth;
        // Piece: { type, rotation: 0-3, x: 0-Width, y: calculated }
        // We only store the sequence order and rotation/x preferences?
        // For search (GA/HC), we usually permute the ORDER and PARAMETERS (rot, x)
        // Then we consistently "Drop" them.
        this.pieces = pieces; // Array of { type, rotation, x }
        this.placedCount = placedCount;

        // Cache grid state for visualization and height calc
        this.grid = grid || this._buildGrid();
        this.cachedCost = null;
    }

    get isPartial() {
        return this.placedCount < this.pieces.length;
    }

    _buildGrid() {
        // "Drop" simulation to build the grid from the piece sequence
        // We simulate placing pieces 0 to placedCount-1
        // Grid is a Map or sparse array? 
        // Height can grow indefinitely, so let's use an object { 'y,x': type } or 2D array if we cap height?
        // Let's use a 2D array that grows dynamically or just strict coordinate storage.
        // For efficiency, let's store a 2D array [y][x].

        const grid = []; // y -> row array

        // Helper to check collision
        const checkCollision = (shape, px, py) => {
            for (const [dy, dx] of shape) {
                const x = px + dx;
                const y = py + dy;
                if (x < 0 || x >= this.gridWidth) return true; // Wall
                if (y < 0) return true; // Floor
                if (grid[y] && grid[y][x]) return true; // Existing block
            }
            return false;
        };

        const placeBlock = (shape, type, px, py) => {
            for (const [dy, dx] of shape) {
                const x = px + dx;
                const y = py + dy;
                // Expand grid height if needed
                while (grid.length <= y) {
                    grid.push(new Array(this.gridWidth).fill(null));
                }
                grid[y][x] = type;
            }
        };

        for (let i = 0; i < this.placedCount; i++) {
            const p = this.pieces[i];
            let shape = SHAPES[p.type];
            for (let r = 0; r < (p.rotation || 0); r++) shape = rotateShape(shape);

            // Normalize shape to have (0,0) as top-left or whatever?
            // Usually we center or use pivot. Let's keep pivot.

            // Determine drop position Y
            // Start high and move down until collision
            // We need to ensure X is valid first (keep inside walls)
            const bounds = getBounds(shape);
            let px = p.x;

            // Clamp X to be within board
            if (px + bounds.minX < 0) px -= bounds.minX;
            if (px + bounds.maxX >= this.gridWidth) px -= (bounds.maxX - this.gridWidth + 1);

            let py = grid.length + Math.abs(bounds.minY) + 2; // Start above highest block

            while (!checkCollision(shape, px, py - 1)) {
                py--;
            }

            placeBlock(shape, p.type, px, py);

            // Store final Y in the piece object for viz (optional, but good for mutation context)
            p.finalY = py;
            p.finalX = px;
        }

        return grid;
    }

    get cost() {
        if (this.cachedCost !== null) return this.cachedCost;

        // Height Cost
        // Cost Function for Optimization
        // Minimizing:
        // 1. Max Height (Primary)
        // 2. Gaps (Secondary - holes are bad)
        // 3. Aggregate Height (Sum of all column heights - encourages keeping pile low)
        // 4. Bumpiness (Sum of absolute differences between adjacent columns - encourages flat surface)

        let maxHeight = this.grid.length;
        let gaps = 0;
        let aggregateHeight = 0;
        let bumpiness = 0;

        // Calculate column heights first
        const colHeights = new Array(this.gridWidth).fill(0);
        for (let x = 0; x < this.gridWidth; x++) {
            for (let y = this.grid.length - 1; y >= 0; y--) {
                if (this.grid[y][x]) {
                    colHeights[x] = y + 1;
                    break;
                }
            }
        }

        aggregateHeight = colHeights.reduce((a, b) => a + b, 0);

        // Calculate Gaps (empty cells below column height)
        for (let x = 0; x < this.gridWidth; x++) {
            for (let y = 0; y < colHeights[x]; y++) {
                if (!this.grid[y][x]) gaps++;
            }
        }

        // Calculate Bumpiness
        for (let x = 0; x < this.gridWidth - 1; x++) {
            bumpiness += Math.abs(colHeights[x] - colHeights[x + 1]);
        }

        // Weighted Sum
        // Max Height is most critical. 
        // Gaps are very bad.
        // Aggregate Height helps differentiate same-max-height states.
        // Bumpiness helps flat surfaces (easier to pack).

        // PENALTY for unplaced pieces (to make empty state worse than filled state)
        // DFS/BFS Constructive needs this to see progress (Cost goes down as we place pieces?)
        // Wait, normally constructive adds cost.
        // But if we want "Best Found" to work, we need Best to be the one with MOST pieces (if not all).
        // OR we want the cost to be high for empty, and lower for full?
        // Yes, if we are minimizing.
        // Empty state = 20 unplaced. Cost += 20 * 10000.
        // Full state = 0 unplaced. Cost += 0.

        const unplacedCount = this.pieces.length - this.placedCount;
        const unplacedPenalty = unplacedCount * 10000;

        this.cachedCost = (maxHeight * 100) + (gaps * 20) + (aggregateHeight * 1) + (bumpiness * 1) + unplacedPenalty;
        return this.cachedCost;
    }

    getNeighbors() {
        const neighbors = [];

        // 1. Mutate X of a random piece
        // 2. Mutate Rotation of a random piece
        // 3. Swap order of two pieces

        const idx = Math.floor(Math.random() * this.placedCount);
        const p = this.pieces[idx];

        // Move X
        const moves = [-1, 1];
        for (const dx of moves) {
            const newPieces = JSON.parse(JSON.stringify(this.pieces));
            newPieces[idx].x += dx;
            // Clamp will happen in _buildGrid, so it's fine to set heuristic X here
            neighbors.push(new TetrisPackingState(this.gridWidth, newPieces, this.placedCount));
        }

        // Rotate
        const newPiecesRot = JSON.parse(JSON.stringify(this.pieces));
        newPiecesRot[idx].rotation = (newPiecesRot[idx].rotation + 1) % 4;
        neighbors.push(new TetrisPackingState(this.gridWidth, newPiecesRot, this.placedCount));

        return neighbors;
    }

    getRandomNeighbor() {
        const newPieces = JSON.parse(JSON.stringify(this.pieces));
        const action = Math.random();
        const idx = Math.floor(Math.random() * this.placedCount);

        if (action < 0.4) {
            // Change X
            newPieces[idx].x = Math.floor(Math.random() * this.gridWidth);
        } else if (action < 0.7) {
            // Change Rotation
            newPieces[idx].rotation = Math.floor(Math.random() * 4);
        } else {
            // Swap Order
            const idx2 = Math.floor(Math.random() * this.placedCount);
            [newPieces[idx], newPieces[idx2]] = [newPieces[idx2], newPieces[idx]];
        }

        return new TetrisPackingState(this.gridWidth, newPieces, this.placedCount);
    }

    clone() {
        return new TetrisPackingState(this.gridWidth, JSON.parse(JSON.stringify(this.pieces)), this.placedCount);
    }
}


// ============================================================
// TetrisPackingProblem
// ============================================================
export const TetrisPackingProblem = {
    id: 'tetris',
    name: 'Tetris Packing',
    description: 'Pack a set of Tetris pieces into a 10-wide grid to minimize height.',

    defaultParams: {
        numPieces: 20,
        gridWidth: 10
    },

    supportsCSP: false, // It's an optimization problem

    randomState(params) {
        const numPieces = params.numPieces || 20;
        const width = params.gridWidth || 10;
        const pieces = [];

        for (let i = 0; i < numPieces; i++) {
            const type = SHAPE_KEYS[Math.floor(Math.random() * SHAPE_KEYS.length)];
            pieces.push({
                type,
                rotation: Math.floor(Math.random() * 4),
                x: Math.floor(Math.random() * width)
            });
        }

        return new TetrisPackingState(width, pieces, numPieces);
    },

    emptyState(params) {
        // For constructive algorithms? 
        // We start with 0 placed pieces, but the list of pieces to place is fixed?
        // Or do we generate them on the fly?
        // Let's assume the "Input" is a fixed list of pieces we must pack.
        // So empty state has placedCount = 0.

        const s = this.randomState(params); // Generate the sequence
        return new TetrisPackingState(s.gridWidth, s.pieces, 0); // But placed is 0
    },

    isSolution(state) {
        // Optimization problem: no hard goal state usually.
        // But for constructive, "Solution" means all pieces placed.
        if (!state || !state.pieces) {
            console.error('TetrisPackingProblem.isSolution called with invalid state:', state);
            return false;
        }
        return state.placedCount === state.pieces.length;
    },

    // GA Operations
    crossover(parents, params) {
        // Order Crossover (similar to TSP) for the sequence of pieces
        // But also need to preserve the parameters (x, rot) attached to the pieces?
        // Actually, let's treat the gene as { type, rot, x }.
        // Standard single point crossover might work if list is fixed length
        const p1 = parents[0];
        const p2 = parents[1];
        const cut = Math.floor(Math.random() * p1.pieces.length);

        const newPieces = [
            ...p1.pieces.slice(0, cut).map(p => ({ ...p })),
            ...p2.pieces.slice(cut).map(p => ({ ...p }))
        ];

        return new TetrisPackingState(p1.gridWidth, newPieces, p1.placedCount);
    },

    mutate(state, rate) {
        state.pieces.forEach(p => {
            if (Math.random() < rate) {
                if (Math.random() < 0.5) {
                    p.x = Math.floor(Math.random() * state.gridWidth);
                } else {
                    p.rotation = Math.floor(Math.random() * 4);
                }
            }
        });
        // Swap mutation
        if (Math.random() < rate) {
            const i = Math.floor(Math.random() * state.pieces.length);
            const j = Math.floor(Math.random() * state.pieces.length);
            [state.pieces[i], state.pieces[j]] = [state.pieces[j], state.pieces[i]];
        }
        state.cachedCost = null;
        state.grid = state._buildGrid(); // Rebuild
    },

    // Constructive Successors
    getSuccessors(state, params) {
        // Place next piece in the list
        if (state.placedCount >= state.pieces.length) return [];

        const nextIdx = state.placedCount;
        const nextPieceTemplate = state.pieces[nextIdx]; // The type matches the pre-generated sequence

        // Try all rotations and all X positions?
        // That's 4 * 10 = 40 successors per step. Reasonable.

        const successors = [];
        const rotations = [0, 1, 2, 3];
        const width = state.gridWidth;

        for (const rot of rotations) {
            for (let x = 0; x < width; x++) {
                // Create new state with this piece finalized
                const newPieces = state.pieces.map(p => ({ ...p })); // Deep copy?
                // Actually we just need to update the parameter for THIS piece
                newPieces[nextIdx].rotation = rot;
                newPieces[nextIdx].x = x;

                successors.push(new TetrisPackingState(width, newPieces, nextIdx + 1));
            }
        }
        return successors;
    },

    // For visualization
    SHAPES,
    COLORS
};
