export class ASTNode {
    constructor(type, left = null, right = null, value = null) {
        this.type = type; // 'AND', 'OR', 'NOT', 'VAR'
        this.left = left;
        this.right = right;
        this.value = value; // variable name if type === 'VAR'
    }
}

export function tokenize(str) {
    const tokens = [];
    let i = 0;
    while (i < str.length) {
        let char = str[i];
        if (/\s/.test(char)) { i++; continue; }
        if (char === '&' && str[i + 1] === '&') { tokens.push('^'); i += 2; }
        else if (char === '|' && str[i + 1] === '|') { tokens.push('v'); i += 2; }
        else if (['^', 'v', '~', '!', '(', ')'].includes(char)) {
            if (char === '&') tokens.push('^');
            else if (char === '|') tokens.push('v');
            else if (char === '!') tokens.push('~');
            else tokens.push(char);
            i++;
        } else if (/[a-zA-Z_]/.test(char)) {
            let val = '';
            while (i < str.length && /[a-zA-Z0-9_]/.test(str[i])) {
                val += str[i]; i++;
            }
            // Allow user to literally type AND, OR, NOT
            if (val.toUpperCase() === 'AND') tokens.push('^');
            else if (val.toUpperCase() === 'OR') tokens.push('v');
            else if (val.toUpperCase() === 'NOT') tokens.push('~');
            else tokens.push(val);
        } else {
            i++; 
        }
    }
    return tokens;
}

export function parse(tokens, getVars = null) {
    let current = 0;

    function eat(type) {
        if (current < tokens.length && tokens[current] === type) {
            current++;
            return true;
        }
        return false;
    }

    function parseExpr() {
        let node = parseTerm();
        while (current < tokens.length && tokens[current] === 'v') {
            current++;
            let right = parseTerm();
            node = new ASTNode('OR', node, right);
        }
        return node;
    }

    function parseTerm() {
        let node = parseFactor();
        while (current < tokens.length && tokens[current] === '^') {
            current++;
            let right = parseFactor();
            node = new ASTNode('AND', node, right);
        }
        return node;
    }

    function parseFactor() {
        if (eat('~')) {
            return new ASTNode('NOT', parseFactor());
        }
        if (eat('(')) {
            let node = parseExpr();
            eat(')'); // Assume correct parens for now
            return node;
        }
        // Identifier
        if (current < tokens.length) {
            let val = tokens[current++];
            if (getVars) getVars.add(val);
            return new ASTNode('VAR', null, null, val);
        }
        return new ASTNode('VAR', null, null, 'UNKNOWN');
    }

    if (tokens.length === 0) return new ASTNode('VAR', null, null, 'EMPTY');
    return parseExpr();
}

/**
 * Three-value logic evaluation: true, false, null (unknown)
 */
export function evaluateAST(node, assignments) {
    if (!node) return null;
    
    if (node.type === 'VAR') {
        const val = assignments[node.value];
        return val === undefined ? null : val;
    }
    
    if (node.type === 'NOT') {
        const val = evaluateAST(node.left, assignments);
        if (val === null) return null;
        return !val;
    }
    
    if (node.type === 'AND') {
        const left = evaluateAST(node.left, assignments);
        const right = evaluateAST(node.right, assignments);
        
        if (left === false || right === false) return false;
        if (left === true && right === true) return true;
        return null;
    }
    
    if (node.type === 'OR') {
        const left = evaluateAST(node.left, assignments);
        const right = evaluateAST(node.right, assignments);
        
        if (left === true || right === true) return true;
        if (left === false && right === false) return false;
        return null;
    }
    
    return null;
}

export function countFalseClauses(node, assignments) {
    // Treat top-level ANDs as clauses. 
    function getClauses(n) {
        if (!n) return [];
        if (n.type === 'AND') {
            return [...getClauses(n.left), ...getClauses(n.right)];
        }
        return [n];
    }
    
    const clauses = getClauses(node);
    let falseCount = 0;
    let unknownCount = 0;
    
    for (const c of clauses) {
        const val = evaluateAST(c, assignments);
        if (val === false) falseCount++;
        else if (val === null) unknownCount++;
    }
    
    return { falseCount, unknownCount, total: clauses.length };
}

export class BooleanSatState {
    constructor(variables, assignments, ast = null, domains = null) {
        // variables is an array of strings (the variable names)
        this.variables = variables;
        // assignments is an object: { 'A': true, 'B': false, 'C': null }
        this.assignments = { ...assignments };
        this.ast = ast; // Not mutable, kept by state to avoid re-parsing
        this.domains = domains;
        this.cachedCost = null;
    }

