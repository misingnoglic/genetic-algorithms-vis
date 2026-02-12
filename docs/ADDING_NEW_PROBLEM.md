# How to Add a New Problem

The application is designed to be extensible. To add a new optimization problem (e.g., TSP, Sudoku), you need to follow these 3 steps.

## 1. Create the Problem Definition

Create a new file in `src/core/problems/` (e.g., `my-problem.js`).

You need to export two things: a **State Class** and a **Problem Object**.

### The State Class (e.g., `MyProblemState`)

This class represents a single candidate solution. It must implement the following interface:

```javascript
export class MyProblemState {
    constructor(params) {
        // Initialize your state
        this.cost = this.calculateCost(); // or use a getter
    }

    // Required: Returns the objective value (lower is better, 0 is solution)
    get cost() {
        // ... calculation
        return value;
    }

    // Required: Returns a deep copy of the state
    clone() {
        return new MyProblemState(...);
    }

    // Required: Generates neighbors for Hill Climbing / SA
    // Returns an array of MyProblemState instances
    getNeighbors() {
        const neighbors = [];
        // ... generate moves
        return neighbors;
    }
    
    // Required: Returns a random state (static factory)
    static randomState(params) {
        return new MyProblemState(...);
    }

    // Optional but Recommended: For debugging
    toString() {
        return "representation";
    }
}
```

### The Problem Object

This object serves as the configuration and factory for the problem.

```javascript
export const MyProblem = {
    id: 'my-problem-id', // Unique ID
    name: 'My Problem',  // Display Name
    description: 'Description of the problem',

    // Default parameters for the problem generator (e.g., size, constraints)
    defaultParams: {
        size: 10,
        // ...
    },

    // Factory method wrapper
    randomState: (params) => {
        return MyProblemState.randomState(params);
    },

    // --- Required for Genetic Algorithm ---
    
    // Crossover: Combine two parents to create a child
    crossover: (parents, params) => {
        // parents is array of State objects
        // return new Child State
    },

    // Mutation: Mutate a state in place
    mutate: (state, mutationRate, params) => {
        // Modify state properties randomly
    }
};
```

## 2. Create the Visualization Components

Create a new component in `src/components/` (e.g., `MyProblemBoard.jsx`).

### Main Board View
This updates the main view when a solution is selected.

```javascript
const MyProblemBoard = ({ state }) => {
    // Render your state here
    return <div>Cost: {state.cost}</div>;
};
```

### (Optional but Recommended) Population View
If you want the Genetic Algorithm grid to look good, ensure your `MyProblemBoard` scales well or create a simplified SVG version. The `PopulationGrid` currently checks if it can render a generic component or if it needs custom logic.

*Currently, `PopulationGrid` uses a generic `MiniBoard` wrapper. You just need to ensure your Board component can accept a `size` prop or style itself to fit small containers.*

## 3. Register the Problem in `App.jsx`

1.  **Import** your Problem Object and Component in `App.jsx`.
    ```javascript
    import { MyProblem } from './core/problems/my-problem';
    import MyProblemBoard from './components/MyProblemBoard';
    ```

2.  **Add** it to the `problems` map.
    ```javascript
    const problems = {
        'n-queens': NQueensProblem,
        'my-problem-id': MyProblem, // Add this
    };
    ```

3.  **Update** the rendering logic to switch components based on `currentProblem.id`.
    ```javascript
    {currentProblem.id === 'n-queens' && <Board state={currentState} />}
    {currentProblem.id === 'my-problem-id' && <MyProblemBoard state={currentState} />}
    ```

## 4. Test It

Run the app. Select your new problem from the dropdown (you might need to add a selector in UI if one doesn't exist, currently hardcoded to N-Queens in some places or defaulted).

*Note: As of now, the UI might need a small update to allow selecting different problems if the selector isn't visible. Check `Controls.jsx`.*
