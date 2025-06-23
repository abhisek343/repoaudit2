import { AdvancedCompressionService } from './compressionService';

describe('AdvancedCompressionService', () => {
  it('should compress and decompress data correctly', async () => {
    const testData = JSON.stringify([
      {
        path: 'src/index.ts',
        name: 'index.ts',
        type: 'file',
        size: 1000,
        content: 'console.log("Hello World");',
        language: 'typescript'
      },
      {
        path: 'package.json',
        name: 'package.json',
        type: 'file',
        size: 500,
        content: '{"name": "test-repo", "version": "1.0.0"}',
        language: 'json'
      }
    ]);

    console.log('Original data size:', testData.length, 'bytes');

    // Test compression
    const compressionResult = await AdvancedCompressionService.compressAuto(testData);
    
    expect(compressionResult).toBeDefined();
    expect(compressionResult.compressedData).toBeInstanceOf(ArrayBuffer);
    expect(compressionResult.compressedSize).toBeGreaterThan(0);
    expect(compressionResult.originalSize).toBe(testData.length);
    
    console.log('Compressed size:', compressionResult.compressedSize, 'bytes');
    console.log('Algorithm used:', compressionResult.metadata.algorithm);

    // Test decompression
    const decompressed = await AdvancedCompressionService.decompressAuto(
      compressionResult.compressedData,
      compressionResult.metadata
    );

    expect(decompressed).toBe(testData);
    console.log('Decompression successful');
  });

  it('should handle standard compression/decompression', () => {
    const testData = 'Hello, World! This is a test string for compression.';
    
    // Test standard compression
    const compressionResult = AdvancedCompressionService['compressStandard'](testData);
    
    expect(compressionResult).toBeDefined();
    expect(compressionResult.compressedData).toBeInstanceOf(ArrayBuffer);
    
    // Test standard decompression
    const decompressed = AdvancedCompressionService.decompressStandard(compressionResult.compressedData);
    
    expect(decompressed).toBe(testData);
  });
});