    get placedCount() {
        let count = 0;
        for (const v of this.variables) {
            if (this.assignments[v] !== null && this.assignments[v] !== undefined) count++;
        }
        return count;
    }

    get isPartial() {
        return this.placedCount < this.variables.length;
    }

    get cost() {
        if (this.cachedCost !== null) return this.cachedCost;
        if (!this.ast) return 0;
        
        const { falseCount, unknownCount } = countFalseClauses(this.ast, this.assignments);
        
        // Add huge penalty for being partial (unassigned variables)
        let totalCost = falseCount;
        if (this.isPartial) {
            totalCost += (this.variables.length - this.placedCount) * 1000;
        }
        
        this.cachedCost = totalCost;
        return totalCost;
    }

    getNeighbors() {
        const neighbors = [];
        for (const v of this.variables) {
            const nextAssignments = { ...this.assignments };
            // Flip true <-> false (if null, assign true)
            nextAssignments[v] = nextAssignments[v] === true ? false : true;
            neighbors.push(new BooleanSatState(this.variables, nextAssignments, this.ast));
        }
        return neighbors;
    }

    getRandomNeighbor() {
        const v = this.variables[Math.floor(Math.random() * this.variables.length)];
        const nextAssignments = { ...this.assignments };
        nextAssignments[v] = nextAssignments[v] === true ? false : true;
        return new BooleanSatState(this.variables, nextAssignments, this.ast);
    }

    clone() {
        let newDomains = null;
        if (this.domains) {
            newDomains = {};
            for (const v of this.variables) {
                if (this.domains[v]) newDomains[v] = [...this.domains[v]];
            }
        }
        return new BooleanSatState(this.variables, this.assignments, this.ast, newDomains);
    }
}

// Generate random 3-SAT problem
function generateRandom3Sat(numVars, numClauses) {
    const vars = Array.from({ length: numVars }, (_, i) => String.fromCharCode(65 + i));
    const clauses = [];
    
    for (let c = 0; c < numClauses; c++) {
        const clauseVars = [];
        const availableVars = [...vars];
        
        // Pick 3 unique vars for this clause
        for (let i = 0; i < 3; i++) {
            if (availableVars.length === 0) break;
            const idx = Math.floor(Math.random() * availableVars.length);
            clauseVars.push(availableVars[idx]);
            availableVars.splice(idx, 1);
        }
        
        let clauseStr = "(" + clauseVars.map(v => (Math.random() > 0.5 ? '~' : '') + v).join(' v ') + ")";
        clauses.push(clauseStr);
    }
    
    return clauses.join(' ^ ');
}

// Single instance AST caching
let lastExpression = null;
let lastAST = null;
let lastVars = [];

