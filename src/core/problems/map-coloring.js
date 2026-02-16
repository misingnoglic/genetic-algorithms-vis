// Map Coloring Problem Implementation
// CSP: Variables = regions, Domains = colors, Constraints = adjacent regions differ

// ============================================================
// Color Palette
// ============================================================
export const COLOR_PALETTE = [
    '#ef4444', // red
    '#3b82f6', // blue
    '#22c55e', // green
    '#eab308', // yellow
    '#a855f7', // purple
    '#f97316', // orange
    '#06b6d4', // cyan
    '#ec4899', // pink
];

// ============================================================
// Australia Graph (7 states/territories, matching AIMA textbook)
// ============================================================
const AUSTRALIA_ADJACENCY = {
    'Western Australia': ['Northern Territory', 'South Australia'],
    'Northern Territory': ['Western Australia', 'South Australia', 'Queensland'],
    'South Australia': ['Western Australia', 'Northern Territory', 'Queensland', 'New South Wales', 'Victoria'],
    'Queensland': ['Northern Territory', 'South Australia', 'New South Wales'],
    'New South Wales': ['Queensland', 'South Australia', 'Victoria'],
    'Victoria': ['South Australia', 'New South Wales'],
    'Tasmania': [],
};

// ============================================================
// US States Graph (contiguous 48 + DC)
// ============================================================
const US_ADJACENCY = {
    'Alabama': ['Mississippi', 'Tennessee', 'Georgia', 'Florida'],
    'Arizona': ['California', 'Nevada', 'Utah', 'Colorado', 'New Mexico'],
    'Arkansas': ['Missouri', 'Tennessee', 'Mississippi', 'Louisiana', 'Texas', 'Oklahoma'],
    'California': ['Oregon', 'Nevada', 'Arizona'],
    'Colorado': ['Wyoming', 'Nebraska', 'Kansas', 'Oklahoma', 'New Mexico', 'Arizona', 'Utah'],
    'Connecticut': ['New York', 'Massachusetts', 'Rhode Island'],
    'Delaware': ['Maryland', 'Pennsylvania', 'New Jersey'],
    'District of Columbia': ['Maryland', 'Virginia'],
    'Florida': ['Alabama', 'Georgia'],
    'Georgia': ['Florida', 'Alabama', 'Tennessee', 'North Carolina', 'South Carolina'],
    'Idaho': ['Montana', 'Wyoming', 'Utah', 'Nevada', 'Oregon', 'Washington'],
    'Illinois': ['Indiana', 'Kentucky', 'Missouri', 'Iowa', 'Wisconsin'],
    'Indiana': ['Michigan', 'Ohio', 'Kentucky', 'Illinois'],
    'Iowa': ['Minnesota', 'Wisconsin', 'Illinois', 'Missouri', 'Nebraska', 'South Dakota'],
    'Kansas': ['Nebraska', 'Missouri', 'Oklahoma', 'Colorado'],
    'Kentucky': ['Indiana', 'Ohio', 'West Virginia', 'Virginia', 'Tennessee', 'Missouri', 'Illinois'],
    'Louisiana': ['Texas', 'Arkansas', 'Mississippi'],
    'Maine': ['New Hampshire'],
    'Maryland': ['Virginia', 'West Virginia', 'Pennsylvania', 'Delaware', 'District of Columbia'],
    'Massachusetts': ['Rhode Island', 'Connecticut', 'New York', 'New Hampshire', 'Vermont'],
    'Michigan': ['Wisconsin', 'Indiana', 'Ohio'],
    'Minnesota': ['Wisconsin', 'Iowa', 'South Dakota', 'North Dakota'],
    'Mississippi': ['Louisiana', 'Arkansas', 'Tennessee', 'Alabama'],
    'Missouri': ['Iowa', 'Illinois', 'Kentucky', 'Tennessee', 'Arkansas', 'Oklahoma', 'Kansas', 'Nebraska'],
    'Montana': ['North Dakota', 'South Dakota', 'Wyoming', 'Idaho'],
    'Nebraska': ['South Dakota', 'Iowa', 'Missouri', 'Kansas', 'Colorado', 'Wyoming'],
    'Nevada': ['Idaho', 'Utah', 'Arizona', 'California', 'Oregon'],
    'New Hampshire': ['Vermont', 'Maine', 'Massachusetts'],
    'New Jersey': ['Delaware', 'Pennsylvania', 'New York'],
    'New Mexico': ['Arizona', 'Utah', 'Colorado', 'Oklahoma', 'Texas'],
    'New York': ['New Jersey', 'Pennsylvania', 'Vermont', 'Massachusetts', 'Connecticut'],
    'North Carolina': ['Virginia', 'Tennessee', 'Georgia', 'South Carolina'],
    'North Dakota': ['Montana', 'South Dakota', 'Minnesota'],
    'Ohio': ['Michigan', 'Indiana', 'Kentucky', 'West Virginia', 'Pennsylvania'],
    'Oklahoma': ['Kansas', 'Missouri', 'Arkansas', 'Texas', 'New Mexico', 'Colorado'],
    'Oregon': ['Washington', 'Idaho', 'Nevada', 'California'],
    'Pennsylvania': ['New York', 'New Jersey', 'Delaware', 'Maryland', 'West Virginia', 'Ohio'],
    'Rhode Island': ['Connecticut', 'Massachusetts'],
    'South Carolina': ['Georgia', 'North Carolina'],
    'South Dakota': ['North Dakota', 'Minnesota', 'Iowa', 'Nebraska', 'Wyoming', 'Montana'],
    'Tennessee': ['Kentucky', 'Virginia', 'North Carolina', 'Georgia', 'Alabama', 'Mississippi', 'Arkansas', 'Missouri'],
    'Texas': ['New Mexico', 'Oklahoma', 'Arkansas', 'Louisiana'],
    'Utah': ['Idaho', 'Wyoming', 'Colorado', 'New Mexico', 'Arizona', 'Nevada'],
    'Vermont': ['New Hampshire', 'Massachusetts', 'New York'],
    'Virginia': ['West Virginia', 'Kentucky', 'Tennessee', 'North Carolina', 'Maryland', 'District of Columbia'],
    'Washington': ['Idaho', 'Oregon'],
    'West Virginia': ['Ohio', 'Pennsylvania', 'Maryland', 'Virginia', 'Kentucky'],
    'Wisconsin': ['Michigan', 'Minnesota', 'Iowa', 'Illinois'],
    'Wyoming': ['Montana', 'South Dakota', 'Nebraska', 'Colorado', 'Utah', 'Idaho'],
};

