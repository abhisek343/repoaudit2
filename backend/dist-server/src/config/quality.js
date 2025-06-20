"use strict";
// File: /project - Copy/src/config/quality.ts
Object.defineProperty(exports, "__esModule", { value: true });
exports.calculateCodeQualityMetrics = calculateCodeQualityMetrics;
const dependencies_config_1 = require("./dependencies.config"); // Assuming dependencyUtils is exported
// Basic calculation, can be expanded
function calculateCodeQualityMetrics(files) {
    if (!files || files.length === 0) {
        return {
            cyclomaticComplexity: 0,
            fileLength: 0,
            functionLengths: [],
            testCoverage: 0,
            dependencyCount: 0,
        };
    }
    let totalCyclomaticComplexity = 0;
    let totalFileLength = 0;
    const allFunctionLengths = [];
    const uniqueDependencies = new Set();
    files.forEach(file => {
        if (file.content) {
            totalCyclomaticComplexity += dependencies_config_1.dependencyUtils.calculateCyclomaticComplexity(file.content);
            totalFileLength += file.content.split('\n').length;
            // Mock function length extraction
            const functionsInFile = file.content.match(/function\s+\w+\s*\([^)]*\)\s*\{/g) || [];
            functionsInFile.forEach(() => {
                allFunctionLengths.push(Math.floor(Math.random() * 40) + 10); // Placeholder
            });
        }
        if (file.dependencies) {
            file.dependencies.forEach(dep => uniqueDependencies.add(dep));
        }
    });
    const avgCyclomaticComplexity = files.length > 0 ? Math.round(totalCyclomaticComplexity / files.length) : 0;
    const avgFileLength = files.length > 0 ? Math.round(totalFileLength / files.length) : 0;
    return {
        cyclomaticComplexity: avgCyclomaticComplexity,
        fileLength: avgFileLength, // Representing average file length here
        functionLengths: allFunctionLengths.slice(0, 5), // Sample of function lengths
        testCoverage: 0, // Placeholder - this usually comes from test reports
        dependencyCount: uniqueDependencies.size,
    };
}
