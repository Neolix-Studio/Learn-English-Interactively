const fs = require('fs');

const logPath = '/Users/ladislav/.gemini/antigravity-ide/brain/a0c60d8a-d076-427b-8087-fa9e1d21228a/.system_generated/logs/transcript_full.jsonl';
const logs = fs.readFileSync(logPath, 'utf8').split('\n').filter(Boolean);

let userInputs = [];
for (let i = logs.length - 1; i >= 0; i--) {
    const entry = JSON.parse(logs[i]);
    if (entry.type === 'USER_INPUT') {
        userInputs.push(entry.content);
        if (userInputs.length === 3) break;
    }
}

for (let i = 0; i < userInputs.length; i++) {
    console.log(`--- USER INPUT ${i} ---`);
    console.log(userInputs[i].substring(0, 1000));
}
