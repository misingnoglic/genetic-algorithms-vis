import React, { useRef, useEffect, useState, useMemo } from 'react';
import * as d3 from 'd3';
import { COLOR_PALETTE } from '../../core/problems/map-coloring.js';

// Unassigned color
const UNASSIGNED_COLOR = '#374151'; // slate-700

// Filter out non-contiguous states from US GeoJSON
const NON_CONTIGUOUS = ['Alaska', 'Hawaii', 'Puerto Rico'];

// Cache for loaded GeoJSON data
const geoCache = {};

async function loadGeoJSON(type) {
    if (geoCache[type]) return geoCache[type];

    let url;
    if (type === 'us') {
        url = '/data/us-states.geojson';
    } else if (type === 'australia') {
        url = '/data/australia-states.geojson';
    }
    if (!url) return null;

    try {
        const resp = await fetch(url);
        const data = await resp.json();
        geoCache[type] = data;
        return data;
    } catch (e) {
        console.error('Failed to load GeoJSON:', e);
        return null;
    }
}

// ============================================================
// GeoMap sub-component (US or Australia)
// ============================================================
const GeoMap = ({ state, graphType, width, height, small }) => {
    const svgRef = useRef(null);
    const [geoData, setGeoData] = useState(geoCache[graphType] || null);

    useEffect(() => {
        // Always load the correct GeoJSON for the current graphType
        const cached = geoCache[graphType];
        if (cached) {
            setGeoData(cached);
        } else {
            loadGeoJSON(graphType).then(d => { if (d) setGeoData(d); });
        }
    }, [graphType]);

    useEffect(() => {
        if (!svgRef.current || !geoData || !state) return;

        const svg = d3.select(svgRef.current);
        svg.selectAll('*').remove();

        let features = geoData.features;

        // Filter non-contiguous for US
        if (graphType === 'us') {
            features = features.filter(f => !NON_CONTIGUOUS.includes(f.properties.name));
        }

        // Build name -> index mapping from graph
        const nameToIdx = state.graph.nameToIdx;

        // Create projection — use geoMercator for both us and australia
        // (geoAlbersUsa composite clips most states to NaN with fitSize)
        const projection = d3.geoMercator()
            .fitSize([width - 20, height - 20], { type: 'FeatureCollection', features });

        const path = d3.geoPath().projection(projection);

        // Get name key for features
        const getFeatureName = (f) => {
            if (graphType === 'australia') return f.properties.STATE_NAME;
            return f.properties.name;
        };

        // Draw paths
        const g = svg.append('g').attr('transform', 'translate(10, 10)');

        g.selectAll('path')
            .data(features)
            .enter()
            .append('path')
            .attr('d', d => {
                const p = path(d);
                return p || ''; // Guard against null paths
            })
            .attr('fill', d => {
                const name = getFeatureName(d);
                const idx = nameToIdx[name];
                if (idx === undefined) return UNASSIGNED_COLOR;
                const color = state.assignments[idx];
                if (color === null || color === undefined) return UNASSIGNED_COLOR;
                return COLOR_PALETTE[color % COLOR_PALETTE.length];
            })
            .attr('stroke', '#1e293b')
            .attr('stroke-width', small ? 0.5 : 1.5)
            .attr('cursor', 'default');

        // State labels (only in non-small mode)
        if (!small && graphType === 'us') {
            g.selectAll('text')
                .data(features.filter(d => {
                    const c = path.centroid(d);
                    return c && !isNaN(c[0]) && !isNaN(c[1]);
                }))
                .enter()
                .append('text')
                .attr('x', d => path.centroid(d)[0])
                .attr('y', d => path.centroid(d)[1])
                .attr('text-anchor', 'middle')
                .attr('dominant-baseline', 'central')
                .attr('fill', '#fff')
                .attr('font-size', '7px')
                .attr('font-weight', 'bold')
                .attr('pointer-events', 'none')
                .attr('opacity', 0.8)
                .text(d => {
                    // Show 2-letter abbreviation derived from name
                    const name = getFeatureName(d);
                    const idx = nameToIdx[name];
                    if (idx === undefined) return '';
                    return name.length <= 4 ? name : name.slice(0, 2).toUpperCase();
                });
        }

        // Domain visualization for CSP (unassigned nodes)
        if (!small && state.domains) {
            features.forEach(feature => {
                const name = getFeatureName(feature);
                const idx = nameToIdx[name];
                if (idx === undefined) return;
                if (state.assignments[idx] !== null && state.assignments[idx] !== undefined) return;

                const centroid = path.centroid(feature);
                if (!centroid || isNaN(centroid[0])) return;

                const domain = state.domains[idx];
                if (!domain || domain.length === 0) return;

                const dotSize = 4;
                const startX = centroid[0] - (domain.length * dotSize) / 2;

                domain.forEach((c, di) => {
                    g.append('circle')
                        .attr('cx', startX + di * (dotSize + 2) + dotSize / 2)
                        .attr('cy', centroid[1] + 8)
                        .attr('r', dotSize / 2)
                        .attr('fill', COLOR_PALETTE[c % COLOR_PALETTE.length])
                        .attr('stroke', '#000')
                        .attr('stroke-width', 0.5);
                });
            });
        }

    }, [state, geoData, graphType, width, height, small]);

    return (
        <svg ref={svgRef} width={width} height={height}
            style={{ background: 'transparent' }} />
    );
};

