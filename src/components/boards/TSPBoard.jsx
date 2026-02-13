import React, { useRef, useEffect } from 'react';

const TSPBoard = ({ state, small }) => {
    // state is a TSPState: { tour: [], cities: [{x,y}, ...] }
    // We render this on a canvas or SVG.

    if (!state) return <div className="text-slate-500">No TSP State</div>;

    const { tour, cities } = state;

    if (!tour || !cities) return <div className="text-slate-500">Invalid TSP State</div>;

    if (small) {
        // ViewBox 0 0 100 100 matching main board
        return (
            <svg viewBox="0 0 100 100" className="w-full h-full block">
                <rect width="100%" height="100%" fill="#1e293b" />
                {/* Paths */}
                <polyline
                    points={tour.map(i => `${cities[i].x},${cities[i].y}`).join(' ') + ` ${cities[tour[0]].x},${cities[tour[0]].y}`}
                    fill="none"
                    stroke="#3b82f6"
                    strokeWidth="2"
                    strokeOpacity="0.8"
                />
                {/* Cities */}
                {cities.map((city, i) => (
                    <circle
                        key={i}
                        cx={city.x}
                        cy={city.y}
                        r="3"
                        fill="#f8fafc"
                    />
                ))}
            </svg>
        );
    }

    return (
        <div className="w-full aspect-square bg-slate-800 rounded-lg shadow-inner overflow-hidden border border-slate-700 p-4">
            <svg viewBox="0 0 100 100" className="w-full h-full">
                {/* Draw Paths */}
                {tour.map((cityIndex, i) => {
                    const from = cities[cityIndex];
                    const nextIndex = tour[(i + 1) % tour.length]; // Wrap around
                    const to = cities[nextIndex];

                    return (
                        <line
                            key={`path-${i}`}
                            x1={from.x}
                            y1={from.y}
                            x2={to.x}
                            y2={to.y}
                            stroke="#3b82f6" // Blue-500
                            strokeWidth="0.5"
                            strokeOpacity="0.8"
                        />
                    );
                })}

                {/* Draw Cities */}
                {cities.map((city, i) => (
                    <g key={`city-${i}`}>
                        <circle
                            cx={city.x}
                            cy={city.y}
                            r="1.5"
                            fill="#f8fafc" // Slate-50
                        />
                        <text
                            x={city.x + 2}
                            y={city.y + 2}
                            className="text-[4px] fill-slate-300 pointer-events-none select-none"
                            fontSize="4"
                        >
                            {city.name}
                        </text>
                    </g>
                ))}

                {/* Highlight Start */}
                {tour.length > 0 && (
                    <circle
                        cx={cities[tour[0]].x}
                        cy={cities[tour[0]].y}
                        r="2"
                        fill="#ef4444" // Red-500 start marker
                    />
                )}
            </svg>
        </div>
    );
};

export default TSPBoard;
