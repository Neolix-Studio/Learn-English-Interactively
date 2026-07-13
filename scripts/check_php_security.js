import { readdirSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';

const root = process.cwd();

const excludedDirs = new Set([
  '.git',
  'dist',
  'libs',
  'node_modules',
  'release',
]);

const excludedFiles = new Set([
  'db_config.php',
  'db_config_prod.php',
]);

const deployablePhpFiles = [];

function walk(dir) {
  for (const entry of readdirSync(dir)) {
    const fullPath = path.join(dir, entry);
    const relPath = path.relative(root, fullPath);
    const stats = statSync(fullPath);

    if (stats.isDirectory()) {
      if (!excludedDirs.has(entry) && !relPath.startsWith(`tools${path.sep}local`)) {
        walk(fullPath);
      }
      continue;
    }

    if (!entry.endsWith('.php') || excludedFiles.has(relPath)) {
      continue;
    }

    deployablePhpFiles.push(relPath);
  }
}

walk(root);

const checks = [
  {
    id: 'dangerous-dynamic-code',
    pattern: /\b(eval|shell_exec|passthru|system|proc_open|popen|pcntl_exec)\s*\(/,
    message: 'Avoid dynamic code execution and shell execution in deployable PHP.',
  },
  {
    id: 'unsafe-unserialize',
    pattern: /\bunserialize\s*\(/,
    message: 'Avoid unserialize() on app data; use JSON or strict parsing instead.',
  },
  {
    id: 'committed-debug-output',
    pattern: /\b(var_dump|print_r)\s*\(/,
    message: 'Remove debug output from deployable PHP.',
  },
  {
    id: 'superglobal-password',
    pattern: /\$_(GET|REQUEST|COOKIE)\s*\[[^\]]*(password|pass|token|secret|key)[^\]]*\]/i,
    message: 'Do not read secrets, passwords, or tokens from GET/REQUEST/COOKIE in deployable PHP.',
    allowedFiles: new Set(['security.php']),
  },
];

const findings = [];

for (const relPath of deployablePhpFiles) {
  const source = readFileSync(path.join(root, relPath), 'utf8');
  const lines = source.split(/\r?\n/);

  checks.forEach((check) => {
    if (check.allowedFiles?.has(relPath)) {
      return;
    }

    lines.forEach((line, index) => {
      if (check.pattern.test(line)) {
        findings.push({
          file: relPath,
          line: index + 1,
          id: check.id,
          message: check.message,
        });
      }
    });
  });

  if (/migrate\.php$|cron_.*\.php$/.test(relPath) && !source.includes('security_require_cli_or_token')) {
    findings.push({
      file: relPath,
      line: 1,
      id: 'unguarded-maintenance-endpoint',
      message: 'Remote maintenance/cron endpoints must call security_require_cli_or_token().',
    });
  }

  if (source.includes('move_uploaded_file') && !/random_bytes|bin2hex|uniqid/.test(source)) {
    findings.push({
      file: relPath,
      line: 1,
      id: 'predictable-upload-name',
      message: 'Uploaded files should be saved with generated names, not user-controlled names.',
    });
  }
}

if (findings.length > 0) {
  console.error('PHP security scan failed:');
  for (const finding of findings) {
    console.error(`- ${finding.file}:${finding.line} [${finding.id}] ${finding.message}`);
  }
  process.exit(1);
}

console.log(`PHP security scan passed (${deployablePhpFiles.length} deployable PHP files checked).`);