// ============================================================
// Random Graph sub-component
// ============================================================
const GraphView = ({ state, width, height, small }) => {
    const svgRef = useRef(null);

    useEffect(() => {
        if (!svgRef.current || !state) return;

        const svg = d3.select(svgRef.current);
        svg.selectAll('*').remove();

        const graph = state.graph;
        const positions = graph.positions;
        const g = svg.append('g');

        // Compute bounds of positions and scale to fit
        const posArr = Object.values(positions || {});
        if (posArr.length === 0) return;

        const xs = posArr.map(p => p.x);
        const ys = posArr.map(p => p.y);
        const minX = Math.min(...xs), maxX = Math.max(...xs);
        const minY = Math.min(...ys), maxY = Math.max(...ys);

        const pad = small ? 15 : 40;
        const scaleX = (width - 2 * pad) / (maxX - minX || 1);
        const scaleY = (height - 2 * pad) / (maxY - minY || 1);
        const scale = Math.min(scaleX, scaleY);

        const cx = width / 2;
        const cy = height / 2;
        const dataCx = (minX + maxX) / 2;
        const dataCy = (minY + maxY) / 2;

        const tx = (x) => cx + (x - dataCx) * scale;
        const ty = (y) => cy + (y - dataCy) * scale;

        const nodeRadius = small ? 6 : 16;

        // Draw edges
        for (const [i, j] of graph.edges) {
            const p1 = positions[graph.names[i]];
            const p2 = positions[graph.names[j]];
            if (!p1 || !p2) continue;

            const ci = state.assignments[i];
            const cj = state.assignments[j];
            const isViolation = ci !== null && ci !== undefined &&
                cj !== null && cj !== undefined && ci === cj;

            g.append('line')
                .attr('x1', tx(p1.x)).attr('y1', ty(p1.y))
                .attr('x2', tx(p2.x)).attr('y2', ty(p2.y))
                .attr('stroke', isViolation ? '#ef4444' : '#475569')
                .attr('stroke-width', isViolation ? 2.5 : 1.5)
                .attr('opacity', isViolation ? 1 : 0.6);
        }

        // Draw nodes
        for (let i = 0; i < graph.nodeCount; i++) {
            const pos = positions[graph.names[i]];
            if (!pos) continue;

            const color = state.assignments[i];
            const fill = (color === null || color === undefined)
                ? UNASSIGNED_COLOR
                : COLOR_PALETTE[color % COLOR_PALETTE.length];

            g.append('circle')
                .attr('cx', tx(pos.x))
                .attr('cy', ty(pos.y))
                .attr('r', nodeRadius)
                .attr('fill', fill)
                .attr('stroke', '#e2e8f0')
                .attr('stroke-width', small ? 1 : 2);

            // Label
            if (!small) {
                g.append('text')
                    .attr('x', tx(pos.x))
                    .attr('y', ty(pos.y))
                    .attr('text-anchor', 'middle')
                    .attr('dominant-baseline', 'central')
                    .attr('fill', '#fff')
                    .attr('font-size', '10px')
                    .attr('font-weight', 'bold')
                    .text(graph.names[i]);
            }

            // Domain visualization for CSP
            if (!small && state.domains &&
                (color === null || color === undefined)) {
                const domain = state.domains[i];
                if (domain && domain.length > 0) {
                    const dotSize = 5;
                    const startX = tx(pos.x) - (domain.length * (dotSize + 1)) / 2;
                    domain.forEach((c, di) => {
                        g.append('circle')
                            .attr('cx', startX + di * (dotSize + 1) + dotSize / 2)
                            .attr('cy', ty(pos.y) + nodeRadius + 8)
                            .attr('r', dotSize / 2)
                            .attr('fill', COLOR_PALETTE[c % COLOR_PALETTE.length])
                            .attr('stroke', '#000')
                            .attr('stroke-width', 0.5);
                    });
                }
            }
        }
    }, [state, width, height, small]);

    return (
        <svg ref={svgRef} width={width} height={height}
            style={{ background: 'transparent' }} />
    );
};

// ============================================================
// Main MapColoringBoard
// ============================================================
const MapColoringBoard = ({ state, small = false }) => {
    const containerRef = useRef(null);
    const [dims, setDims] = useState({ width: 600, height: 400 });

    useEffect(() => {
        if (small || !containerRef.current) return;
        const obs = new ResizeObserver(entries => {
            const { width, height } = entries[0].contentRect;
            setDims({ width: Math.max(200, width), height: Math.max(200, height) });
        });
        obs.observe(containerRef.current);
        return () => obs.disconnect();
    }, [small]);

    if (!state) return null;
    if (!state.graph) return null; // Guard: not a MapColoringState yet

    const width = small ? 120 : dims.width;
    const height = small ? 80 : dims.height;
    const graphType = state.graphType || 'random';

    const content = (graphType === 'us' || graphType === 'australia')
        ? <GeoMap state={state} graphType={graphType} width={width} height={height} small={small} />
        : <GraphView state={state} width={width} height={height} small={small} />;

    if (small) {
        return content;
    }

    return (
        <div ref={containerRef} className="w-full h-full flex items-center justify-center">
            {content}
        </div>
    );
};

export default MapColoringBoard;
