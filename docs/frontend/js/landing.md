# `landing.js` (Landing Page & Authentication Logic)

This script governs the behavior of the main `index.html` landing page, specifically focusing on user authentication and session management.

## Core Responsibilities

### 1. Session Checking
- On load, it pings `api.php?action=get_session` to see if a PHP session cookie exists (indicating a logged-in user).
- If logged in, it updates the UI to show "Tanuló Felület" (Dashboard) instead of "Bejelentkezés" (Login) and displays the user's name.
- If not logged in, it falls back to checking for `neolix_guest_progress` in localStorage to see if there is an active guest session.

### 2. The Auth Modal
Manages the state and DOM interactions of the login modal popup.
- **Login vs Register Mode**: Toggles the visibility of Username and Age fields depending on which tab is active.
- **Form Submission**: Gathers email, password, (and username/age if registering) and sends a POST request to `api.php`.
- **Forgot Password Mode**: Hides standard fields and only asks for an email to send a reset link via `api.php`.

### 3. Guest Login
If a user clicks "Vendégként folytatom" (Continue as Guest), it stores their selected CEFR level in `localStorage` and redirects them straight to `dashboard.html` without creating a backend account.

### 4. Level Redirection
When a user clicks on a level card (A1, A2, etc.) on the landing page:
- If it's A1 and they are logged in: Redirects to Dashboard.
- If it's A1 and they are logged out: Opens the auth modal (intercepting the click).
- If it's A2+ (currently disabled/WIP): Opens a "Hamarosan" (Coming Soon) modal.
