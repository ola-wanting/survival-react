# Survival Challenge React Conversion

This is a React/Vite conversion of the original `index.html`, `style.css`, and `game.js` canvas game.

## Run locally

```bash
npm install
npm run dev
```

Then open the local Vite URL shown in your terminal.

## Main files

```text
src/App.jsx                 React UI and state bridge
src/game/GameEngine.js      Canvas game engine and gameplay logic
src/styles.css              Original styling adapted for React
src/main.jsx                React entry point
```

## What changed

- Converted static HTML into JSX components.
- Moved score, high score, start screen, game-over screen, and power-up display into React state.
- Kept the canvas gameplay classes as plain JavaScript for performance and simpler migration.
- Replaced direct UI DOM updates with callback functions passed from React.
- Added cleanup logic for event listeners, timers, and animation frames.
