import React from 'react';
import NQueensBoard from './boards/NQueensBoard';
import TSPBoard from './boards/TSPBoard';
import SudokuBoard from './boards/SudokuBoard';
import MapColoringBoard from './boards/MapColoringBoard';

// Board component registry for fallback detection
const BOARD_COMPONENTS = {
    NQueensBoard,
    TSPBoard,
    SudokuBoard,
    MapColoringBoard
};

function detectBoardComponent(individual) {
    if (individual.tour) return TSPBoard;
    if (individual.grid) return SudokuBoard;
    if (individual.graph) return MapColoringBoard;
    return NQueensBoard;
}

const PopulationGrid = ({ population, BoardComponent: ProvidedBoard }) => {
    if (!population) return null;

    return (
        <div className="grid grid-cols-5 gap-2 p-2 overflow-y-auto w-full h-full content-start">
            {population.map((individual, idx) => {
                // Use provided board component, or auto-detect
                const BoardComponent = ProvidedBoard || detectBoardComponent(individual);

                // Determine border color based on status
                let borderColor = 'border-slate-600';
                let opacity = 'opacity-100';

                if (individual.metadata) {
                    switch (individual.metadata.status) {
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

                return (
                    <div key={idx} className={`aspect-square w-full relative border-2 ${borderColor} ${opacity} bg-slate-800 transition-all duration-300`}>
                        <BoardComponent state={individual} small={true} />

                        {/* Cost Overlay */}
                        <div className="absolute bottom-0 right-0 bg-black/70 text-[10px] text-white px-1 leading-tight">
                            {individual.cost?.toFixed(1) || individual.cost}
                        </div>

                        {/* Status Label (optional) */}
                        {individual.metadata?.status === 'Elite' && (
                            <div className="absolute top-0 left-0 bg-green-600/90 text-[8px] text-white px-1 leading-tight uppercase font-bold">
                                Elite
                            </div>
                        )}
                    </div>
                );
            })}
        </div>
    );
};

export default PopulationGrid;
