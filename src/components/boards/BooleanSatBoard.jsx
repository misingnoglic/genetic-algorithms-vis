import React, { useState, useRef, useEffect, useMemo } from 'react';
import * as d3 from 'd3';

function extractEdges(ast) {
    if (!ast) return [];
    
    // Get top-level AND clauses
    function getClauses(node) {
        if (!node) return [];
        if (node.type === 'AND') {
            return [...getClauses(node.left), ...getClauses(node.right)];
        }
        return [node];
    }
    
    const clauses = getClauses(ast);
    const edgeSet = new Set();
    const edges = [];
    
    for (const c of clauses) {
        // Collect all variables in this clause
        function getVars(node) {
            if (!node) return [];
            if (node.type === 'VAR') return [node.value];
            if (node.type === 'NOT') return getVars(node.left);
            if (node.type === 'AND' || node.type === 'OR') {
                return [...getVars(node.left), ...getVars(node.right)];
            }
            return [];
        }
        const vars = Array.from(new Set(getVars(c)));
        
        // Add cliques
        for (let i = 0; i < vars.length; i++) {
            for (let j = i + 1; j < vars.length; j++) {
                const u = vars[i];
                const v = vars[j];
                const key = u < v ? `${u}-${v}` : `${v}-${u}`;
                if (!edgeSet.has(key)) {
                    edgeSet.add(key);
                    edges.push([u, v]);
                }
            }
        }
    }
    
    return edges;
}

const SATGraphView = ({ state, width, height }) => {
    const svgRef = useRef(null);
    const { variables, assignments, ast, domains } = state;
    
    const edges = useMemo(() => extractEdges(ast), [ast]);
    
    // Generate static circular positions
    const positions = useMemo(() => {
        const pos = {};
        const n = variables.length;
        const cx = width / 2;
        const cy = height / 2;
        const radius = Math.min(width, height) / 2 * 0.75;
        
        variables.forEach((v, i) => {
            const angle = (2 * Math.PI * i) / n;
            pos[v] = {
                x: cx + radius * Math.cos(angle),
                y: cy + radius * Math.sin(angle)
            };
        });
        return pos;
    }, [variables, width, height]);
    
    useEffect(() => {
        if (!svgRef.current || !state) return;
        
        const svg = d3.select(svgRef.current);
        svg.selectAll('*').remove();
        
        const g = svg.append('g');
        const nodeRadius = 16;
        
        // Draw edges
        edges.forEach(([u, v]) => {
            const p1 = positions[u];
            const p2 = positions[v];
            if (!p1 || !p2) return;
            
            g.append('line')
                .attr('x1', p1.x).attr('y1', p1.y)
                .attr('x2', p2.x).attr('y2', p2.y)
                .attr('stroke', '#475569')
                .attr('stroke-width', 2)
                .attr('opacity', 0.6);
        });
        
        // Draw nodes
        variables.forEach((v) => {
            const pos = positions[v];
            if (!pos) return;
            
            const val = assignments[v];
            let fill = '#374151'; // Unassigned (slate-700)
            if (val === true) fill = '#22c55e'; // Green
            if (val === false) fill = '#ef4444'; // Red
            
            g.append('circle')
                .attr('cx', pos.x)
                .attr('cy', pos.y)
                .attr('r', nodeRadius)
                .attr('fill', fill)
                .attr('stroke', '#e2e8f0')
                .attr('stroke-width', 2);
                
            // Domain visualization
            if (val === null || val === undefined) {
               const d = domains && domains[v];
               if (d && d.length > 0) {
                   const dotSize = 5;
                   const startX = pos.x - (d.length * (dotSize + 2)) / 2;
                   d.forEach((c, di) => {
                       g.append('circle')
                           .attr('cx', startX + di * (dotSize + 2) + dotSize / 2)
                           .attr('cy', pos.y + nodeRadius + 8)
                           .attr('r', dotSize / 2)
                           .attr('fill', c === true ? '#22c55e' : '#ef4444')
                           .attr('stroke', '#000')
                           .attr('stroke-width', 0.5);
                   });
               }
            }

            // Label
            g.append('text')
                .attr('x', pos.x)
                .attr('y', pos.y)
                .attr('text-anchor', 'middle')
                .attr('dominant-baseline', 'central')
                .attr('fill', '#fff')
                .attr('font-size', '12px')
                .attr('font-weight', 'bold')
                .attr('font-family', 'monospace')
                .text(v);
        });
        
    }, [state, width, height, edges, positions]);
    
    return <svg ref={svgRef} width={width} height={height} style={{ background: 'transparent' }} />;
};

const BooleanSatBoard = ({ state }) => {
    const [viewMode, setViewMode] = useState('expression');
    const containerRef = useRef(null);
    const [dims, setDims] = useState({ width: 600, height: 400 });

    useEffect(() => {
        if (!containerRef.current) return;
        const obs = new ResizeObserver(entries => {
            const { width, height } = entries[0].contentRect;
            setDims({ width: Math.max(200, width), height: Math.max(200, height) });
        });
        obs.observe(containerRef.current);
        return () => obs.disconnect();
    }, []);

    if (!state || !state.variables) return <div className="text-slate-400 p-8">Initializing...</div>;

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

            {/* Expression/Graph Panel */}
            <div className="bg-slate-800 rounded flex-grow p-6 flex flex-col shadow border border-slate-700 relative overflow-hidden">
                <div className="flex justify-between items-center mb-4 border-b border-slate-700 pb-2">
                    <h3 className="text-slate-300 font-bold uppercase text-xs tracking-wider">Evaluation View</h3>
                    <div className="flex gap-2">
                        <button 
                            onClick={() => setViewMode('expression')}
                            className={`px-3 py-1 text-xs rounded font-bold transition-colors ${viewMode === 'expression' ? 'bg-blue-600 text-white' : 'bg-slate-700 text-slate-400 hover:bg-slate-600'}`}>
                            Expression
                        </button>
                        <button 
                            onClick={() => setViewMode('graph')}
                            className={`px-3 py-1 text-xs rounded font-bold transition-colors ${viewMode === 'graph' ? 'bg-purple-600 text-white' : 'bg-slate-700 text-slate-400 hover:bg-slate-600'}`}>
                            Constraint Graph
                        </button>
                    </div>
                </div>
                
                <div ref={containerRef} className="flex-grow flex items-center justify-center bg-slate-900 rounded border border-slate-700 p-8 overflow-auto h-0">
                    {viewMode === 'expression' ? (
                        <div className="text-2xl font-mono leading-loose flex flex-wrap justify-center font-medium max-w-full">
                            {ast ? renderAST(ast, 'root') : <span className="text-slate-500">No expression parsed.</span>}
                        </div>
                    ) : (
                        <SATGraphView state={state} width={dims.width} height={dims.height} />
                    )}
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
