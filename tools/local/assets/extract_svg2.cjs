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

const match = lastUserInput.match(/<svg[\s\S]*?<\/svg>/i);

if (match) {
    let svgContent = match[0];
    
    // Remove the green background path
    svgContent = svgContent.replace(/<path[^>]*fill="#8DC339"[^>]*\/>/i, '');
    
    fs.writeFileSync('public/new-icon.svg', svgContent);
    console.log('Successfully extracted and saved public/new-icon.svg');
} else {
    console.log('No SVG found! Checking end of string:');
    console.log(lastUserInput.substring(lastUserInput.length - 100));
}
