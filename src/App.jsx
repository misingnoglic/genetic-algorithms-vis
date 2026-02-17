import React, { useState, useEffect, useRef, useCallback } from 'react'; // Force rebuild
import NQueensBoard from './components/boards/NQueensBoard';
import TSPBoard from './components/boards/TSPBoard';
import SudokuBoard from './components/boards/SudokuBoard';
import MapColoringBoard from './components/boards/MapColoringBoard';
import TetrisBoard from './components/boards/TetrisBoard';
import Controls from './components/Controls';
import StatsPanel from './components/StatsPanel';
import PopulationGrid from './components/PopulationGrid';
import { NQueensProblem } from './core/problems/n-queens.js';
import { TSPProblem } from './core/problems/tsp.js';
import { SudokuProblem } from './core/problems/sudoku.js';
import { MapColoringProblem } from './core/problems/map-coloring.js';
import { TetrisPackingProblem } from './core/problems/tetris-packing.js';
import { Algorithms } from './core/algorithms.js';
import { BenchmarkRunner, getValidConfigs, BENCHMARK_SEEDS } from './core/benchmark.js';
import BenchmarkModal from './components/BenchmarkModal.jsx';

// Attach board components to problem objects for generic rendering
NQueensProblem.BoardComponent = NQueensBoard;
TSPProblem.BoardComponent = TSPBoard;
SudokuProblem.BoardComponent = SudokuBoard;
MapColoringProblem.BoardComponent = MapColoringBoard;
TetrisPackingProblem.BoardComponent = TetrisBoard;

export const PROBLEM_REGISTRY = {
  [NQueensProblem.id]: NQueensProblem,
  [TSPProblem.id]: TSPProblem,
  [SudokuProblem.id]: SudokuProblem,
  [MapColoringProblem.id]: MapColoringProblem,
  [TetrisPackingProblem.id]: TetrisPackingProblem
};

const isConstructive = (algo) => {
  return ['bfs', 'dfs', 'backtracking', 'forwardChecking', 'arcConsistency'].includes(algo);
};

