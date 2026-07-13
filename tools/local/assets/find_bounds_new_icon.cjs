const fs = require('fs');
const svg = fs.readFileSync('public/new-icon.svg', 'utf-8');

let overallMinX = Infinity;
let overallMaxX = -Infinity;
let overallMinY = Infinity;
let overallMaxY = -Infinity;

const regex = /<path[^>]*d="([^"]*)"/g;
let match;
while ((match = regex.exec(svg)) !== null) {
    const d = match[1];
    const coordRegex = /([MLC]\s*|,\s*|\s+)(-?\d+(?:\.\d+)?)\s+(-?\d+(?:\.\d+)?)/g;
    let cMatch;
    while ((cMatch = coordRegex.exec(d)) !== null) {
        const x = parseFloat(cMatch[2]);
        const y = parseFloat(cMatch[3]);
        if (x < overallMinX) overallMinX = x;
        if (x > overallMaxX) overallMaxX = x;
        if (y < overallMinY) overallMinY = y;
        if (y > overallMaxY) overallMaxY = y;
    }
}
console.log(`minX: ${overallMinX}, maxX: ${overallMaxX}, minY: ${overallMinY}, maxY: ${overallMaxY}`);
