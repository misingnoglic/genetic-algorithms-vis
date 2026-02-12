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

const StatsPanel = ({ history, currentCost, bestCost, stepCount, evaluations }) => {
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
            <div className="grid grid-cols-2 gap-4 mb-4">
                <div className="bg-slate-700 p-3 rounded text-center">
                    <div className="text-xs text-slate-400 uppercase">Current Cost</div>
                    <div className="text-2xl font-bold text-white">{currentCost ?? '-'}</div>
                </div>
                <div className="bg-slate-700 p-3 rounded text-center">
                    <div className="text-xs text-slate-400 uppercase">Best Found</div>
                    <div className="text-2xl font-bold text-green-400">{bestCost ?? '-'}</div>
                </div>
                <div className="bg-slate-700 p-3 rounded text-center">
                    <div className="text-xs text-slate-400 uppercase">Steps</div>
                    <div className="text-2xl font-bold text-blue-400">{stepCount}</div>
                </div>
                <div className="bg-slate-700 p-3 rounded text-center">
                    <div className="text-xs text-slate-400 uppercase">Evaluations</div>
                    <div className="text-2xl font-bold text-purple-400">{evaluations ?? 0}</div>
                </div>
            </div>

            <div className="flex-grow min-h-[200px]">
                <Line data={data} options={options} />
            </div>
        </div>
    );
};

export default StatsPanel;