// ============================================================
// Random Graph Generator
// ============================================================
function generateRandomGraph(nodeCount) {
    const names = [];
    for (let i = 0; i < nodeCount; i++) {
        names.push(`R${i + 1}`);
    }

    // Generate positions for force-directed-like layout
    const positions = {};
    for (let i = 0; i < nodeCount; i++) {
        const angle = (2 * Math.PI * i) / nodeCount;
        const radius = 150 + Math.random() * 50;
        positions[names[i]] = {
            x: 250 + radius * Math.cos(angle),
            y: 250 + radius * Math.sin(angle)
        };
    }

    // Generate edges — each node gets 2-4 neighbors (proximity-based)
    const adjacency = {};
    names.forEach(n => { adjacency[n] = []; });

    // Sort by angle to create edges between nearby nodes
    for (let i = 0; i < nodeCount; i++) {
        // Connect to next 1-2 nodes in the ring
        const next1 = (i + 1) % nodeCount;
        if (!adjacency[names[i]].includes(names[next1])) {
            adjacency[names[i]].push(names[next1]);
            adjacency[names[next1]].push(names[i]);
        }

        // Random cross-links (add ~1 extra edge per node on average)
        if (Math.random() < 0.5) {
            const skip = 2 + Math.floor(Math.random() * Math.max(1, nodeCount / 3));
            const target = (i + skip) % nodeCount;
            if (target !== i && !adjacency[names[i]].includes(names[target])) {
                adjacency[names[i]].push(names[target]);
                adjacency[names[target]].push(names[i]);
            }
        }
    }

    return { names, adjacency, positions };
}

