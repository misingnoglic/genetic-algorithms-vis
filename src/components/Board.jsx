import React from 'react';
import { Crown } from 'lucide-react';

const Board = ({ state }) => {
    if (!state) return <div className="text-gray-400">No state to display</div>;

    const { size, queens } = state;
    const tileSize = Math.min(60, 600 / size); // Responsive tile size

    // Calculate attacking queens
    // We can memorize this if needed, but for render it's okay
    const attackingQueens = state.getAttackingQueens();

    const renderTile = (row, col) => {
        const isBlack = (row + col) % 2 === 1;
        const hasQueen = queens[row] === col;
        const isAttacking = hasQueen && attackingQueens.has(row);

        return (
            <div
                key={`${row}-${col}`}
                style={{ width: tileSize, height: tileSize }}
                className={`flex items-center justify-center ${isBlack ? 'bg-slate-700' : 'bg-slate-300'
                    }`}
            >
                {hasQueen && (
                    <Crown
                        size={tileSize * 0.7}
                        className={isAttacking ? "text-red-500" : (isBlack ? "text-white" : "text-black")}
                        fill={isAttacking ? "currentColor" : (isBlack ? "white" : "black")}
                    />
                )}
            </div>
        );
    };

    const grid = [];
    for (let row = 0; row < size; row++) {
        const rowTiles = [];
        for (let col = 0; col < size; col++) {
            rowTiles.push(renderTile(row, col));
        }
        grid.push(
            <div key={row} className="flex">
                {rowTiles}
            </div>
        );
    }

    return (
        <div className="border-4 border-slate-800 shadow-2xl">
            {grid}
        </div>
    );
};

export default Board;
