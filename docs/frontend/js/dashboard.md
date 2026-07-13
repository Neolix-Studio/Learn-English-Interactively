# `dashboard.js` (User Dashboard & Progression)

This is the largest script in the application (over 5000 lines), acting as the central hub for the authenticated user experience. It manages everything outside of the actual exercise "game screen."

## Key Responsibilities

### 1. Progress & State Management
- **`ProgressManager` / `userProgress`**: The global state object tracking points, completed lessons, streaks, and shop purchases.
- **`LocalSavingsService`**: A fallback localStorage layer for guest users.
- **Backend Sync**: Communicates with `api.php` to fetch and save user state if logged in.

### 2. Gamification System
- **XP & Levels**: Calculates capped XP (`calculateCappedXP`) to prevent exploit grinding. Updates user level based on total XP.
- **Audio Feedback (`AudioSynth`)**: Synthesizes sounds for rewards (level up) and warnings using the Web Audio API.
- **Streaks & Shields**: Calculates daily streaks and deducts streak shields if a day is missed.
- **Daily Quests**: Generates and tracks randomized daily tasks (e.g., "Earn 50 XP", "Complete 3 lessons").
- **Virtual Shop**: Logic for buying themes or streak shields with earned XP.

### 3. The Roadmap (Learning Map)
- Renders the node-based learning path (similar to Duolingo's path).
- Determines which nodes are locked vs. unlocked based on `userProgress.completed`.
- Renders SVG paths connecting the nodes.
- When a user clicks a node, it triggers the transition to `interactive.js`.

### 4. DOM Initialization
- Bootstraps the application on `DOMContentLoaded`.
- Checks the user's active theme and applies CSS classes to the `<body>`.
- Loads the last selected CEFR level (A1, A2, etc.) and populates the sidebar.
