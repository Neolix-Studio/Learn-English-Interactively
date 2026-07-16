<?php
// Database configuration template for local MariaDB setup
// RENAME this file to db_config.php and fill in your actual credentials.
// NEVER commit your real db_config.php file containing passwords to Git!
define('DB_HOST', 'YOUR_DATABASE_HOST_HERE');
define('DB_NAME', 'YOUR_DATABASE_NAME_HERE');
define('DB_USER', 'YOUR_DATABASE_USER_HERE');
define('DB_PASS', 'YOUR_DATABASE_PASSWORD_HERE');
define('GOOGLE_TTS_API_KEY', 'YOUR_GOOGLE_TTS_API_KEY_HERE');
define('SLACK_WEBHOOK_URL', 'YOUR_SLACK_WEBHOOK_URL_HERE');
define('SLACK_WEBHOOK_URL_FEEDBACK', 'YOUR_FEEDBACK_SLACK_WEBHOOK_URL_HERE');
define('CRON_SECRET', 'YOUR_CRON_SECRET_HERE');
define('MAINTENANCE_TOKEN', 'YOUR_MAINTENANCE_TOKEN_HERE');
// Required for password reset links. Production/staging must use an allowed HTTPS app URL.
define('APP_BASE_URL', 'http://localhost:5173');
define('BETA_INVITES_ENABLED', 'false');
define('SMTP_HOST', 'YOUR_SMTP_HOST_HERE');
define('SMTP_PORT', 465);
define('SMTP_SECURE', 'ssl'); // 'ssl' for 465, 'tls' for 587
define('SMTP_USER', 'YOUR_SMTP_USER_HERE');
define('SMTP_PASS', 'YOUR_SMTP_PASSWORD_HERE');
