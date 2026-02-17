import React, { useRef, useEffect, useState } from 'react';
import * as d3 from 'd3';
import { TETRIS_COLORS as COLORS, TETRIS_SHAPES as SHAPES } from '../../core/constants.js';

const TetrisBoard = ({ state, small = false }) => {
    const containerRef = useRef(null);
    const svgRef = useRef(null);
    const [dims, setDims] = useState({ width: 300, height: 600 });

    // Resize observer
    useEffect(() => {
        if (small || !containerRef.current) return;
        const obs = new ResizeObserver(entries => {
            const { width, height } = entries[0].contentRect;
            setDims({ width, height });
        });
        obs.observe(containerRef.current);
        return () => obs.disconnect();
    }, [small]);

    // Draw
    useEffect(() => {
        if (!svgRef.current || !state || !state.grid) return;

        const svg = d3.select(svgRef.current);
        svg.selectAll('*').remove();

        const grid = state.grid; // 2D array [y][x]
        const width = state.gridWidth;
        // Height is dynamic. Let's ensure we show at least 20 rows, or max(20, grid.length + 5) for buffer.
        const height = Math.max(20, grid.length + 4);

        const pad = small ? 2 : 10;
        const availWidth = (small ? 100 : dims.width) - 2 * pad;
        const availHeight = (small ? 200 : dims.height) - 2 * pad;

        // Calculate cell size based on aspect ratio
        const cellW = availWidth / width;
        const cellH = availHeight / height;
        const cellSize = Math.min(cellW, cellH);

        // Center the grid
        const boardW = cellSize * width;
        const boardH = cellSize * height;
        const startX = (small ? 100 : dims.width) / 2 - boardW / 2;
        const startY = (small ? 200 : dims.height) - pad - boardH; // Align bottom? Or top? 
        // Tetris usually aligns bottom, but our grid array 0 is bottom?
        // In _buildGrid, py starts from 0 (bottom) and goes up.
        // So row 0 is bottom.
        // SVG y=0 is top. So row y should be drawn at boardH - (y+1)*cellSize.

        const g = svg.append('g').attr('transform', `translate(${startX}, ${startY + boardH})`);

        // Draw Grid Background
        g.append('rect')
            .attr('x', 0)
            .attr('y', -boardH)
            .attr('width', boardW)
            .attr('height', boardH)
            .attr('fill', '#1e293b')
            .attr('stroke', '#334155')
            .attr('stroke-width', 2);

        // Grid Lines (Optional)
        // Draw Cells
        for (let y = 0; y < grid.length; y++) {
            if (!grid[y]) continue;
            for (let x = 0; x < width; x++) {
                const type = grid[y][x];
                if (type) {
                    const color = COLORS[type];
                    g.append('rect')
                        .attr('x', x * cellSize)
                        .attr('y', -(y + 1) * cellSize)
                        .attr('width', cellSize - 1)
                        .attr('height', cellSize - 1)
                        .attr('fill', color)
                        .attr('stroke', 'rgba(0,0,0,0.2)')
                        .attr('stroke-width', 1)
                        .attr('rx', 2);
                }
            }
        }

        // Draw "Skyline" or Capacity line?
        // Maybe draw the current max height line
        /*
        const maxY = grid.length * cellSize;
        g.append('line')
            .attr('x1', -5)
            .attr('x2', boardW + 5)
            .attr('y1', -maxY)
            .attr('y2', -maxY)
            .attr('stroke', '#ef4444')
            .attr('stroke-width', 2)
            .attr('stroke-dasharray', '4');
        */

    }, [state, dims, small]);

    const w = small ? 100 : dims.width;
    const h = small ? 200 : dims.height;

    if (small) {
        return <svg ref={svgRef} width={w} height={h} style={{ background: 'transparent' }} />;
    }

    return (
        <div className="w-full h-full flex gap-4 p-4">
            <div ref={containerRef} className="flex-grow flex items-center justify-center min-w-0 min-h-0 relative">
                <svg ref={svgRef} width={w} height={h} style={{ background: 'transparent' }} />
            </div>
        </div>
    );
};

export default TetrisBoard;
