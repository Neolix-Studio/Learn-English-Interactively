const fs = require('fs');
const svg = fs.readFileSync('public/chest.svg', 'utf-8');

let overallMinY = Infinity;
let overallMaxY = -Infinity;

const regex = /<path[^>]*d="([^"]*)"/g;
let match;
while ((match = regex.exec(svg)) !== null) {
    const d = match[1];
    let minY = Infinity, maxY = -Infinity;
    const coordRegex = /([MLC]\s*|,\s*|\s+)(-?\d+(?:\.\d+)?)\s+(-?\d+(?:\.\d+)?)/g;
    let cMatch;
    while ((cMatch = coordRegex.exec(d)) !== null) {
        const y = parseFloat(cMatch[3]);
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
        if (y < overallMinY) overallMinY = y;
        if (y > overallMaxY) overallMaxY = y;
    }
}
console.log(`overallMinY: ${overallMinY}, overallMaxY: ${overallMaxY}`);
