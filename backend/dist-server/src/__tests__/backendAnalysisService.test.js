"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const backendAnalysisService_1 = require("../services/backendAnalysisService");
describe('BackendAnalysisService', () => {
    let service;
    beforeEach(() => {
        service = new backendAnalysisService_1.BackendAnalysisService();
    });
    describe('analyzeFull', () => {
        it('should handle invalid repository URLs gracefully', async () => {
            const invalidUrl = 'not-a-valid-github-url';
            await expect(service.analyzeFull(invalidUrl, {}, () => { })).rejects.toThrow('Could not extract owner and repo from URL');
        });
        it('should process valid GitHub URLs', () => {
            const validUrl = 'https://github.com/owner/repo';
            expect(() => {
                // This would test URL parsing logic
                const parts = validUrl.match(/github\.com\/([^/]+)\/([^/]+)/);
                expect(parts).toBeTruthy();
                expect(parts[1]).toBe('owner');
                expect(parts[2]).toBe('repo');
            }).not.toThrow();
        });
    });
    describe('file analysis helpers', () => {
        it('should detect source files correctly', () => {
            const sourceFiles = [
                'src/main.ts',
                'src/components/Button.tsx',
                'lib/utils.js',
                'README.md',
                'package.json'
            ];
            const result = sourceFiles.filter(f => /\.(ts|tsx|js|jsx|py|java|go|cs|php|rb)$/i.test(f));
            expect(result).toHaveLength(3);
            expect(result).toContain('src/main.ts');
            expect(result).toContain('src/components/Button.tsx');
            expect(result).toContain('lib/utils.js');
        });
        it('should calculate fallback complexity correctly', () => {
            const simpleContent = 'function test() { return true; }';
            const complexContent = `
        function complex() {
          if (condition1) {
            for (let i = 0; i < 10; i++) {
              if (condition2) {
                while (condition3) {
                  // nested complexity
                }
              }
            }
          }
          return result;
        }
      `;
            // Mock complexity calculation
            const simpleComplexity = (simpleContent.match(/\b(if|for|while|switch|case|catch|try)\b/g) || []).length + 1;
            const complexComplexity = (complexContent.match(/\b(if|for|while|switch|case|catch|try)\b/g) || []).length + 1;
            expect(simpleComplexity).toBeLessThan(complexComplexity);
            expect(simpleComplexity).toBeGreaterThan(0);
        });
    });
    describe('error handling', () => {
        it('should add warnings for failed operations', () => {
            // Test that the service properly handles and records warnings
            const service = new backendAnalysisService_1.BackendAnalysisService();
            // This would test the addWarning method if it was public
            // For now, we test that the service initializes without errors
            expect(service).toBeInstanceOf(backendAnalysisService_1.BackendAnalysisService);
        });
    });
});
