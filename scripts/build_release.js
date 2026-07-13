import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const root = path.resolve(__dirname, '..');
const releaseDir = path.join(root, 'release');

const copyFile = (from, to = from) => {
  const source = path.join(root, from);
  const destination = path.join(releaseDir, to);

  if (!fs.existsSync(source)) {
    throw new Error(`Missing release file: ${from}`);
  }

  fs.mkdirSync(path.dirname(destination), { recursive: true });
  fs.copyFileSync(source, destination);
};

const copyDir = (from, to = from) => {
  const source = path.join(root, from);
  const destination = path.join(releaseDir, to);

  if (!fs.existsSync(source)) {
    throw new Error(`Missing release directory: ${from}`);
  }

  fs.cpSync(source, destination, {
    recursive: true,
    filter: (sourcePath) => path.basename(sourcePath) !== '.DS_Store'
  });
};

fs.rmSync(releaseDir, { recursive: true, force: true });
fs.mkdirSync(releaseDir, { recursive: true });

copyDir('dist', '.');
copyDir('data/hu');
copyDir('data/sk');
copyDir('data/migrations');
copyDir('templates');
copyDir('libs/PHPMailer/src');
copyFile('libs/PHPMailer/LICENSE');
copyFile('libs/PHPMailer/VERSION');

copyFile('.htaccess');
copyFile('api.php');
copyFile('api/tts.php');
copyFile('security.php');
copyFile('logout.php');
copyFile('upload_avatar.php');
copyFile('report_problem.php');
copyFile('submit_feedback.php');
copyFile('cron_notifications.php');
copyFile('cron_reset_leaderboards.php');
copyFile('migrate.php');
copyFile('mailer.php');
copyFile('data/quests.json');

console.log(`Release package prepared at ${path.relative(root, releaseDir)}/`);