// ============================================================
// Build graph structure from adjacency map
// ============================================================
function buildGraph(adjacency) {
    const names = Object.keys(adjacency);
    const nameToIdx = {};
    names.forEach((n, i) => { nameToIdx[n] = i; });

    const edges = [];
    const adjList = names.map(() => []);

    for (const [node, neighbors] of Object.entries(adjacency)) {
        const i = nameToIdx[node];
        for (const neighbor of neighbors) {
            const j = nameToIdx[neighbor];
            if (j !== undefined && i < j) {
                edges.push([i, j]);
            }
            if (j !== undefined && !adjList[i].includes(j)) {
                adjList[i].push(j);
            }
        }
    }

    return { names, nameToIdx, edges, adjList, nodeCount: names.length };
}

// ============================================================
// MapColoringState
// ============================================================
export class MapColoringState {
    constructor(graph, numColors, assignments, domains = null) {
        this.graph = graph;          // { names, nameToIdx, edges, adjList, nodeCount }
        this.numColors = numColors;
        this.assignments = [...assignments]; // Array(nodeCount): color index (0..k-1) or null
        this.domains = domains;      // Array(nodeCount): array of valid color indices
        this.cachedCost = null;
        this.graphType = null;       // 'australia', 'us', 'random' — set externally for rendering
    }

    get placedCount() {
        let c = 0;
        for (let i = 0; i < this.graph.nodeCount; i++) {
            if (this.assignments[i] !== null && this.assignments[i] !== undefined) c++;
        }
        return c;
    }

    get isPartial() {
        return this.placedCount < this.graph.nodeCount;
    }

    // Cost = number of constraint violations (adjacent pairs with same color)
    get cost() {
        if (this.cachedCost !== null) return this.cachedCost;

        let violations = 0;
        for (const [i, j] of this.graph.edges) {
            const ci = this.assignments[i];
            const cj = this.assignments[j];
            if (ci !== null && ci !== undefined && cj !== null && cj !== undefined) {
                if (ci === cj) violations++;
            }
        }

        // Penalty for partial states
        if (this.isPartial) {
            violations += (this.graph.nodeCount - this.placedCount) * 1000;
        }

        this.cachedCost = violations;
        return violations;
    }

    // Neighbors: for each node, try every other color
    getNeighbors() {
        const neighbors = [];
        const n = this.graph.nodeCount;
        for (let i = 0; i < n; i++) {
            if (this.assignments[i] === null || this.assignments[i] === undefined) continue;
            const origColor = this.assignments[i];
            for (let c = 0; c < this.numColors; c++) {
                if (c === origColor) continue;
                const newAssign = [...this.assignments];
                newAssign[i] = c;
                const s = new MapColoringState(this.graph, this.numColors, newAssign);
                s.graphType = this.graphType;
                neighbors.push(s);
            }
        }
        return neighbors;
    }

    // Random Neighbor: pick random node, random different color
    getRandomNeighbor() {
        const n = this.graph.nodeCount;
        const node = Math.floor(Math.random() * n);
        const origColor = this.assignments[node];
        let newColor;
        do {
            newColor = Math.floor(Math.random() * this.numColors);
        } while (newColor === origColor && this.numColors > 1);

        const newAssign = [...this.assignments];
        newAssign[node] = newColor;
        const s = new MapColoringState(this.graph, this.numColors, newAssign);
        s.graphType = this.graphType;
        return s;
    }

    clone() {
        let newDomains = null;
        if (this.domains) {
            newDomains = this.domains.map(d => [...d]);
        }
        const s = new MapColoringState(this.graph, this.numColors, this.assignments, newDomains);
        s.graphType = this.graphType;
        return s;
    }

    toString() {
        return this.assignments.map(c => c === null ? '_' : c).join(',');
    }
}

