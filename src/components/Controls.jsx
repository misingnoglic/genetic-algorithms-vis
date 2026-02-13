import React from 'react';
import { Play, Pause, RotateCcw, FastForward, SkipForward } from 'lucide-react';

const Controls = ({
    algorithm,
    setAlgorithm,
    problemId,
    setProblemId,
    problemParams,
    setProblemParams,
    algoParams,
    setAlgoParams,
    isPlaying,
    isFinished,
    onPlayPause,
    onReset,
    onStep,
    speed,
    setSpeed
}) => {

    const handleAlgoParamChange = (key, value) => {
        setAlgoParams(prev => ({ ...prev, [key]: value }));
    };

    const handleProblemParamChange = (key, value) => {
        setProblemParams(prev => ({ ...prev, [key]: value }));
    };

    return (
        <div className="bg-slate-800 p-4 rounded-lg shadow-lg text-slate-200 flex flex-col gap-4 h-full overflow-y-auto">
            <h2 className="text-xl font-bold bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">
                N-Queens Control
            </h2>

            {/* Global Settings */}
            <div className="space-y-2">
                <label className="text-xs font-semibold uppercase text-slate-400">Board Size (N)</label>
                <input
                    type="number"
                    min="4" max="20"
                    value={problemParams.size || 8}
                    onChange={(e) => handleProblemParamChange('size', parseInt(e.target.value))}
                    className="w-full bg-slate-700 border border-slate-600 rounded px-2 py-1"
                    disabled={isPlaying}
                />
            </div>

            <div className="space-y-2">
                <label className="text-xs font-semibold uppercase text-slate-400">Algorithm</label>
                <select
                    value={algorithm}
                    onChange={(e) => setAlgorithm(e.target.value)}
                    className="w-full bg-slate-700 border border-slate-600 rounded px-2 py-1"
                    disabled={isPlaying}
                >
                    <option value="hillClimbing">Hill Climbing</option>
                    <option value="stochasticHillClimbing">Stochastic Hill Climbing</option>
                    <option value="localBeamSearch">Local Beam Search</option>
                    <option value="simulatedAnnealing">Simulated Annealing</option>
                    <option value="geneticAlgorithm">Genetic Algorithm</option>
                </select>
            </div>

            {/* Algorithm Specific Params */}
            <div className="space-y-4 border-t border-slate-700 pt-4">
                {(algorithm === 'hillClimbing' || algorithm === 'stochasticHillClimbing' || algorithm === 'localBeamSearch') && (
                    <>
                        <div className="space-y-2">
                            <label className="text-xs font-semibold uppercase text-slate-400">Max Sideways Moves</label>
                            <input
                                type="number"
                                value={algoParams.maxSideways || 0}
                                onChange={(e) => handleAlgoParamChange('maxSideways', parseInt(e.target.value))}
                                className="w-full bg-slate-700 border border-slate-600 rounded px-2 py-1"
                            />
                        </div>
                        {algorithm === 'stochasticHillClimbing' && (
                            <div className="space-y-2">
                                <label className="text-xs font-semibold uppercase text-slate-400">Variant</label>
                                <select
                                    value={algoParams.variant || 'standard'}
                                    onChange={(e) => handleAlgoParamChange('variant', e.target.value)}
                                    className="w-full bg-slate-700 border border-slate-600 rounded px-2 py-1"
                                >
                                    <option value="standard">Standard (Random Better)</option>
                                    <option value="weighted">Steepness Weighted</option>
                                    <option value="firstChoice">First Choice</option>
                                </select>
                            </div>
                        )}
                        <div className="space-y-2">
                            <label className="text-xs font-semibold uppercase text-slate-400">Max Random Restarts</label>
                            <input
                                type="number"
                                value={algoParams.maxRestarts || 0}
                                onChange={(e) => handleAlgoParamChange('maxRestarts', parseInt(e.target.value))}
                                className="w-full bg-slate-700 border border-slate-600 rounded px-2 py-1"
                            />
                        </div>
                    </>
                )}

                {algorithm === 'localBeamSearch' && (
                    <>
                        <div className="space-y-2">
                            <label className="text-xs font-semibold uppercase text-slate-400">Beam Width (k)</label>
                            <input
                                type="number"
                                min="1"
                                value={algoParams.beamWidth || 5}
                                onChange={(e) => handleAlgoParamChange('beamWidth', parseInt(e.target.value))}
                                className="w-full bg-slate-700 border border-slate-600 rounded px-2 py-1"
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-xs font-semibold uppercase text-slate-400">Variant</label>
                            <select
                                value={algoParams.variant || 'white'}
                                onChange={(e) => handleAlgoParamChange('variant', e.target.value)}
                                className="w-full bg-slate-700 border border-slate-600 rounded px-2 py-1"
                            >
                                <option value="deterministic">Deterministic (Best k)</option>
                                <option value="stochastic">Stochastic (Weighted)</option>
                            </select>
                        </div>
                    </>
                )}

                {algorithm === 'simulatedAnnealing' && (
                    <>
                        <div className="space-y-2">
                            <label className="text-xs font-semibold uppercase text-slate-400">Initial Temp</label>
                            <input
                                type="number"
                                value={algoParams.initialTemp || 100}
                                onChange={(e) => handleAlgoParamChange('initialTemp', parseFloat(e.target.value))}
                                className="w-full bg-slate-700 border border-slate-600 rounded px-2 py-1"
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-xs font-semibold uppercase text-slate-400">Cooling Rate</label>
                            <input
                                type="number"
                                step="0.001"
                                min="0.1" max="0.999"
                                value={algoParams.coolingRate || 0.99}
                                onChange={(e) => handleAlgoParamChange('coolingRate', parseFloat(e.target.value))}
                                className="w-full bg-slate-700 border border-slate-600 rounded px-2 py-1"
                            />
                        </div>
                    </>
                )}

                {algorithm === 'geneticAlgorithm' && (
                    <>
                        <div className="space-y-2">
                            <label className="text-xs font-semibold uppercase text-slate-400">Population Size</label>
                            <input
                                type="number"
                                value={algoParams.startingPopulationSize || 100}
                                onChange={(e) => handleAlgoParamChange('startingPopulationSize', parseInt(e.target.value))}
                                className="w-full bg-slate-700 border border-slate-600 rounded px-2 py-1"
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-xs font-semibold uppercase text-slate-400">Mutation Rate</label>
                            <input
                                type="number"
                                step="0.01"
                                value={algoParams.mutationRate || 0.1}
                                onChange={(e) => handleAlgoParamChange('mutationRate', parseFloat(e.target.value))}
                                className="w-full bg-slate-700 border border-slate-600 rounded px-2 py-1"
                            />
                        </div>

                        <div className="space-y-2">
                            <label className="text-xs font-semibold uppercase text-slate-400">Cull Rate (0-1)</label>
                            <input
                                type="number"
                                step="0.1"
                                min="0" max="0.9"
                                value={algoParams.cullRate || 0}
                                onChange={(e) => handleAlgoParamChange('cullRate', parseFloat(e.target.value))}
                                className="w-full bg-slate-700 border border-slate-600 rounded px-2 py-1"
                            />
                        </div>
                        <div className="flex items-center gap-2">
                            <input
                                type="checkbox"
                                checked={algoParams.elitism !== false}
                                onChange={(e) => handleAlgoParamChange('elitism', e.target.checked)}
                                className="bg-slate-700 border border-slate-600 rounded"
                            />
                            <label className="text-xs font-semibold uppercase text-slate-400">Elitism</label>
                        </div>
                    </>
                )}
            </div>

            {/* Execution Controls */}
            <div className="mt-auto space-y-4 pt-4 border-t border-slate-700">
                <div className="space-y-2">
                    <div className="flex justify-between text-xs text-slate-400 uppercase">
                        <span>Speed</span>
                        <span>{speed}ms</span>
                    </div>
                    <input
                        type="range"
                        min="1" max="1000" step="10"
                        value={speed}
                        onChange={(e) => setSpeed(parseInt(e.target.value))}
                        className="w-full accent-blue-500" // reversed direction visual logic needed? usually left is slow (high delay)
                    />
                </div>

                <div className="flex gap-2">
                    <button
                        onClick={isFinished ? () => { onReset(); setTimeout(onPlayPause, 0); } : onPlayPause}
                        className={`flex-1 py-2 rounded flex items-center justify-center gap-2 font-bold ${isPlaying
                            ? 'bg-red-500 hover:bg-red-600'
                            : (isFinished ? 'bg-blue-500 hover:bg-blue-600' : 'bg-green-500 hover:bg-green-600')
                            }`}
                    >
                        {isPlaying ? <Pause size={18} /> : (isFinished ? <RotateCcw size={18} /> : <Play size={18} />)}
                        {isPlaying ? 'Pause' : (isFinished ? 'Restart & Run' : 'Start')}
                    </button>

                    <button
                        onClick={onStep}
                        disabled={isPlaying || isFinished}
                        className="px-3 py-2 bg-slate-600 rounded hover:bg-slate-500 disabled:opacity-50"
                        title="Single Step"
                    >
                        <SkipForward size={18} />
                    </button>

                    <button
                        onClick={onReset}
                        className="px-3 py-2 bg-slate-600 rounded hover:bg-slate-500"
                        title="Reset"
                    >
                        <RotateCcw size={18} />
                    </button>
                </div>
            </div>
        </div>
    );
};

export default Controls;
