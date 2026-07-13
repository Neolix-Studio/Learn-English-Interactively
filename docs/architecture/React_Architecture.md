# React Architecture

The Learn English Website is a single-page application (SPA) built on a modern **React + Vite + TypeScript** stack. This replaces the legacy vanilla JavaScript architecture.

## Core Tech Stack
- **Framework**: React 18
- **Build Tool**: Vite
- **Language**: TypeScript
- **Styling**: Vanilla CSS (CSS Variables)

## Directory Structure
```
src/
├── assets/         # Static assets and generated dictionaries (e.g., svgDictionary.json)
├── components/     # Reusable React components
│   ├── LessonPlayer/  # The core learning engine
│   └── ...
├── context/        # React Context providers (UserContext.tsx)
├── pages/          # Full page views (Dashboard, Welcome, Error Boundaries)
├── utils/          # Helper functions (Audio, API hooks, data loading)
├── App.tsx         # Root component and Routing logic
└── main.tsx        # Application entry point
```

## State Management

### `UserContext.tsx`
The primary global state manager. It wraps the entire application and handles:
- **Authentication State**: Tracks if the user is a guest or logged in.
- **User Data**: Holds the user's `score`, `points`, `activeLevel`, and `quests`.
- **Progress Syncing**: Handles the `node_state` (which lessons are completed) and fetches updates from the backend.

### Component-Level State
Most UI state is kept local to components using `useState` and `useReducer`. For example, the `LessonPlayer` manages the current question index, the number of mistakes, and feedback UI completely internally.

## Routing (`App.tsx`)
We use a simple component-based routing system (or `react-router` depending on the current branch configuration) to switch between the main views:
- **Welcome Screen**: For unauthenticated users.
- **Dashboard**: The main node roadmap where users select lessons.
- **Lesson Player**: The full-screen interactive game view.

## Integration with Backend
The frontend fetches data from the backend using standard `fetch` API wrappers (found in `src/utils/api.ts`). We communicate with a PHP backend API that handles:
- Progress tracking
- Audio generation (TTS)
- Quest validation
