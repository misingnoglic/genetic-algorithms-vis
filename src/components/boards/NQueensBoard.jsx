import React from 'react';
import { Crown } from 'lucide-react';

const NQueensBoard = ({ state, small }) => {
    if (!state) return <div className="text-gray-400">No state to display</div>;

    const { size, queens } = state;

    // Small Mode (SVG for PopulationGrid)
    if (small) {
        if (!queens) return <div className="text-xs text-gray-500">Invalid</div>;
        return (
            <svg viewBox={`0 0 ${size * 10} ${size * 10}`} className="w-full h-full block">
                <rect width="100%" height="100%" fill="#1e293b" />
                {queens.map((col, row) => (
                    col !== null && col !== undefined ? (
                        <circle
                            key={row}
                            cx={col * 10 + 5}
                            cy={row * 10 + 5}
                            r={3}
                            fill={state.getAttackingQueens?.().has(row) ? "#ef4444" : "#e2e8f0"}
                        />
                    ) : null
                ))}
            </svg>
        );
    }

    if (!queens) return <div className="text-gray-400">Invalid N-Queens State</div>;

    const tileSize = Math.min(60, 600 / size); // Responsive tile size

    // Calculate attacking queens
    // We can memorize this if needed, but for render it's okay
    const attackingQueens = state.getAttackingQueens();

    const renderTile = (row, col) => {
        const isBlack = (row + col) % 2 === 1;

        // 1. Is there a queen here?
        // Note: queens array might be partial.
        // queens[row] is the col index.
        const hasQueen = queens[row] !== null && queens[row] !== undefined && queens[row] === col;

        const isAttacking = hasQueen && attackingQueens.has(row);

        // 2. Domain Visualization (CSP)
        // If state has domains, check if this (row, col) is valid
        let isInDomain = false;
        let showDomain = false;

        // Only show domains for unassigned rows
        if (state.domains && (queens[row] === undefined || queens[row] === null)) {
            showDomain = true;
            // domains[row] is array of valid cols
            if (state.domains[row] && state.domains[row].includes(col)) {
                isInDomain = true;
            }
        }

        // Check if this unassigned row has an empty domain (Cause of pruning?)
        const isEmptyDomainRow = state.domains &&
            (queens[row] === undefined || queens[row] === null) &&
            state.domains[row] &&
            state.domains[row].length === 0;

        return (
            <div
                key={`${row}-${col}`}
                style={{ width: tileSize, height: tileSize }}
                className={`flex items-center justify-center relative border-[0.5px] border-slate-600/20
                    ${isBlack ? 'bg-slate-700' : 'bg-slate-300'}
                    ${showDomain && isInDomain ? 'bg-green-500/20 shadow-[inset_0_0_10px_rgba(34,197,94,0.3)]' : ''} 
                    ${showDomain && !isInDomain ? 'bg-red-500/10' : ''}
                    ${isEmptyDomainRow ? 'bg-red-900/50' : ''}
                `}
            >
                {/* Domain Indicator */}
                {showDomain && isInDomain && (
                    <div className="absolute w-1.5 h-1.5 bg-green-400 rounded-full shadow-sm" />
                )}
                {/* Eliminated Indicator */}
                {showDomain && !isInDomain && (
                    <div className="absolute text-red-500/20 text-[10px] select-none font-mono">x</div>
                )}

                {isEmptyDomainRow && col === 0 && (
                    <div className="absolute left-full ml-2 text-xs text-red-400 font-bold whitespace-nowrap bg-slate-900/80 px-2 rounded z-20">
                        🚫 No Solutions
                    </div>
                )}

                {hasQueen && (
                    <Crown
                        size={tileSize * 0.7}
                        className={`z-10 ${isAttacking ? "text-red-500" : (isBlack ? "text-white" : "text-black")}`}
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

export default NQueensBoard;
