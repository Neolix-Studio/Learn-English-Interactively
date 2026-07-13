# Database Schema Overview

The application uses a MariaDB/MySQL database. The connection is managed via PDO in the backend scripts.

## Core Tables

### 1. `users`
Stores user authentication and state.
- `id`: INT Primary Key
- `username`: VARCHAR
- `email`: VARCHAR (Unique)
- `password_hash`: VARCHAR
- `role`: ENUM ('user', 'admin', 'premium')
- `points`: INT (Total XP)
- `completed_lessons`: JSON (Map of completed node keys)
- `scores`: JSON (General nested state: streak, active_theme, earned_xp_per_node)
- `active_quests`: JSON (Currently assigned daily quests)
- `quest_progress`: JSON (Progress on active quests)

### 2. `tts_cache`
Stores references to generated Text-to-Speech audio files to save API costs.
- `text_hash`: VARCHAR Primary Key (SHA-256 hash of the sentence)
- `text`: TEXT (The original sentence)
- `filename`: VARCHAR (The name of the `.mp3` file on the server)

### 3. `failed_exercises` (Conceptual/Inferred)
Logs mistakes for dynamic practice generation.
- `user_id`: INT Foreign Key
- `word_id` / `word_en`: VARCHAR
- `fail_count`: INT
- `last_failed_at`: TIMESTAMP