function App() {
  // Config State
  const [selectedProblemId, setSelectedProblemId] = useState(NQueensProblem.id);
  const [algorithm, setAlgorithm] = useState('hillClimbing');

  // Params - merged generic and problem specific
  // We'll store them in a single object for now, or separate
  const [problemParams, setProblemParams] = useState(NQueensProblem.defaultParams);

  // Reset params when problem changes
  useEffect(() => {
    setProblemParams(PROBLEM_REGISTRY[selectedProblemId].defaultParams);
  }, [selectedProblemId]);

  const [algoParams, setAlgoParams] = useState({
    // Default params
    maxSideways: 100,
    maxRestarts: 5,
    variant: 'standard',
    initialTemp: 1000,
    coolingRate: 0.99,
    startingPopulationSize: 50,
    mutationRate: 0.1,
    mixingNumber: 2,
    cullRate: 0.0,
    elitism: true,
    maxIterations: 10000
  });
  const [speed, setSpeed] = useState(100); // ms delay

  // Execution State
  // Execution State
  const [initialState, setInitialState] = useState(null); // Store the starting state for restarts
  const [currentState, setCurrentState] = useState(null);
  const [population, setPopulation] = useState(null); // Full population for GA
  const [history, setHistory] = useState([]); // Array of costs
  const [stepCount, setStepCount] = useState(0);
  const [evaluations, setEvaluations] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isTurbo, setIsTurbo] = useState(false);
  const [isFinished, setIsFinished] = useState(false);
  const [algoNote, setAlgoNote] = useState('');
  const [optimalCost, setOptimalCost] = useState(null);
  const [bestSolutionCost, setBestSolutionCost] = useState(Infinity); // Track best complete solution cost
  // We use a ref for the best state to avoid stale closures in the animation loop
  const bestSolutionRef = useRef({ cost: Infinity, state: null });

  // Benchmark State
  const [showBenchmark, setShowBenchmark] = useState(false);
  const [benchmarkRunner, setBenchmarkRunner] = useState(null);
  const [benchmarkProgress, setBenchmarkProgress] = useState(0);
  const [benchmarkResults, setBenchmarkResults] = useState(null);

  // Refs
  const iteratorRef = useRef(null);
  const timerRef = useRef(null);
  const currentStateRef = useRef(currentState);

  // Keep ref updated
  useEffect(() => {
    currentStateRef.current = currentState;
  }, [currentState]);

  const currentProblem = PROBLEM_REGISTRY[selectedProblemId];

  const handleRunBenchmark = useCallback(async () => {
    setBenchmarkResults(null);
    setBenchmarkProgress(0);

    // Create runner with CURRENT problem setup
    // Ensure we use a fresh runner
    const params = { ...problemParams };
    // Generic instance params extraction
    if (currentProblem.extractInstanceParams && currentState) {
      Object.assign(params, currentProblem.extractInstanceParams(currentState));
    }

    const runner = new BenchmarkRunner(currentProblem, params);
    setBenchmarkRunner(runner);

    const results = await runner.run((prog) => {
      setBenchmarkProgress(prog);
    });

    if (results) {
      setBenchmarkResults(results);
    }
  }, [currentProblem, problemParams, selectedProblemId, currentState]);

  const searchSpace = currentProblem.getSearchSpace ? currentProblem.getSearchSpace(problemParams, currentState) : { formula: '?', approx: '?' };

  // Helper to reset execution state to a given state
  const resetToState = useCallback((state) => {
    // Stop any running
    setIsPlaying(false);
    setIsTurbo(false);
    setIsFinished(false);
    iteratorRef.current = null;

    setCurrentState(state);

    // Only add initial cost to history if it's a complete state (or close to it)
    // We want to avoid adding the "Empty State" penalty (e.g. 8000 for N-Queens) to the chart
    if (state.isPartial) {
      setHistory([]);
    } else {
      setHistory([state.cost]);
    }

    setStepCount(0);
    setEvaluations(0);
    setAlgoNote('Ready');
    setPopulation(null);
    setBestSolutionCost(Infinity); // Reset best found
    bestSolutionRef.current = { cost: Infinity, state: null };
  }, []);

  // Generate a completely new problem instance
  const generateNewProblem = useCallback(() => {
    // Reset params helper if needed
    const params = { ...problemParams };
    if (!params.size) params.size = currentProblem.defaultParams.size;

    // 1. Generate FULL random state first (to ensure instance data is created)
    const fullState = currentProblem.randomState(params);

    // 2. Extract instance definition from full state for empty state creation
    const defParams = { ...params };
    if (currentProblem.extractInstanceParams) {
      Object.assign(defParams, currentProblem.extractInstanceParams(fullState));
    }

    // 3. Create Empty State (Display Only)
    // This state will be what the user sees initially (Blank Board, Map, Puzzle)
    const emptyState = currentProblem.emptyState(defParams);

    // Calculate known best
    let opt = null;
    if (currentProblem.estimatedOptimalCost) {
      opt = currentProblem.estimatedOptimalCost(defParams);
    }
    setOptimalCost(opt);

    // Set Initial State to the EMPTY state
    setInitialState(emptyState);
    resetToState(emptyState);
  }, [currentProblem, problemParams, selectedProblemId, resetToState]);

  // Handle Params Change or Init
  useEffect(() => {
    generateNewProblem();
  }, [generateNewProblem]);

  // Handle Algorithm Change -> Auto Restart
  useEffect(() => {
    // If we switch algorithms, we likely want to start fresh with the current problem
    handleRestart();
  }, [algorithm]); // depends on handleRestart but we need to define it first or move effect down?
  // Actually handleRestart uses state, so it changes.
  // We need handleRestart to be defined BEFORE this effect or hoist it?
  // Functions defined with const are NOT hoisted.
  // We should move this effect AFTER handleRestart definition.

  // Let's define handleRestart first.

  const handleRestart = useCallback(() => {
    if (initialState) {
      resetToState(initialState);
    } else {
      generateNewProblem();
    }
  }, [initialState, resetToState, generateNewProblem]);

  // Now the effect
  useEffect(() => {
    handleRestart();
  }, [algorithm, handleRestart]);

  // Clear benchmark results when problem changes
  useEffect(() => {
    setBenchmarkResults(null);
    setBenchmarkProgress(0);
    // Also stop any running benchmark
    if (benchmarkRunner) {
      benchmarkRunner.cancel();
    }
  }, [selectedProblemId]);

  const handleNewProblem = () => {
    generateNewProblem();
  };



  const startAlgorithm = useCallback(() => {
    if (!iteratorRef.current) {
      // Create generator
      let gen;
      // Merge params
      let fullParams = { ...algoParams, ...problemParams };
      let current = currentStateRef.current;

      // Generic instance params extraction from current/initial state
      if (currentProblem.extractInstanceParams) {
        if (current) {
          Object.assign(fullParams, currentProblem.extractInstanceParams(current));
        } else if (initialState) {
          Object.assign(fullParams, currentProblem.extractInstanceParams(initialState));
        }
      }

      // AUTO-START CHECKS:
      // If Algorithm is Local Search (needs full state) AND Current State is Partial/Empty:
      // We must generate a RANDOM start state on the fly.
      if (!isConstructive(algorithm) && current && current.isPartial) {
        console.log('Auto-generating random start state for Local Search...');
        // Use fullParams which now contains cities/puzzle
        const randomStart = currentProblem.randomState(fullParams);

        // Update View immediately to show the random start
        setCurrentState(randomStart);
        setHistory([randomStart.cost]); // Start chart with this valid random state cost
        setStepCount(0); // Reset counters for the new run
        setEvaluations(0);
        current = randomStart; // Use this new state for the algo
      }

      if (algorithm === 'geneticAlgorithm' || algorithm === 'localBeamSearch') {
        // GA and Beam Search create their own population but we pass just params AND problem instance
        gen = Algorithms[algorithm](null, fullParams, currentProblem);
      } else {
        gen = Algorithms[algorithm](current, fullParams, currentProblem);
      }
      iteratorRef.current = gen;
    }
  }, [algorithm, algoParams, problemParams, currentProblem, selectedProblemId, initialState]);

  // Helper to run N steps (batch)
  const runBatch = useCallback((batchSize) => {
    if (!iteratorRef.current) {
      startAlgorithm();
    }

    // Safety check
    if (!iteratorRef.current) return;

    let lastResult = null;
    let batchHistory = [];
    let lastValidState = null;
    let lastValidValue = null;

    let batchBestState = null;
    let batchBestCost = Infinity;

    // Run loop
    for (let i = 0; i < batchSize; i++) {
      lastResult = iteratorRef.current.next();
      if (lastResult.done) break;

      if (lastResult.value) {
        lastValidValue = lastResult.value;
        if (lastResult.value.state) {
          const state = lastResult.value.state;
          lastValidState = state;
          batchHistory.push(state.cost);

          // Track Best State in THIS Batch locally
          if (!state.isPartial || currentProblem.isSolution(state)) {
            if (state.cost < batchBestCost) {
              batchBestCost = state.cost;
              batchBestState = state;
            }
          }
        }
      }
    }

    if (!lastResult) return;

    // Update State (Apply regardless of done status if we have data)
    if (lastValidState) {
      setCurrentState(lastValidState);
      setHistory(prev => [...prev, ...batchHistory]);
      setStepCount(prev => prev + batchHistory.length);

      // Update Global Best Solution using the BEST from THIS BATCH
      // We must compare against current bestSolutionRef (source of truth)
      if (batchBestState) {
        if (batchBestCost < bestSolutionRef.current.cost) {
          bestSolutionRef.current = { cost: batchBestCost, state: batchBestState };
          setBestSolutionCost(batchBestCost); // Trigger re-render
        }
      }
    }

    if (lastValidValue) {
      const { population, note, populationStats, restartCount, evaluations } = lastValidValue;

      if (population) setPopulation(population);

      let detailedNote = note;
      if (populationStats) {
        detailedNote = `${note} | Pop: ${populationStats.size} | Avg: ${populationStats.avgCost} `;
      } else if (restartCount !== undefined && restartCount > 0) {
        detailedNote = `${note} (Restart #${restartCount})`;
      }
      setAlgoNote(detailedNote);

      if (evaluations !== undefined) setEvaluations(evaluations);
    }

    // Handle Finished
    if (lastResult.done) {
      setIsPlaying(false);
      setIsTurbo(false);
      setIsFinished(true);

      // If generator returns a value (best state), use it
      if (lastResult.value && typeof lastResult.value === 'object') {
        const { state, note } = lastResult.value;
        if (note) setAlgoNote(note);

        if (state) {
          // Always restore the best state returned by the algorithm
          setCurrentState(state);
          setAlgoNote(prev => prev + ' (Best Restored)');

          // Also update the Best Found stat if this is better
          if (state.cost < bestSolutionCost) {
            setBestSolutionCost(state.cost);
          }
        }
      } else if (typeof lastResult.value === 'string') {
        setAlgoNote(lastResult.value);
      } else {
        if (!algoNote.includes('Solution') && !algoNote.includes('Stopped')) {
          setAlgoNote('Finished');
        }
      }
      return;
    }

    // Auto-stop solution (redundant check if generator handles it, but good for safety)
    if (lastValidState && currentProblem.isSolution(lastValidState)) {
      setIsPlaying(false);
      setIsTurbo(false);
      setIsFinished(true);
      setAlgoNote('Solution Found!');
    } else if (lastResult.value && !lastResult.value.state && !lastResult.done) {
      // Case where state is null but not done? (Shouldn't happen with new logic)
    }
  }, [currentProblem, selectedProblemId, algorithm, algoParams, problemParams, startAlgorithm]); // Removed currentState

  const step = useCallback(() => {
    if (!iteratorRef.current) {
      startAlgorithm();
    }

    const result = iteratorRef.current.next();

    if (result.done) {
      setIsPlaying(false);
      setIsFinished(true);

      if (result.value && typeof result.value === 'object') {
        const { state, note } = result.value;
        if (note) setAlgoNote(note);

        if (state) {
          setCurrentState(state);
          setAlgoNote(prev => prev + ' (Best Restored)');
          if (state.cost < bestSolutionCost) {
            setBestSolutionCost(state.cost);
          }
        }
      } else if (typeof result.value === 'string') {
        setAlgoNote(result.value);
      } else {
        setAlgoNote('Finished');
      }
      return;
    }

    const { state, population, note, populationStats, restartCount, evaluations } = result.value;
    // console.log('Step result:', { note, evaluations, restartCount }); // Debug log

    if (state) {
      setCurrentState(state);
    }
    // We could store population in state if we want to visualize it
    // For now, let's just keep 'state' as the best, but maybe pass population to a new view

    // Hack: We can temporarily attach population to the state object or separate state
    // Let's separate state
    if (population) setPopulation(population);

    let detailedNote = note;
    if (populationStats) {
      detailedNote = `${note} | Pop: ${populationStats.size} | Avg: ${populationStats.avgCost} `;
    } else if (restartCount !== undefined && restartCount > 0) {
      detailedNote = `${note} (Restart #${restartCount})`;
    }

    setAlgoNote(detailedNote);
    if (evaluations !== undefined) setEvaluations(evaluations);

    if (state) {
      setHistory(prev => [...prev, state.cost]);
      setStepCount(prev => prev + 1);

      if (!state.isPartial || currentProblem.isSolution(state)) {
        if (state.cost < bestSolutionRef.current.cost) {
          bestSolutionRef.current = { cost: state.cost, state: state };
          setBestSolutionCost(state.cost);
        }
      }
    }

    // Auto-stop if solution found (cost 0 or problem says so)
    // For Tetris (optimization), don't stop just because isSolution is true (complete state)
    // unless cost is 0.
    const isOptimization = currentProblem.id === 'tetris';
    const isComplete = state && ((currentProblem.id !== 'tetris') || state.pieces) && currentProblem.isSolution(state);

    if (state && isComplete && (!isOptimization || (state.cost === 0))) {
      setIsPlaying(false);
      setIsFinished(true);
    } else if (!state) {
      setIsPlaying(false);
      setIsFinished(true);
    }
  }, [algorithm, algoParams, problemParams, currentProblem, startAlgorithm]); // Removed currentState

  const togglePlay = () => {
    if (isPlaying) {
      setIsPlaying(false);
      setIsTurbo(false);
    } else {
      setIsPlaying(true);
    }
  };

  const toggleTurbo = () => {
    if (isTurbo) {
      setIsTurbo(false);
      setIsPlaying(false);
    } else {
      setIsTurbo(true);
      setIsPlaying(true);
    }
  };

  // Timer / Animation Loop
  useEffect(() => {
    if (!isPlaying) {
      return;
    }

    if (isTurbo) {
      // Turbo Loop: requestAnimationFrame with large batch
      let animId;
      const loop = () => {
        // dynamic batch size? 
        // For HC, 100 is too laggy. Let's try 20.
        // For Simulated Annealing (O(1) per step), 100 was fine. 
        // We could make it dynamic based on algorithm, but 20 is a safe middle ground.
        // Or distinct: SA -> 500, HC -> 10.
        let batch = 10;
        if (algorithm === 'simulatedAnnealing' || algorithm === 'stochasticHillClimbing') {
          // Stochastic HC (First Choice) is cheap if it doesn't scan all neighbors.
          // But 'weighted' variant scans all.
          // Let's keep it simple: 20.
          batch = 50;
        }
        if (algorithm === 'hillClimbing') batch = 5; // Very expensive per step

        runBatch(batch);
        animId = requestAnimationFrame(loop);
      };
      loop();
      return () => cancelAnimationFrame(animId);
    } else {
      // Normal Speed
      timerRef.current = setInterval(step, speed);
      return () => clearInterval(timerRef.current);
    }
  }, [isPlaying, isTurbo, speed, step, runBatch]);



  return (
    <div className="flex h-screen w-full bg-slate-900 text-slate-100 overflow-hidden font-sans">
      {/* Sidebar */}
      <div className="w-80 flex-shrink-0 border-r border-slate-800 h-full p-4">
        <Controls
          algorithm={algorithm}
          setAlgorithm={setAlgorithm}

          problemId={selectedProblemId}
          setProblemId={(id) => {
            setIsPlaying(false);
            setIsTurbo(false);
            setCurrentState(null);
            setSelectedProblemId(id);
          }}
          problemRegistry={PROBLEM_REGISTRY}
          currentProblem={currentProblem}
          problemParams={problemParams}
          setProblemParams={setProblemParams}

          algoParams={algoParams}
          setAlgoParams={setAlgoParams}

          isPlaying={isPlaying}
          isTurbo={isTurbo}
          isFinished={isFinished}
          onPlayPause={togglePlay}
          onStep={step}
          onRestart={handleRestart}
          onNewProblem={handleNewProblem}
          onShowBenchmark={() => setShowBenchmark(true)}
          onTurbo={toggleTurbo}
          speed={speed}
          setSpeed={setSpeed}
        />
      </div>

      {/* Main Content */}
      <div className="flex-grow flex flex-col h-full bg-slate-950">
        {/* Header/Stats Bar */}
        <div className="h-16 border-b border-slate-800 flex items-center justify-between px-6 bg-slate-900">
          <h1 className="text-xl font-bold">Algorithm Visualizer</h1>
          <div className="text-slate-400 text-sm font-mono bg-slate-800 px-3 py-1 rounded">
            Note: {algoNote}
          </div>
          <div className="text-sm font-medium">
            Cost: <span className={(currentState?.cost === 0 || (currentState && currentProblem.isSolution && ((currentProblem.id !== 'tetris') || currentState.pieces) && currentProblem.isSolution(currentState))) ? "text-green-400" : "text-red-400"}>
              {currentState?.cost ? currentState.cost.toFixed(3) : '-'}
            </span>
          </div>
        </div>

        {/* Workspace */}
        <div className="flex-grow flex p-6 gap-6 overflow-hidden">
          {/* Visualization Area */}
          <div className="flex-1 flex items-center justify-center p-8 bg-slate-900 relative">
            {/* If we have population, show grid. Else show single board */}
            {population ? (
              <div className="w-full h-full overflow-auto flex items-center justify-center">
                <PopulationGrid population={population} bestState={currentState} BoardComponent={currentProblem.BoardComponent} />
              </div>
            ) : (
              (() => {
                const BoardComponent = currentProblem.BoardComponent;
                return BoardComponent ? <BoardComponent state={currentState} /> : null;
              })()
            )}
          </div>

          {/* Right Panel (Graph/Stats) */}
          <div className="w-96 flex-shrink-0 flex flex-col gap-4">
            <StatsPanel
              history={history}
              currentCost={currentState?.cost}
              bestCost={bestSolutionCost}
              optimalCost={optimalCost}
              stepCount={stepCount}
              evaluations={evaluations}
              formatCost={currentProblem.formatCost}
              searchSpace={searchSpace}
            />
          </div>
        </div>
      </div>

      <BenchmarkModal
        isOpen={showBenchmark}
        onClose={() => setShowBenchmark(false)}
        onRun={handleRunBenchmark}
        isRunning={benchmarkRunner && benchmarkRunner.isRunning}
        progress={benchmarkProgress}
        results={benchmarkResults}
        configCount={getValidConfigs(selectedProblemId, currentProblem).length}
        seedCount={BENCHMARK_SEEDS}
      />
    </div>
  );
}

export default App;
