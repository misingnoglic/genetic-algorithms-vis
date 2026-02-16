import React from 'react';
import { X, Play, Trophy, Timer, Activity } from 'lucide-react';

const BenchmarkModal = ({ isOpen, onClose, onRun, isRunning, progress, results }) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
            <div className="bg-slate-900 border border-slate-700 rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden">
                {/* Header */}
                <div className="p-6 border-b border-slate-800 flex justify-between items-center bg-slate-900">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-purple-500/20 rounded-lg">
                            <Trophy className="text-purple-400" size={24} />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-white">Algorithm Tournament</h2>
                            <p className="text-sm text-slate-400">
                                Comparing {configCount} configurations × {seedCount} random seeds = <span className="text-purple-400 font-bold">{configCount * seedCount} total simulations</span>
                            </p>
                        </div>
                    </div>
                    {!isRunning && (
                        <button onClick={onClose} className="p-2 hover:bg-slate-800 rounded-lg transition-colors text-slate-400 hover:text-white">
                            <X size={20} />
                        </button>
                    )}
                </div>

                {/* Content */}
                <div className="p-6 overflow-y-auto flex-grow bg-slate-950">
                    {(isRunning || progress > 0) && !results && (
                        <div className="flex flex-col items-center justify-center p-12 gap-6">
                            <div className="w-full max-w-md space-y-2">
                                <div className="flex justify-between text-sm text-slate-300">
                                    <span>Running Benchmark...</span>
                                    <span>{Math.round(progress * 100)}%</span>
                                </div>
                                <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
                                    <div
                                        className="h-full bg-gradient-to-r from-purple-500 to-blue-500 transition-all duration-300"
                                        style={{ width: `${progress * 100}%` }}
                                    />
                                </div>
                                <p className="text-center text-xs text-slate-500 pt-2">
                                    Running {seedCount} seeds × {configCount} algorithms (Turbo Mode)
                                </p>
                            </div>
                        </div>
                    )}

                    {!isRunning && !results && (
                        <div className="text-center p-12">
                            <button
                                onClick={onRun}
                                className="px-8 py-4 bg-purple-600 hover:bg-purple-500 text-white rounded-xl font-bold shadow-lg shadow-purple-900/20 transition-all scale-100 hover:scale-105 flex items-center gap-3 mx-auto"
                            >
                                <Play size={24} fill="currentColor" />
                                Start Benchmark
                            </button>
                            <p className="mt-4 text-slate-500">This will take a few seconds.</p>
                        </div>
                    )}

                    {results && (
                        <div className="space-y-6">
                            {/* Winner Banner */}
                            <div className="bg-gradient-to-r from-amber-500/10 to-transparent border-l-4 border-amber-500 p-4 rounded-r-lg">
                                <div className="flex items-center gap-3">
                                    <Trophy className="text-amber-500" size={24} />
                                    <div>
                                        <h3 className="font-bold text-amber-200">Winner: {results[0].name}</h3>
                                        <p className="text-sm text-amber-500/80">
                                            Found best solution cost: {results[0].minCost.toFixed(3)}
                                        </p>
                                    </div>
                                </div>
                            </div>

                            {/* Table */}
                            <div className="border border-slate-800 rounded-lg overflow-hidden">
                                <table className="w-full text-left text-sm">
                                    <thead className="bg-slate-900 text-slate-400 uppercase font-semibold">
                                        <tr>
                                            <th className="p-4">Rank</th>
                                            <th className="p-4">Algorithm</th>
                                            <th className="p-4 text-right">Best Cost</th>
                                            <th className="p-4 text-right">Avg Cost</th>
                                            <th className="p-4 text-right">Avg Evals</th>
                                            <th className="p-4 text-right">Time (ms)</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-800 text-slate-300">
                                        {results.map((r, i) => (
                                            <tr key={r.id} className={i === 0 ? 'bg-amber-500/5' : 'hover:bg-slate-900/50'}>
                                                <td className="p-4 font-mono text-slate-500">#{i + 1}</td>
                                                <td className="p-4 font-medium text-white">{r.name}</td>
                                                <td className={`p-4 text-right font-bold font-mono ${i === 0 ? 'text-green-400' : ''}`}>
                                                    {r.minCost.toFixed(3)}
                                                </td>
                                                <td className="p-4 text-right font-mono text-slate-400">
                                                    {r.avgCost.toFixed(3)}
                                                </td>
                                                <td className="p-4 text-right font-mono text-slate-400">
                                                    {Math.round(r.avgEvaluations).toLocaleString()}
                                                </td>
                                                <td className="p-4 text-right font-mono text-slate-500">
                                                    {r.avgTime.toFixed(1)}ms
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer */}
                {results && (
                    <div className="p-4 border-t border-slate-800 bg-slate-900 flex justify-end gap-3">
                        <button
                            onClick={onRun}
                            className="px-4 py-2 text-purple-400 hover:bg-slate-800 rounded font-medium flex items-center gap-2"
                        >
                            <Activity size={16} /> Rerun
                        </button>
                        <button
                            onClick={onClose}
                            className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded font-medium"
                        >
                            Close
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};

export default BenchmarkModal;
