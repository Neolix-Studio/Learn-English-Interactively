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

// Find the SVG
const svgStart = lastUserInput.indexOf('<svg');
const svgEnd = lastUserInput.lastIndexOf('</svg>') + 6;

if (svgStart !== -1 && svgEnd !== -1) {
    let svgContent = lastUserInput.substring(svgStart, svgEnd);
    
    // Remove the green background path
    // <path d="M0 0C1629.87 0 3259.74 0 4939 0C4939 1644.72 4939 3289.44 4939 4984C3309.13 4984 1679.26 4984 0 4984C0 3339.28 0 1694.56 0 0Z" fill="#8DC339"/>
    svgContent = svgContent.replace(/<path[^>]*fill="#8DC339"[^>]*\/>/, '');
    
    fs.writeFileSync('public/new-icon.svg', svgContent);
    console.log('Successfully extracted and saved public/new-icon.svg');
} else {
    console.log('No SVG found in the last user message.');
}