export const BooleanSatProblem = {
    id: 'boolean-sat',
    name: 'Boolean Satisfiability',
    description: 'Find a truth assignment for boolean variables such that the expression evaluates to True.',

    defaultParams: {
        mode: 'random',
        numVariables: 5,
        numClauses: 10,
        customExpression: 'A ^ (~B v C)'
    },

    // A helper to consistently get the formula string from params
    _getExpression: (params) => {
        if (params.mode === 'custom') {
            return params.customExpression;
        } else {
            // Need a deterministic way or consistent way to regenerate random state
            // If random, we generate random 3-SAT based on params
            return generateRandom3Sat(params.numVariables, params.numClauses);
        }
    },

    // Factory method
    randomState: (params) => {
        const expr = params.expression || BooleanSatProblem._getExpression(params);
        let ast = lastAST;
        let vars = lastVars;
        
        if (expr !== lastExpression) {
            const tokens = tokenize(expr);
            const varSet = new Set();
            ast = parse(tokens, varSet);
            vars = Array.from(varSet).sort();
            
            lastExpression = expr;
            lastAST = ast;
            lastVars = vars;
        }
        
        // Random assignments
        const assignments = {};
        for (const v of vars) {
            assignments[v] = Math.random() > 0.5;
        }
        
        return new BooleanSatState(vars, assignments, ast);
    },

    emptyState: (params) => {
        const expr = params.expression || BooleanSatProblem._getExpression(params);
        let ast = lastAST;
        let vars = lastVars;
        
        if (expr !== lastExpression) {
            const tokens = tokenize(expr);
            const varSet = new Set();
            ast = parse(tokens, varSet);
            vars = Array.from(varSet).sort();
            
            lastExpression = expr;
            lastAST = ast;
            lastVars = vars;
        }
        
        const assignments = {};
        for (const v of vars) {
            assignments[v] = null;
        }
        
        return new BooleanSatState(vars, assignments, ast);
    },
    
    // Extractor used by benchmark & generic execution runner
    extractInstanceParams: (state) => {
        return { expression: lastExpression, numVariables: state.variables.length };
    },

    isSolution: (state) => !state.isPartial && evaluateAST(state.ast, state.assignments) === true,

    crossover: (parents, params) => {
        // Uniform crossover
        const p1 = parents[0];
        const p2 = parents[1];
        const childAssignments = {};
        
        for (const v of p1.variables) {
            childAssignments[v] = Math.random() > 0.5 ? p1.assignments[v] : p2.assignments[v];
        }
        
        return new BooleanSatState(p1.variables, childAssignments, p1.ast);
    },

    mutate: (state, rate, params) => {
        for (const v of state.variables) {
            if (Math.random() < rate) {
                state.assignments[v] = state.assignments[v] === true ? false : true;
                state.cachedCost = null;
            }
        }
    },
    
    // Used for optimal cost UI (always 0 for SAT if satisfiable, we assume 0)
    estimatedOptimalCost: () => 0,
    
    formatCost: (cost) => {
        return (cost !== undefined && cost !== null) ? cost.toFixed(0) : '-';
    },

    getSearchSpace: (params, state) => {
        // Use dynamically captured variables length
        let n = (state && state.variables) ? state.variables.length : params.numVariables || 5;
        // Search space is 2^n
        return {
            formula: '2^N',
            approx: `2^${n}`
        };
    },

    supportsCSP: true,

    // --- CSP Interface ---
    initializeDomains: (state) => {
        const domains = {};
        for (const v of state.variables) {
            domains[v] = [true, false];
        }
        return domains;
    },

    selectUnassignedVariable: (state) => {
        for (const v of state.variables) {
            if (state.assignments[v] === null) return v;
        }
        return null;
    },

    getUnassignedVariables: (state) => {
        return state.variables.filter(v => state.assignments[v] === null);
    },

    getConstraintDegree: (state, variable) => {
        // In SAT, any unassigned variables that appear in clauses with `variable`
        // Given arbitrary AST, finding exact constraint degree implies traversing AST.
        // Simplified heuristic: total unassigned variables
        const unassigned = BooleanSatProblem.getUnassignedVariables(state);
        return unassigned.length;
    },

    getNeighborVariables: (state, variable) => {
        // Again, simplified: all other variables
        return state.variables.filter(v => v !== variable && state.assignments[v] === null);
    },

    getDomainSize: (state, variable) => {
        if (state.domains && state.domains[variable]) return state.domains[variable].length;
        return 2;
    },

    getDomainValues: (state, variable) => {
        return state.domains[variable];
    },

    valuesConflict: (var1, val1, var2, val2) => {
        // Does not directly apply without checking the formula
        return false;
    },

    getAllValues: (state, variable, params) => {
        return [true, false];
    },

    applyMove: (state, variable, value, newDomains) => {
        const nextAssignments = { ...state.assignments };
        nextAssignments[variable] = value;
        return new BooleanSatState(state.variables, nextAssignments, state.ast, newDomains);
    },

    // Forward Checking Propagation
    propagate: (state, variable, value) => {
        // Assign value
        const nextAssignments = { ...state.assignments };
        nextAssignments[variable] = value;
        
        // Deep copy domains
        const nextDomains = {};
        for (const v of state.variables) {
            nextDomains[v] = (state.domains && state.domains[v]) ? [...state.domains[v]] : [true, false];
        }
        nextDomains[variable] = [value];
        
        // Check if the overall expression is already false due to this assignment
        const evalRes = evaluateAST(state.ast, nextAssignments);
        if (evalRes === false) {
            return { domains: nextDomains, success: false }; // Failed branch immediately
        }
        
        return { domains: nextDomains, success: true };
    },

    // Arc Consistency AC-3
    propagateAC3: (state, variable, value) => {
        // Full AC-3 is complex for an arbitrary boolean formula. Use basic FC.
        return BooleanSatProblem.propagate(state, variable, value);
    }
};
