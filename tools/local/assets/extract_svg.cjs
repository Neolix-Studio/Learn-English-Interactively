const fs = require('fs');
const path = require('path');

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

const svgStart = lastUserInput.indexOf('<svg');
const svgEnd = lastUserInput.lastIndexOf('</svg>') + 6;

if (svgStart !== -1 && svgEnd !== -1) {
    let svgContent = lastUserInput.substring(svgStart, svgEnd);

    svgContent = svgContent.replace(/<path[^>]*fill="#8DC339"[^>]*\/>/, '');

    fs.writeFileSync('public/new-icon.svg', svgContent);
    console.log('Successfully extracted and saved public/new-icon.svg');
} else {
    console.log('No SVG found in the last user message.');
}
