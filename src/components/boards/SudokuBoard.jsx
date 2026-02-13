
import React from 'react';

const SudokuBoard = ({ state, small }) => {
    if (!state) return <div className="text-gray-400">No state</div>;

    const { size, grid, fixed, boxWidth, boxHeight } = state;
    if (!grid) return null;

    if (small) {
        const conflicts = state.getConflictingCells ? state.getConflictingCells() : new Set();
        return (
            <svg viewBox={`0 0 ${size * 10} ${size * 10}`} className="w-full h-full block bg-slate-200">
                {/* Cells */}
                {grid.map((row, r) =>
                    row.map((val, c) => {
                        const isFixed = fixed && fixed[r][c];
                        const isConflict = conflicts.has(`${r},${c}`);

                        let fill = isFixed ? "#cbd5e1" : "#f1f5f9"; // Slate-300 fixed, Slate-100 mutable
                        if (isConflict) fill = "#fca5a5"; // Red-300
                        if (isFixed && isConflict) fill = "#b91c1c"; // Red-700

                        return (
                            <rect
                                key={`${r}-${c}`}
                                x={c * 10}
                                y={r * 10}
                                width="10"
                                height="10"
                                fill={fill}
                                stroke="#94a3b8" // Slate-400
                                strokeWidth="0.5"
                            />
                        );
                    })
                )}
            </svg>
        );
    }

    // Adjust tile size based on board size to fit screen
    const maxBoardPx = 600;
    const tileSize = Math.floor(maxBoardPx / size);

    // Font size scaling
    const fontSize = Math.max(10, tileSize * 0.5);

    const conflicts = state.getConflictingCells ? state.getConflictingCells() : new Set();

    const renderCell = (row, col) => {
        const val = grid[row][col];
        const isFixed = fixed && fixed[row][col];
        const isEmpty = val === 0;
        const isConflict = !isEmpty && conflicts.has(`${row},${col}`);

        // Borders for Subgrids
        // If col % boxWidth === 0, thick left border (unless col 0)
        // If row % boxHeight === 0, thick top border (unless row 0)

        let borderClasses = "border border-slate-700";
        if (col > 0 && col % boxWidth === 0) borderClasses += " border-l-4 border-l-slate-500";
        if (row > 0 && row % boxHeight === 0) borderClasses += " border-t-4 border-t-slate-500";

        let cellClasses = "";
        if (isFixed) {
            cellClasses = isConflict ? "bg-red-900 text-white font-bold" : "bg-slate-800 text-slate-200 font-bold";
        } else {
            cellClasses = isConflict ? "bg-red-300 text-red-900 font-bold" : "bg-slate-200 text-blue-900";
        }

        return (
            <div
                key={`${row}-${col}`}
                style={{ width: tileSize, height: tileSize, fontSize: fontSize }}
                className={`flex items-center justify-center relative 
                    ${cellClasses}
                    ${borderClasses}
                `}
            >
                {/* Value */}
                {!isEmpty ? val : ''}

                {/* Domain Hints (Candidates) */}
                {/* If empty and we have domains, show candidates */}
                {state.domains && isEmpty && (
                    <div className="absolute inset-0 grid grid-cols-3 grid-rows-3 gap-[1px] p-[2px]">
                        {/* Show specific values if domain is small enough? 
                             For 9x9, values 1..9 fit in 3x3 grid.
                             For 15x15, too many.
                         */}
                        {state.size <= 9 ? (
                            Array.from({ length: 9 }).map((_, i) => {
                                const num = i + 1;
                                const possible = state.domains[row][col].includes(num);
                                // Only show if possible AND number <= size
                                if (!possible || num > size) return <div key={i}></div>;

                                return (
                                    <div key={i} className="flex items-center justify-center text-[6px] leading-none text-slate-500">
                                        {num}
                                    </div>
                                )
                            })
                        ) : (
                            // For > 9, just show count?
                            <div className="flex items-center justify-center w-full h-full text-xs text-slate-500 font-normal">
                                {state.domains[row][col].length}
                            </div>
                        )}
                    </div>
                )}

                {/* Wipeout Indicator */}
                {state.domains && isEmpty && state.domains[row][col].length === 0 && (
                    <div className="absolute inset-0 bg-red-500/30 flex items-center justify-center z-10">
                        <span className="text-[10px] text-red-900 font-bold">X</span>
                    </div>
                )}
            </div>
        );
    };

    const rows = [];
    for (let r = 0; r < size; r++) {
        const cells = [];
        for (let c = 0; c < size; c++) {
            cells.push(renderCell(r, c));
        }
        rows.push(<div key={r} className="flex">{cells}</div>);
    }

    return (
        <div className="border-4 border-slate-900 shadow-2xl bg-slate-900">
            {rows}
        </div>
    );
};

export default SudokuBoard;
