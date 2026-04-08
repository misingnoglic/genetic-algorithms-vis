import React from 'react';

const BooleanSatBoard = ({ state }) => {
    if (!state || !state.variables) return <div className="text-slate-400">Initializing...</div>;

    const { variables, assignments, ast } = state;

    // Helper to format nodes
    const renderAST = (node, keyPrefix) => {
        if (!node) return null;

        if (node.type === 'VAR') {
            const val = assignments[node.value];
            let color = 'text-slate-400';
            if (val === true) color = 'text-green-400 font-bold';
            if (val === false) color = 'text-red-400 font-bold';
            
            return (
                <span key={`${keyPrefix}-var`} className={`px-1 inline-block rounded bg-slate-800 ${color}`}>
                    {node.value}
                </span>
            );
        }

        if (node.type === 'NOT') {
            return (
                <span key={`${keyPrefix}-not`} className="inline items-center">
                    <span className="text-purple-400 mr-0.5">~</span>
                    {renderAST(node.left, `${keyPrefix}-nl`)}
                </span>
            );
        }

        if (node.type === 'AND' || node.type === 'OR') {
            const opColor = node.type === 'AND' ? 'text-blue-400' : 'text-amber-400';
            const opSymbol = node.type === 'AND' ? '^' : 'v';
            
            return (
                <span key={`${keyPrefix}-binary`} className="inline">
                    <span className="text-slate-500">(</span>
                    {renderAST(node.left, `${keyPrefix}-bl`)}
                    <span className={`font-bold mx-1 ${opColor}`}>{opSymbol}</span>
                    {renderAST(node.right, `${keyPrefix}-br`)}
                    <span className="text-slate-500">)</span>
                </span>
            );
        }

        return null;
    };

    return (
        <div className="flex flex-col h-full w-full max-w-4xl max-h-full">
            {/* Variables Panel */}
            <div className="bg-slate-800 rounded p-4 mb-4 shadow text-sm border border-slate-700">
                <h3 className="text-slate-300 font-bold mb-3 uppercase text-xs tracking-wider border-b border-slate-700 pb-2">Variables ({variables.length})</h3>
                <div className="flex flex-wrap gap-2 max-h-48 overflow-y-auto pr-2 pb-2">
                    {variables.map(v => {
                        const val = assignments[v];
                        const d = state.domains && state.domains[v];
                        return (
                            <div key={v} className="flex flex-col gap-1 bg-slate-900 px-3 py-1.5 rounded border border-slate-700 w-36">
                                <div className="flex justify-between items-center">
                                    <span className="font-mono text-slate-300 w-6 font-bold">{v}</span>
                                    <span className="text-slate-500 text-xs uppercase">
                                        {val === true ? <span className="text-green-400 bg-green-400/10 px-2 py-0.5 rounded">True</span> : 
                                        (val === false ? <span className="text-red-400 bg-red-400/10 px-2 py-0.5 rounded">False</span> : 
                                        <span className="text-slate-500">Null</span>)}
                                    </span>
                                </div>
                                {d && (
                                    <div className="flex justify-end gap-1 mt-1 text-[10px] font-mono">
                                        <span className={`px-1.5 rounded ${d.includes(true) ? 'bg-green-900/40 text-green-400 border border-green-800' : 'bg-slate-800 text-slate-600 border border-slate-700'}`}>T</span>
                                        <span className={`px-1.5 rounded ${d.includes(false) ? 'bg-red-900/40 text-red-400 border border-red-800' : 'bg-slate-800 text-slate-600 border border-slate-700'}`}>F</span>
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Expression Panel */}
            <div className="bg-slate-800 rounded flex-grow p-6 flex flex-col shadow border border-slate-700 relative overflow-hidden">
                <h3 className="text-slate-300 font-bold mb-4 uppercase text-xs tracking-wider border-b border-slate-700 pb-2">Evaluated Expression</h3>
                
                <div className="flex-grow flex items-center justify-center bg-slate-900 rounded border border-slate-700 p-8 overflow-auto">
                    <div className="text-2xl font-mono leading-loose flex flex-wrap justify-center font-medium max-w-full">
                        {ast ? renderAST(ast, 'root') : <span className="text-slate-500">No expression parsed.</span>}
                    </div>
                </div>
                
                {/* Status Indicator */}
                <div className="absolute bottom-4 right-4 bg-slate-900 px-4 py-2 border border-slate-700 rounded-lg flex items-center gap-3 shadow-lg">
                    <span className="text-slate-400 text-xs font-bold uppercase">Status</span>
                    {state.isPartial ? (
                        <div className="flex items-center gap-2">
                            <span className="h-2 w-2 rounded-full bg-slate-500 animate-pulse"></span>
                            <span className="text-slate-300 text-sm font-bold">Incomplete</span>
                        </div>
                    ) : (
                        state.cost === 0 ? (
                            <div className="flex items-center gap-2">
                                <span className="h-2 w-2 rounded-full bg-green-500 shadow-[0_0_8px_theme(colors.green.500)]"></span>
                                <span className="text-green-400 text-sm font-bold tracking-wider">Satisfied</span>
                            </div>
                        ) : (
                            <div className="flex items-center gap-2">
                                <span className="h-2 w-2 rounded-full bg-red-500"></span>
                                <span className="text-red-400 text-sm font-bold tracking-wider">Unsatisfied</span>
                            </div>
                        )
                    )}
                </div>
            </div>
            <div className="mt-2 text-center text-slate-500 text-[10px] font-mono">
                Cost represents number of failed AND sub-clauses plus penalties. Current cost: {state.cost != null ? state.cost : 0}
            </div>
        </div>
    );
};

export default BooleanSatBoard;
