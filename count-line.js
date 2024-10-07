const fs = require('fs');
const path = require('path');

const directoryPath = path.join(__dirname);

function countLines(dir) {
    let totalLines = 0;

    fs.readdirSync(dir).forEach(file => {
        const filePath = path.join(dir, file);
        if (fs.statSync(filePath).isDirectory()) {
            totalLines += countLines(filePath);
        } else if (filePath.endsWith('.js') || filePath.endsWith('.ts')) {
            const fileContent = fs.readFileSync(filePath, 'utf-8');
            totalLines += fileContent.split('\n').length;
        }
    });

    return totalLines;
}

const totalLines = countLines(directoryPath);
console.log(`Total lines of code: ${totalLines}`);
