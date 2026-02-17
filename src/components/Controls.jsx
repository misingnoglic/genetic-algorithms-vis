import React from 'react';
import { Play, Pause, RotateCcw, FastForward, SkipForward, Zap, Shuffle, RefreshCw, Trophy } from 'lucide-react';

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
    isTurbo,
    isFinished,
    onPlayPause,
    onRestart,
    onNewProblem,
    onStep,
    onTurbo,
    onShowBenchmark,
    speed,
    setSpeed,
    problemRegistry,
    currentProblem,
}) => {

    const handleAlgoParamChange = (key, value) => {
        setAlgoParams(prev => ({ ...prev, [key]: value }));
    };

    const handleProblemParamChange = (key, value) => {
        setProblemParams(prev => {
            const next = { ...prev, [key]: value };
            // When graph type changes, set a sensible default number of colors
            if (key === 'graphType') {
                const colorDefaults = { us: 4, australia: 3, random: 3 };
                next.numColors = colorDefaults[value] || 3;
            }
            return next;
        });
    };

    return (
        <div className="bg-slate-800 p-4 rounded-lg shadow-lg text-slate-200 flex flex-col gap-4 h-full overflow-y-auto">
            <h2 className="text-xl font-bold bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">
                Algorithm Visualizer
            </h2>

            {/* Problem Selection */}
            <div className="space-y-2">
                <label className="text-xs font-semibold uppercase text-slate-400">Problem</label>
                <select
                    value={problemId}
                    onChange={(e) => { setProblemId(e.target.value); }}
                    className="w-full bg-slate-700 border border-slate-600 rounded px-2 py-1"
                    disabled={isPlaying}
                >
                    {problemRegistry && Object.entries(problemRegistry).map(([id, prob]) => (
                        <option key={id} value={id}>{prob.name}</option>
                    ))}
                </select>
            </div>

            {/* Map Coloring: Graph Type */}
            {problemId === 'map-coloring' && currentProblem?.graphTypes && (
                <div className="space-y-2">
                    <label className="text-xs font-semibold uppercase text-slate-400">Graph Type</label>
                    <select
                        value={problemParams.graphType || 'australia'}
                        onChange={(e) => handleProblemParamChange('graphType', e.target.value)}
                        className="w-full bg-slate-700 border border-slate-600 rounded px-2 py-1"
                        disabled={isPlaying}
                    >
                        {Object.entries(currentProblem.graphTypes).map(([key, label]) => (
                            <option key={key} value={key}>{label}</option>
                        ))}
                    </select>
                </div>
            )}

            {/* Map Coloring: Number of Colors */}
            {problemId === 'map-coloring' && (
                <div className="space-y-2">
                    <label className="text-xs font-semibold uppercase text-slate-400">Number of Colors</label>
                    <input
                        type="number"
                        min="2" max="8"
                        value={problemParams.numColors || 3}
                        onChange={(e) => handleProblemParamChange('numColors', parseInt(e.target.value))}
                        className="w-full bg-slate-700 border border-slate-600 rounded px-2 py-1"
                        disabled={isPlaying}
                    />
                </div>
            )}

            {/* Board Size / N / Cities — for non-map-coloring problems */}
            {problemId !== 'map-coloring' && (
                <div className="space-y-2">
                    <label className="text-xs font-semibold uppercase text-slate-400">
                        {problemId === 'tsp' ? 'Number of Cities' : (problemId === 'sudoku' ? 'Grid Size' : 'Board Size (N)')}
                    </label>

                    {problemId === 'sudoku' ? (
                        <select
                            value={problemParams.size || 9}
                            onChange={(e) => {
                                const newSize = parseInt(e.target.value);
                                const newK = Math.floor(newSize * newSize * 0.60);
                                setProblemParams(prev => ({ ...prev, size: newSize, removeCount: newK }));
                            }}
                            className="w-full bg-slate-700 border border-slate-600 rounded px-2 py-1"
                            disabled={isPlaying}
                        >
                            <option value="3">3x3 (Tiny)</option>
                            <option value="6">6x6 (Mini)</option>
                            <option value="9">9x9 (Standard)</option>
                            <option value="15">15x15 (Giant)</option>
                        </select>
                    ) : (
                        <input
                            type="number"
                            min="4" max={problemId === 'tsp' ? "50" : "20"}
                            value={problemParams.size || (problemId === 'tsp' ? 20 : 8)}
                            onChange={(e) => handleProblemParamChange('size', parseInt(e.target.value))}
                            className="w-full bg-slate-700 border border-slate-600 rounded px-2 py-1"
                            disabled={isPlaying}
                        />
                    )}
                </div>
            )}

            {/* Random graph node count */}
            {problemId === 'map-coloring' && problemParams.graphType === 'random' && (
                <div className="space-y-2">
                    <label className="text-xs font-semibold uppercase text-slate-400">Number of Nodes</label>
                    <input
                        type="number"
                        min="3" max="20"
                        value={problemParams.size || 8}
                        onChange={(e) => handleProblemParamChange('size', parseInt(e.target.value))}
                        className="w-full bg-slate-700 border border-slate-600 rounded px-2 py-1"
                        disabled={isPlaying}
                    />
                </div>
            )}

            {problemId === 'sudoku' && (
                <div className="space-y-2">
                    <div className="flex justify-between text-xs text-slate-400 uppercase">
                        <label className="font-semibold">Empty Cells (k)</label>
                        <span>{problemParams.removeCount || 40}</span>
                    </div>
                    <input
                        type="range"
                        min="1"
                        max={(problemParams.size || 9) * (problemParams.size || 9)}
                        value={problemParams.removeCount || 40}
                        onChange={(e) => handleProblemParamChange('removeCount', parseInt(e.target.value))}
                        className="w-full accent-blue-500"
                    />
                </div>
            )}

            {/* Algorithm Selection */}
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
                    <optgroup label="Uninformed Search">
                        <option value="bfs">Breadth-First Search</option>
                        <option value="dfs">Depth-First Search</option>
                    </optgroup>
                    {currentProblem?.supportsCSP && (
                        <optgroup label="Constraint Satisfaction">
                            <option value="backtracking">Backtracking</option>
                            <option value="forwardChecking">Forward Checking</option>
                            <option value="arcConsistency">Arc Consistency (AC-3)</option>
                        </optgroup>
                    )}
                </select>
            </div>

            {/* Benchmark Trigger */}
            <button
                onClick={onShowBenchmark}
                className="w-full mt-2 py-1.5 bg-slate-700 hover:bg-slate-600 text-slate-300 hover:text-white rounded text-xs font-bold flex items-center justify-center gap-2 transition-colors border border-slate-600 mb-2"
            >
                <Trophy size={12} className="text-amber-400" /> COMPARE ALGORITHMS
            </button>

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

                {algorithm === 'hillClimbing' && (
                    <div className="space-y-2">
                        <div className="flex justify-between text-xs text-slate-400 uppercase">
                            <label className="font-semibold">Sideways Tolerance</label>
                            <span>{((algoParams.sidewaysTolerance || 0) * 100).toFixed(1)}%</span>
                        </div>
                        <input
                            type="range"
                            min="0" max="0.1" step="0.001"
                            value={algoParams.sidewaysTolerance || 0}
                            onChange={(e) => handleAlgoParamChange('sidewaysTolerance', parseFloat(e.target.value))}
                            className="w-full accent-purple-500"
                        />
                        <p className="text-[10px] text-slate-500">Accept worse moves within this % as sideways.</p>
                    </div>
                )}

                {/* Variable Selection */}
                {(algorithm === 'backtracking' || algorithm === 'forwardChecking' || algorithm === 'arcConsistency') && (
                    <div className="space-y-2">
                        <label className="text-xs font-semibold uppercase text-slate-400">Variable Selection</label>
                        <select
                            value={algoParams.variableHeuristic || 'inOrder'}
                            onChange={(e) => handleAlgoParamChange('variableHeuristic', e.target.value)}
                            className="w-full bg-slate-700 border border-slate-600 rounded px-2 py-1"
                        >
                            <option value="inOrder">In-Order (Default)</option>
                            <option value="degree">Degree Heuristic</option>
                            <option value="random">Random</option>
                            {algorithm !== 'backtracking' && (
                                <>
                                    <option value="mrv">MRV (Most Constrained)</option>
                                    <option value="leastConstrained">Least Constrained (Educational)</option>
                                </>
                            )}
                        </select>
                    </div>
                )}

                {/* Value Ordering */}
                {(algorithm === 'backtracking' || algorithm === 'forwardChecking' || algorithm === 'arcConsistency') && (
                    <div className="space-y-2">
                        <label className="text-xs font-semibold uppercase text-slate-400">Value Ordering</label>
                        <select
                            value={algoParams.valueOrdering || 'inOrder'}
                            onChange={(e) => handleAlgoParamChange('valueOrdering', e.target.value)}
                            className="w-full bg-slate-700 border border-slate-600 rounded px-2 py-1"
                        >
                            <option value="inOrder">In-Order (Default)</option>
                            <option value="lcv">Least Constraining Value (LCV)</option>
                            <option value="random">Random</option>
                        </select>
                    </div>
                )}

                {(algorithm === 'bfs' || algorithm === 'dfs' || algorithm === 'backtracking' || algorithm === 'forwardChecking' || algorithm === 'arcConsistency') && (
                    <div className="space-y-2">
                        <label className="text-xs font-semibold uppercase text-slate-400">Max Iterations (Limit)</label>
                        <input
                            type="number"
                            min="10" max="1000000"
                            value={algoParams.maxIterations || 10000}
                            onChange={(e) => handleAlgoParamChange('maxIterations', parseInt(e.target.value))}
                            className="w-full bg-slate-700 border border-slate-600 rounded px-2 py-1"
                        />
                        <p className="text-[10px] text-slate-500">Uninformed search can take a very long time. Use limit to stop execution.</p>
                    </div>
                )}
            </div>

            {/* Execution Controls */}
            <div className="mt-auto space-y-4 pt-4 border-t border-slate-700">
                {/* Turbo Button */}
                <div className="flex gap-2">
                    <button
                        onClick={onTurbo}
                        disabled={isFinished}
                        className={`flex-1 py-2 px-2 rounded font-bold text-sm tracking-wide flex items-center justify-center gap-1 transition-all
                            ${isTurbo
                                ? 'bg-purple-600 text-white shadow-[0_0_15px_rgba(147,51,234,0.5)] scale-105'
                                : 'bg-slate-700 text-purple-400 hover:bg-slate-600 hover:text-purple-300'}`}
                    >
                        <Zap size={16} className={isTurbo ? "fill-current" : ""} /> TURBO
                    </button>
                </div>

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
                        className="w-full accent-blue-500"
                    />
                </div>

                <div className="flex gap-2">
                    <button
                        onClick={isFinished ? () => { onRestart(); setTimeout(onPlayPause, 0); } : onPlayPause}
                        className={`flex-1 py-2 rounded flex items-center justify-center gap-2 font-bold ${isPlaying
                            ? 'bg-red-500 hover:bg-red-600'
                            : (isFinished ? 'bg-blue-500 hover:bg-blue-600' : 'bg-green-500 hover:bg-green-600')
                            }`}
                    >
                        {isPlaying ? <Pause size={18} /> : (isFinished ? <RotateCcw size={18} /> : <Play size={18} />)}
                        {isPlaying ? 'Pause' : (isFinished ? 'Rerun' : 'Start')}
                    </button>

                    <button
                        onClick={onStep}
                        disabled={isPlaying || isFinished}
                        className="px-3 py-2 bg-slate-700 rounded hover:bg-slate-600 disabled:opacity-50 text-slate-200"
                        title="Single Step"
                    >
                        <SkipForward size={18} />
                    </button>

                    <div className="flex flex-col gap-1">
                        <button
                            onClick={onRestart}
                            className="px-3 py-1 bg-slate-700 rounded hover:bg-slate-600 text-slate-200 text-xs flex items-center gap-1"
                            title="Restart (Same Graph)"
                        >
                            <RefreshCw size={14} /> Same
                        </button>
                        <button
                            onClick={onNewProblem}
                            className="px-3 py-1 bg-slate-700 rounded hover:bg-slate-600 text-slate-200 text-xs flex items-center gap-1"
                            title="New Problem"
                        >
                            <Shuffle size={14} /> New
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Controls;
