// Helper script executed during GitHub Actions CD deployment to generate db_config.php.
// Uses secure single-quoted PHP variables to avoid variable interpolation issues.
import fs from 'node:fs';
import path from 'node:path';

const esc = (val) => {
  if (!val) return "''";
  return "'" + val.replace(/\\/g, '\\\\').replace(/'/g, "\\'") + "'";
};

const requiredEnv = ['APP_BASE_URL'];
const missingRequired = requiredEnv.filter((name) => !process.env[name]?.trim());
if (missingRequired.length > 0) {
  throw new Error(`Missing required deployment config: ${missingRequired.join(', ')}`);
}

const content = `<?php
// Automatically compiled by GitHub Actions
define('DB_HOST', ${esc(process.env.DB_HOST)});
define('DB_NAME', ${esc(process.env.DB_NAME)});
define('DB_USER', ${esc(process.env.DB_USER)});
define('DB_PASS', ${esc(process.env.DB_PASS)});
define('MIGRATION_TOKEN', ${esc(process.env.MIGRATION_TOKEN)});
define('GOOGLE_TTS_API_KEY', ${esc(process.env.GOOGLE_TTS_API_KEY)});
define('SLACK_WEBHOOK_URL', ${esc(process.env.SLACK_WEBHOOK_URL)});
define('SLACK_WEBHOOK_URL_FEEDBACK', ${esc(process.env.SLACK_WEBHOOK_URL_FEEDBACK)});
define('CRON_SECRET', ${esc(process.env.CRON_SECRET)});
define('MAINTENANCE_TOKEN', ${esc(process.env.MAINTENANCE_TOKEN)});
define('APP_BASE_URL', ${esc(process.env.APP_BASE_URL)});
define('BETA_INVITES_ENABLED', ${esc(process.env.BETA_INVITES_ENABLED)});
define('SMTP_HOST', ${esc(process.env.SMTP_HOST)});
define('SMTP_PORT', ${esc(process.env.SMTP_PORT)});
define('SMTP_SECURE', ${esc(process.env.SMTP_SECURE)});
define('SMTP_USER', ${esc(process.env.SMTP_USER)});
define('SMTP_PASS', ${esc(process.env.SMTP_PASS)});
	`;

const outputPath = process.env.DB_CONFIG_PATH || 'db_config.php';
const outputDir = path.dirname(outputPath);

if (outputDir && outputDir !== '.') {
  fs.mkdirSync(outputDir, { recursive: true });
}

fs.writeFileSync(outputPath, content);
console.log(`${outputPath} successfully generated.`);
