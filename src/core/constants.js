
// Shared constants

export const MAP_COLORING_PALETTE = [
    '#ef4444', // red-500
    '#3b82f6', // blue-500
    '#22c55e', // green-500
    '#eab308', // yellow-500
    '#a855f7', // purple-500
    '#ec4899', // pink-500
    '#06b6d4', // cyan-500
    '#f97316', // orange-500
];

export const TETRIS_SHAPES = {
    I: [[0, 0], [0, 1], [0, 2], [0, 3]],
    J: [[0, 0], [0, 1], [0, 2], [-1, 0]],
    L: [[0, 0], [0, 1], [0, 2], [-1, 2]],
    O: [[0, 0], [0, 1], [1, 0], [1, 1]],
    S: [[0, 0], [0, 1], [-1, 1], [-1, 2]],
    T: [[0, 0], [0, 1], [0, 2], [-1, 1]],
    Z: [[0, 0], [0, 1], [1, 1], [1, 2]],
};

export const TETRIS_COLORS = {
    I: '#06b6d4', // cyan
    J: '#3b82f6', // blue
    L: '#f97316', // orange
    O: '#eab308', // yellow
    S: '#22c55e', // green
    T: '#a855f7', // purple
    Z: '#ef4444', // red
};
