import React, { useState, useEffect, useRef, useCallback } from 'react';
import Board from './components/Board';
import Controls from './components/Controls';
import StatsPanel from './components/StatsPanel';
import PopulationGrid from './components/PopulationGrid';
import { NQueensProblem } from './core/problems/n-queens.js';
import { Algorithms } from './core/algorithms.js';

const PROBLEM_REGISTRY = {
  [NQueensProblem.id]: NQueensProblem
};

function App() {
  // Config State
  const [selectedProblemId, setSelectedProblemId] = useState(NQueensProblem.id);
  const [algorithm, setAlgorithm] = useState('hillClimbing');

  // Params - merged generic and problem specific
  // We'll store them in a single object for now, or separate
  const [problemParams, setProblemParams] = useState(NQueensProblem.defaultParams);

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
    elitism: true
  });
  const [speed, setSpeed] = useState(100); // ms delay

  // Execution State
  const [currentState, setCurrentState] = useState(null);
  const [population, setPopulation] = useState(null); // Full population for GA
  const [history, setHistory] = useState([]); // Array of costs
  const [stepCount, setStepCount] = useState(0);
  const [evaluations, setEvaluations] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isFinished, setIsFinished] = useState(false);
  const [algoNote, setAlgoNote] = useState('');

  // Refs
  const iteratorRef = useRef(null);
  const timerRef = useRef(null);

  const currentProblem = PROBLEM_REGISTRY[selectedProblemId];

  // Initialize
  const initialize = useCallback(() => {
    // Stop any running
    stop();
    // Create initial state using problem factory
    const initial = currentProblem.randomState(problemParams);
    setCurrentState(initial);
    setHistory([initial.cost]);
    setStepCount(0);
    setEvaluations(0);
    setAlgoNote('Ready');
    setIsFinished(false);
    setPopulation(null); // Clear population
    iteratorRef.current = null;
  }, [currentProblem, problemParams]);

  // Handle Params Change or Reset
  useEffect(() => {
    initialize();
  }, [initialize]);

  const startAlgorithm = () => {
    if (!iteratorRef.current) {
      // Create generator
      let gen;
      // Merge params
      const fullParams = { ...algoParams, ...problemParams };

      if (algorithm === 'geneticAlgorithm') {
        // GA creates its own population but we pass just params AND problem instance
        gen = Algorithms[algorithm](null, fullParams, currentProblem);
      } else {
        gen = Algorithms[algorithm](currentState, fullParams);
      }
      iteratorRef.current = gen;
    }
  };

  const step = useCallback(() => {
    if (!iteratorRef.current) {
      startAlgorithm();
    }

    const result = iteratorRef.current.next();

    if (result.done) {
      setIsPlaying(false);
      setIsFinished(true);
      setAlgoNote('Finished');
      return;
    }

    const { state, population, note, populationStats, restartCount, evaluations } = result.value;
    console.log('Step result:', { note, evaluations, restartCount }); // Debug log
    setCurrentState(state);
    // We could store population in state if we want to visualize it
    // For now, let's just keep 'state' as the best, but maybe pass population to a new view

    // Hack: We can temporarily attach population to the state object or separate state
    // Let's separate state
    setPopulation(population);

    let detailedNote = note;
    if (populationStats) {
      detailedNote = `${note} | Pop: ${populationStats.size} | Avg: ${populationStats.avgCost} `;
    } else if (restartCount !== undefined && restartCount > 0) {
      detailedNote = `${note} (Restart #${restartCount})`;
    }

    setAlgoNote(detailedNote);
    if (evaluations !== undefined) setEvaluations(evaluations);

    setHistory(prev => [...prev, state.cost]);
    setStepCount(prev => prev + 1);


    // Auto-stop if solution found (cost 0)
    if (state.cost === 0) {
      setIsPlaying(false);
      setIsFinished(true);
    }
  }, [algorithm, algoParams, problemParams, currentState, currentProblem]); // Dependencies here are a bit tricky with ref, but safer to include

  const togglePlay = () => {
    if (isPlaying) {
      setIsPlaying(false);
    } else {
      setIsPlaying(true);
    }
  };

  useEffect(() => {
    if (isPlaying) {
      timerRef.current = setInterval(step, speed);
    } else {
      clearInterval(timerRef.current);
    }
    return () => clearInterval(timerRef.current);
  }, [isPlaying, step, speed]);

  const reset = () => {
    setIsPlaying(false);
    initialize();
  };

  return (
    <div className="flex h-screen w-full bg-slate-900 text-slate-100 overflow-hidden font-sans">
      {/* Sidebar */}
      <div className="w-80 flex-shrink-0 border-r border-slate-800 h-full p-4">
        <Controls
          algorithm={algorithm}
          setAlgorithm={setAlgorithm}

          problemId={selectedProblemId}
          setProblemId={setSelectedProblemId}
          problemParams={problemParams}
          setProblemParams={setProblemParams}

          algoParams={algoParams}
          setAlgoParams={setAlgoParams}

          isPlaying={isPlaying}
          isFinished={isFinished}
          onPlayPause={togglePlay}
          onStep={step} // Manual step
          onReset={reset}
          speed={speed}
          setSpeed={setSpeed}
        />
      </div>

      {/* Main Content */}
      <div className="flex-grow flex flex-col h-full bg-slate-950">
        {/* Header/Stats Bar */}
        <div className="h-16 border-b border-slate-800 flex items-center justify-between px-6 bg-slate-900">
          <h1 className="text-xl font-bold">N-Queens Visualization</h1>
          <div className="text-slate-400 text-sm font-mono bg-slate-800 px-3 py-1 rounded">
            Note: {algoNote}
          </div>
          <div className="text-sm font-medium">
            Cost: <span className={currentState?.cost === 0 ? "text-green-400" : "text-red-400"}>
              {currentState?.cost ?? '-'}
            </span>
          </div>
        </div>

        {/* Workspace */}
        <div className="flex-grow flex p-6 gap-6 overflow-hidden">
          {/* Board Area - Conditional Render */}
          <div className="flex-grow flex items-center justify-center bg-slate-900/50 rounded-xl border border-slate-800 overflow-hidden relative">
            {population ? (
              <div className="absolute inset-0 w-full h-full">
                <PopulationGrid population={population} />
              </div>
            ) : (
              currentState && <Board state={currentState} />
            )}
          </div>

          {/* Right Panel (Graph/Stats) */}
          <div className="w-96 flex-shrink-0 flex flex-col gap-4">
            <StatsPanel
              history={history}
              currentCost={currentState?.cost}
              bestCost={Math.min(...history)}
              stepCount={stepCount}
              evaluations={evaluations}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;