// ============================================================
// MapColoringProblem
// ============================================================
export const MapColoringProblem = {
    id: 'map-coloring',
    name: 'Map Coloring',
    description: 'Color a map so no two adjacent regions share the same color.',

    defaultParams: {
        graphType: 'australia',
        numColors: 3,
        size: 8, // For random graph node count
    },

    supportsCSP: true,

    // Backtracking constraint check: are all assigned variables conflict-free?
    isPartiallyValid(state) {
        for (const [i, j] of state.graph.edges) {
            const ci = state.assignments[i];
            const cj = state.assignments[j];
            if (ci != null && cj != null && ci === cj) return false;
        }
        return true;
    },

    // Graph type label for Controls
    graphTypes: {
        australia: 'Australia',
        us: 'United States',
        random: 'Random Graph',
    },

    _buildGraphForType(params) {
        const type = params.graphType || 'australia';
        if (type === 'australia') {
            return { graph: buildGraph(AUSTRALIA_ADJACENCY), graphType: 'australia' };
        } else if (type === 'us') {
            return { graph: buildGraph(US_ADJACENCY), graphType: 'us' };
        } else {
            const nodeCount = params.size || 8;
            const { names, adjacency, positions } = generateRandomGraph(nodeCount);
            const graph = buildGraph(adjacency);
            graph.positions = positions;
            return { graph, graphType: 'random' };
        }
    },

    randomState(params) {
        // Use existing graph if passed in params (for benchmarks / restarts)
        let graph, graphType;
        if (params._graph) {
            graph = params._graph;
            graphType = params._graphType;
        } else {
            const result = this._buildGraphForType(params);
            graph = result.graph;
            graphType = result.graphType;
        }

        const numColors = params.numColors || 3;
        const assignments = [];
        for (let i = 0; i < graph.nodeCount; i++) {
            assignments.push(Math.floor(Math.random() * numColors));
        }
        const s = new MapColoringState(graph, numColors, assignments);
        s.graphType = graphType;
        return s;
    },

    emptyState(params) {
        let graph, graphType;
        if (params._graph) {
            graph = params._graph;
            graphType = params._graphType;
        } else {
            const result = this._buildGraphForType(params);
            graph = result.graph;
            graphType = result.graphType;
        }

        const numColors = params.numColors || 3;
        const assignments = Array(graph.nodeCount).fill(null);
        const s = new MapColoringState(graph, numColors, assignments);
        s.graphType = graphType;
        return s;
    },

    isSolution(state) {
        return !state.isPartial && state.cost === 0;
    },

    // GA: Crossover — uniform crossover
    crossover(parents, params) {
        const p1 = parents[0];
        const n = p1.graph.nodeCount;
        const childAssign = [];
        for (let i = 0; i < n; i++) {
            const p = parents[Math.floor(Math.random() * parents.length)];
            childAssign.push(p.assignments[i]);
        }
        const s = new MapColoringState(p1.graph, p1.numColors, childAssign);
        s.graphType = p1.graphType;
        return s;
    },

    // GA: Mutation — randomly re-color some nodes
    mutate(state, rate) {
        for (let i = 0; i < state.graph.nodeCount; i++) {
            if (Math.random() < rate) {
                state.assignments[i] = Math.floor(Math.random() * state.numColors);
                state.cachedCost = null;
            }
        }
    },

    estimatedOptimalCost() {
        return 0; // A valid coloring has 0 violations
    },

    formatCost(cost) {
        return (cost !== undefined && cost !== null) ? cost.toFixed(0) : '-';
    },

    getSearchSpace(params) {
        const type = params.graphType || 'australia';
        let n;
        if (type === 'australia') n = 7;
        else if (type === 'us') n = Object.keys(US_ADJACENCY).length;
        else n = params.size || 8;
        const k = params.numColors || 3;
        const log10Val = n * Math.log10(k);
        const exponent = Math.floor(log10Val);
        const mantissa = Math.pow(10, log10Val - exponent);
        return {
            formula: `${k}^${n}`,
            approx: exponent > 0 ? `${mantissa.toFixed(2)}e+${exponent}` : `${Math.pow(k, n)}`
        };
    },

    // Generic hook for preserving instance across restarts
    extractInstanceParams(state) {
        return {
            _graph: state.graph,
            _graphType: state.graphType,
        };
    },

    // ============================================================
    // CSP Interface
    // ============================================================
    initializeDomains(state) {
        const n = state.graph.nodeCount;
        const k = state.numColors;
        return Array.from({ length: n }, () =>
            Array.from({ length: k }, (_, i) => i)
        );
    },

    selectUnassignedVariable(state) {
        for (let i = 0; i < state.graph.nodeCount; i++) {
            if (state.assignments[i] === null || state.assignments[i] === undefined) return i;
        }
        return null;
    },

    getUnassignedVariables(state) {
        const result = [];
        for (let i = 0; i < state.graph.nodeCount; i++) {
            if (state.assignments[i] === null || state.assignments[i] === undefined) {
                result.push(i);
            }
        }
        return result;
    },

    getDomainSize(state, variable) {
        if (state.domains && state.domains[variable]) {
            return state.domains[variable].length;
        }
        return state.numColors;
    },

    getDomainValues(state, variable) {
        return state.domains[variable];
    },

    applyMove(state, variable, value, newDomains) {
        const newAssign = [...state.assignments];
        newAssign[variable] = value;
        const s = new MapColoringState(state.graph, state.numColors, newAssign, newDomains);
        s.graphType = state.graphType;
        return s;
    },

    // Forward Checking
    propagate(state, variable, value) {
        const n = state.graph.nodeCount;
        const nextDomains = state.domains.map(d => [...d]);
        nextDomains[variable] = [value];

        let possible = true;
        // Prune the color from all unassigned neighbors
        for (const neighbor of state.graph.adjList[variable]) {
            if (state.assignments[neighbor] !== null && state.assignments[neighbor] !== undefined) continue;
            nextDomains[neighbor] = nextDomains[neighbor].filter(c => c !== value);
            if (nextDomains[neighbor].length === 0) possible = false;
        }
        return { domains: nextDomains, success: possible };
    },

    // AC-3
    propagateAC3(state, variable, value) {
        const n = state.graph.nodeCount;
        const domains = state.domains.map(d => [...d]);
        domains[variable] = [value];

        // Initial prune
        const queue = [];
        for (const neighbor of state.graph.adjList[variable]) {
            if (state.assignments[neighbor] !== null && state.assignments[neighbor] !== undefined) continue;
            const before = domains[neighbor].length;
            domains[neighbor] = domains[neighbor].filter(c => c !== value);
            if (domains[neighbor].length === 0) return { domains, success: false };
            if (domains[neighbor].length < before) {
                // Add arcs (k, neighbor) for all k != variable and k != neighbor
                for (const k of state.graph.adjList[neighbor]) {
                    if (k !== variable && k !== neighbor) {
                        queue.push([k, neighbor]);
                    }
                }
            }
        }

        // Process queue
        while (queue.length > 0) {
            const [xi, xj] = queue.shift();
            if (this._revise(domains, xi, xj)) {
                if (domains[xi].length === 0) return { domains, success: false };
                for (const xk of state.graph.adjList[xi]) {
                    if (xk !== xi && xk !== xj) {
                        queue.push([xk, xi]);
                    }
                }
            }
        }

        return { domains, success: true };
    },

    _revise(domains, xi, xj) {
        let revised = false;
        const newDomain = domains[xi].filter(x => {
            return domains[xj].some(y => x !== y);
        });
        if (newDomain.length < domains[xi].length) {
            domains[xi] = newDomain;
            revised = true;
        }
        return revised;
    },

    // BFS/DFS successor generation
    getSuccessors(state) {
        // Find first unassigned
        let target = -1;
        for (let i = 0; i < state.graph.nodeCount; i++) {
            if (state.assignments[i] === null || state.assignments[i] === undefined) {
                target = i;
                break;
            }
        }
        if (target === -1) return [];

        const successors = [];
        const values = state.domains && state.domains[target]
            ? state.domains[target]
            : Array.from({ length: state.numColors }, (_, i) => i);

        for (const val of values) {
            const newAssign = [...state.assignments];
            newAssign[target] = val;

            let newDomains = null;
            if (state.domains) {
                newDomains = state.domains.map(d => [...d]);
                newDomains[target] = [val];
            }

            const s = new MapColoringState(state.graph, state.numColors, newAssign, newDomains);
            s.graphType = state.graphType;
            successors.push(s);
        }
        return successors;
    },
};
