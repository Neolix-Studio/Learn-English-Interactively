# `api.php` (Main Backend Router)

This is the primary backend controller. It acts as a REST-like endpoint handling authentication and database interactions.

## Security & Configuration
- Forces secure session cookies (`cookie_secure`, `cookie_httponly`).
- Configures strict CORS policies (`Access-Control-Allow-Origin`) limited to specific domains (`lexipaws.eu`, `neolix.studio`, `localhost`).
- Connects to the MariaDB database using PDO configured in `db_config.php`.

## Endpoints / Actions
The file uses a `switch` statement on the `?action=` query parameter.

### Authentication
- `?action=signup`: Validates email/password regex, hashes password with `password_hash()`, inserts into DB.
- `?action=login`: Verifies password using `password_verify()`, sets `$_SESSION['user_id']` and user data.
- `?action=logout`: Destroys the session.
- `?action=get_session`: Returns the current session state to the frontend (used by `landing.js`).
- `?action=forgot_password` / `reset_password` / `update_password`: Handles password recovery and updates.

### Progress & Gamification
- `?action=save_progress`: Receives a JSON payload of `userProgress` from the frontend and securely merges it into the user's row in the database.
- `?action=log_failed_exercise`: Tracks specifically which words the user struggles with.
- `?action=get_weak_words`: Retrieves the struggling words to build a personalized dynamic practice lesson.
