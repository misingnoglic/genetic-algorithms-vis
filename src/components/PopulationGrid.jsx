import React from 'react';
import Board from './Board';

const MiniBoard = ({ state }) => {
    // Determine border color based on status
    let borderColor = 'border-slate-600';
    let opacity = 'opacity-100';

    if (state.metadata) {
        switch (state.metadata.status) {
            case 'Elite':
                borderColor = 'border-green-500';
                break;
            case 'Survivor':
                borderColor = 'border-blue-400';
                break;
            case 'Culled':
                borderColor = 'border-red-900';
                opacity = 'opacity-30';
                break;
            case 'Child':
                borderColor = 'border-purple-500';
                break;
            default:
                break;
        }
    }

    // Simplified board rendering (reusing Board but force small)
    // We need to pass a size prop or style to Board if we want it to be truly mini,
    // but Board currently calculates tile size based on window/600.
    // Let's wrap it in a small container and trust standard scaling or make Board accept prop.
    // Actually, Board calculates: const tileSize = Math.min(60, 600 / size);
    // That's too big for a mini grid. We should update Board to accept a maxDimension prop.

    // For now, let's just inline a simple mini renderer here to avoid modifying Board too much,
    // OR update Board to be flexible. Updating Board is cleaner for "Generic Problem".

    // Let's implement a very simple SVG renderer for speed and size
    const { size, queens } = state;
    const cellSize = 100 / size; // Percent

    return (
        <div className={`relative border-2 ${borderColor} ${opacity} bg-slate-800 transition-all duration-300`}>
            <svg viewBox={`0 0 ${size * 10} ${size * 10}`} className="w-full h-full block">
                {/* Background */}
                <rect width="100%" height="100%" fill="#1e293b" />

                {/* Queens */}
                {queens.map((col, row) => (
                    <circle
                        key={row}
                        cx={col * 10 + 5}
                        cy={row * 10 + 5}
                        r={3}
                        fill={state.getAttackingQueens().has(row) ? "#ef4444" : "#e2e8f0"}
                    />
                ))}
            </svg>

            {/* Cost Overlay */}
            <div className="absolute bottom-0 right-0 bg-black/70 text-[10px] text-white px-1 leading-tight">
                {state.cost}
            </div>

            {/* Status Label (optional) */}
            {state.metadata?.status === 'Elite' && (
                <div className="absolute top-0 left-0 bg-green-600/90 text-[8px] text-white px-1 leading-tight uppercase font-bold">
                    Elite
                </div>
            )}
        </div>
    );
};

const PopulationGrid = ({ population }) => {
    if (!population) return null;

    return (
        <div className="grid grid-cols-5 gap-2 p-2 overflow-y-auto h-full content-start">
            {population.map((individual, idx) => (
                <div key={idx} className="aspect-square w-full">
                    <MiniBoard state={individual} />
                </div>
            ))}
        </div>
    );
};

export default PopulationGrid;
