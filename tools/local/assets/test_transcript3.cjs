const fs = require('fs');

const logPath = '/Users/ladislav/.gemini/antigravity-ide/brain/a0c60d8a-d076-427b-8087-fa9e1d21228a/.system_generated/logs/transcript_full.jsonl';
const logs = fs.readFileSync(logPath, 'utf8').split('\n').filter(Boolean);

let lastUserInput = '';
for (let i = logs.length - 1; i >= 0; i--) {
    const entry = JSON.parse(logs[i]);
    if (entry.type === 'USER_INPUT') {
        lastUserInput = entry.content;
        break;
    }
}

console.log('Total length:', lastUserInput.length);
console.log('Does it have </svg>?', lastUserInput.includes('</svg>'));
const lines = lastUserInput.split('\n');
console.log('First 10 lines:');
console.log(lines.slice(0, 10).join('\n'));
console.log('Middle lines around index 4000:');
console.log(lastUserInput.substring(4000, 4200));

