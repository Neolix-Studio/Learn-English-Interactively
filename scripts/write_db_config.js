// Helper script executed during GitHub Actions CD deployment to generate db_config.php.
// Uses secure single-quoted PHP variables to avoid variable interpolation issues.
import fs from 'node:fs';
import path from 'node:path';

const esc = (val) => {
  if (!val) return "''";
  return "'" + val.replace(/\\/g, '\\\\').replace(/'/g, "\\'") + "'";
};

const content = `<?php
// Automatically compiled by GitHub Actions
define('DB_HOST', ${esc(process.env.DB_HOST)});
define('DB_NAME', ${esc(process.env.DB_NAME)});
define('DB_USER', ${esc(process.env.DB_USER)});
define('DB_PASS', ${esc(process.env.DB_PASS)});
define('MIGRATION_TOKEN', ${esc(process.env.MIGRATION_TOKEN)});
define('GOOGLE_TTS_API_KEY', ${esc(process.env.GOOGLE_TTS_API_KEY)});
define('SLACK_WEBHOOK_URL', ${esc(process.env.SLACK_WEBHOOK_URL)});
define('CRON_SECRET', ${esc(process.env.CRON_SECRET)});
define('MAINTENANCE_TOKEN', ${esc(process.env.MAINTENANCE_TOKEN)});
define('APP_BASE_URL', ${esc(process.env.APP_BASE_URL)});
	`;

const outputPath = process.env.DB_CONFIG_PATH || 'db_config.php';
const outputDir = path.dirname(outputPath);

if (outputDir && outputDir !== '.') {
  fs.mkdirSync(outputDir, { recursive: true });
}

fs.writeFileSync(outputPath, content);
console.log(`${outputPath} successfully generated.`);
