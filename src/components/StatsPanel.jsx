import React from 'react';
import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    Title,
    Tooltip,
    Legend,
} from 'chart.js';
import { Line } from 'react-chartjs-2';

ChartJS.register(
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    Title,
    Tooltip,
    Legend
);

const StatsPanel = ({ history, currentCost, bestCost, optimalCost, stepCount, evaluations, formatCost, searchSpace }) => {
    // Default formatter if not provided
    const fmt = formatCost || ((c) => (c !== undefined && c !== null) ? c.toFixed(2) : '-');

    const data = {
        labels: history.map((_, i) => i),
        datasets: [
            {
                label: 'Objective (Cost)',
                data: history,
                borderColor: 'rgb(255, 99, 132)',
                backgroundColor: 'rgba(255, 99, 132, 0.5)',
                tension: 0.1,
                pointRadius: 0,
                borderWidth: 2,
            },
        ],
    };

    const options = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: {
                position: 'top',
                labels: { color: '#cbd5e1' }
            },
            title: {
                display: true,
                text: 'Optimization Progress',
                color: '#cbd5e1'
            },
        },
        scales: {
            x: {
                grid: { color: '#334155' },
                ticks: { color: '#94a3b8' }
            },
            y: {
                grid: { color: '#334155' },
                ticks: { color: '#94a3b8' },
                beginAtZero: true
            }
        },
        animation: false
    };

    return (
        <div className="flex flex-col h-full bg-slate-800 p-4 rounded-lg shadow-lg">
            {/* Top Row: Costs */}
            <div className="grid grid-cols-3 gap-2 mb-2">
                <div className="bg-slate-700 p-2 rounded text-center">
                    <div className="text-xs text-slate-400 uppercase">Current</div>
                    <div className="text-xl font-bold text-white">
                        {fmt(currentCost)}
                    </div>
                </div>
                <div className="bg-slate-700 p-2 rounded text-center">
                    <div className="text-xs text-slate-400 uppercase">Best Found</div>
                    <div className="text-xl font-bold text-green-400">
                        {fmt(bestCost === Infinity ? null : bestCost)}
                    </div>
                </div>
                <div className="bg-slate-700 p-2 rounded text-center">
                    <div className="text-xs text-slate-400 uppercase">Target</div>
                    <div className="text-xl font-bold text-blue-300">
                        {fmt(optimalCost)}
                    </div>
                </div>
            </div>

            {/* Bottom Row: Counters */}
            <div className="grid grid-cols-3 gap-2 mb-4">
                <div className="bg-slate-700 p-2 rounded text-center">
                    <div className="text-xs text-slate-400 uppercase">Steps</div>
                    <div className="text-xl font-bold text-blue-400">{stepCount}</div>
                </div>
                <div className="bg-slate-700 p-2 rounded text-center">
                    <div className="text-xs text-slate-400 uppercase">Evaluations</div>
                    <div className="text-xl font-bold text-purple-400">{evaluations ?? 0}</div>
                </div>
                <div className="bg-slate-700 p-2 rounded text-center flex flex-col justify-center">
                    <div className="text-xs text-slate-400 uppercase">State Space</div>
                    <div className="text-xs text-slate-500 font-mono mb-1">{searchSpace?.formula}</div>
                    <div className="text-sm font-bold text-slate-200 font-mono">
                        {searchSpace?.approx}
                    </div>
                </div>
            </div>

            <div className="flex-grow min-h-[200px]">
                <Line data={data} options={options} />
            </div>
        </div>
    );
};

export default StatsPanel;
