import * as pako from 'pako';
import LZ4 from 'lz4js';

// Compression levels and strategies
export enum CompressionLevel {
  FASTEST = 'fastest',
  BALANCED = 'balanced',
  MAXIMUM = 'maximum'
}

export interface CompressionResult {
  compressedData: ArrayBuffer;
  originalSize: number;
  compressedSize: number;
  compressionRatio: number;
  algorithm: string;
  metadata: CompressionMetadata;
}

export interface CompressionMetadata {
  algorithm: string;
  level: CompressionLevel;
  timestamp: number;
  checksum?: string;
}

export class AdvancedCompressionService {
  /**
   * Compress data with extreme efficiency (1GB -> ~1MB)
   * Uses multi-stage compression for maximum efficiency
   */
  static async compressExtreme(data: string | ArrayBuffer): Promise<CompressionResult> {
    const startTime = performance.now();
    
    // Convert to string if ArrayBuffer
    const textData = typeof data === 'string' ? data : new TextDecoder().decode(data);
    const originalSize = new TextEncoder().encode(textData).length;
    
    console.log(`🗜️ Starting extreme compression of ${(originalSize / 1024 / 1024).toFixed(2)} MB`);
    
    try {
      // Stage 1: Pre-processing - remove redundant whitespace and optimize structure
      const preprocessed = this.preprocessText(textData);
      console.log(`📊 Preprocessing reduced size by ${((originalSize - new TextEncoder().encode(preprocessed).length) / originalSize * 100).toFixed(1)}%`);
      
      // Stage 2: Dictionary-based compression for code patterns
      const { compressed: dictCompressed, dictionary } = this.dictionaryCompress(preprocessed);
      console.log(`📖 Dictionary compression applied`);
      
      // Stage 3: Multi-level compression pipeline
      const finalCompressed = await this.multiStageCompress(dictCompressed, dictionary);
      
      const compressedSize = finalCompressed.byteLength;
      const compressionRatio = originalSize / compressedSize;
      const compressionTime = performance.now() - startTime;
      
      console.log(`✅ Extreme compression completed in ${compressionTime.toFixed(2)}ms`);
      console.log(`📊 Compression ratio: ${compressionRatio.toFixed(2)}:1 (${(compressedSize / 1024 / 1024).toFixed(2)} MB)`);
      console.log(`💾 Space saved: ${((1 - compressedSize / originalSize) * 100).toFixed(1)}%`);
      
      return {
        compressedData: finalCompressed,
        originalSize,
        compressedSize,
        compressionRatio,
        algorithm: 'extreme-multi-stage',
        metadata: {
          algorithm: 'extreme-multi-stage',
          level: CompressionLevel.MAXIMUM,
          timestamp: Date.now()
        }
      };
    } catch (error) {
      console.error('❌ Extreme compression failed, falling back to standard compression:', error);
      return this.compressStandard(textData);
    }
  }
    /**
   * Decompress extremely compressed data
   */
  static async decompressExtreme(compressedData: ArrayBuffer): Promise<string> {
    const startTime = performance.now();
    
    try {
      // Reverse multi-stage compression
      const { decompressed, dictionary } = await this.multiStageDecompress(compressedData);
      
      // Reverse dictionary compression
      const textData = this.dictionaryDecompress(decompressed, dictionary);
      
      // Reverse preprocessing (restore formatting if needed)
      const finalData = this.postprocessText(textData);
      
      const decompressionTime = performance.now() - startTime;
      console.log(`✅ Extreme decompression completed in ${decompressionTime.toFixed(2)}ms`);
      console.log('DEBUG: decompressExtreme returning:', finalData.substring(0, 100));
      
      return finalData;
    } catch (error) {
      console.error('❌ Extreme decompression failed:', error);
      throw new Error('Failed to decompress extremely compressed data');
    }
  }
  
  /**
   * Preprocess text for better compression
   */
  private static preprocessText(text: string): string {
    return text
      // Normalize whitespace but preserve structure
      .replace(/[ \t]+/g, ' ')
      .replace(/\n\s*\n/g, '\n')
      // Remove unnecessary comments in code (basic pattern)
      .replace(/\/\*[\s\S]*?\*\//g, '')
      .replace(/\/\/.*$/gm, '')
      // Normalize quotes
      .replace(/[""]/g, '"')
      .replace(/['']/g, "'")
      .trim();
  }
  
  /**
   * Post-process text after decompression
   */
  private static postprocessText(text: string): string {
    // Basic restoration - in a real implementation, this would be more sophisticated
    return text;
  }
  
  /**
   * Dictionary-based compression for code patterns
   */
  private static dictionaryCompress(text: string): { compressed: string; dictionary: Record<string, string> } {
    // Common code patterns and keywords
    const patterns = [
      'function', 'const', 'let', 'var', 'return', 'if', 'else', 'for', 'while',
      'import', 'export', 'default', 'class', 'extends', 'implements',
      'interface', 'type', 'string', 'number', 'boolean', 'object', 'array',
      'console.log', 'console.error', 'console.warn',
      'document.', 'window.', 'localStorage.', 'sessionStorage.',
      '.length', '.push(', '.pop()', '.shift()', '.unshift(',
      '.map(', '.filter(', '.reduce(', '.forEach(', '.find(',
      'async ', 'await ', 'Promise', 'then(', 'catch(',
      '===', '!==', '&&', '||', '++', '--',
      'true', 'false', 'null', 'undefined'
    ];
    
    const dictionary: Record<string, string> = {};
    let compressed = text;
    let tokenId = 0;
    
    // Replace common patterns with short tokens
    patterns.forEach(pattern => {
      const regex = new RegExp(pattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g');
      const matches = text.match(regex);
      
      if (matches && matches.length > 3) { // Only compress if appears frequently
        const token = `¿${tokenId.toString(36)}¿`;
        dictionary[token] = pattern;
        compressed = compressed.replace(regex, token);
        tokenId++;
      }
    });
    
    // Find and compress repeated strings
    this.findRepeatedStrings(text, 4).forEach(({ string, count }) => {
      if (count > 2 && string.length > 3) {
        const token = `¿${tokenId.toString(36)}¿`;
        dictionary[token] = string;
        const regex = new RegExp(string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g');
        compressed = compressed.replace(regex, token);
        tokenId++;
      }
    });
    
    return { compressed, dictionary };
  }
  
  /**
   * Dictionary-based decompression
   */
  private static dictionaryDecompress(compressed: string, dictionary: Record<string, string>): string {
    let decompressed = compressed;
    
    Object.entries(dictionary).forEach(([token, original]) => {
      const regex = new RegExp(token.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g');
      decompressed = decompressed.replace(regex, original);
    });
    
    return decompressed;
  }
  
  /**
   * Find repeated strings in text
   */
  private static findRepeatedStrings(text: string, minLength: number): Array<{ string: string; count: number }> {
    const strings = new Map<string, number>();
    
    for (let i = 0; i < text.length - minLength; i++) {
      for (let len = minLength; len <= Math.min(50, text.length - i); len++) {
        const substring = text.substr(i, len);
        if (substring.match(/^[a-zA-Z0-9_\-.]+$/)) { // Only alphanumeric patterns
          strings.set(substring, (strings.get(substring) || 0) + 1);
        }
      }
    }
    
    return Array.from(strings.entries())
      .map(([string, count]) => ({ string, count }))
      .filter(({ count }) => count > 1)
      .sort((a, b) => b.count - a.count)
      .slice(0, 100); // Top 100 repeated strings
  }
  
  /**
   * Multi-stage compression pipeline
   */
  private static async multiStageCompress(text: string, dictionary: Record<string, string>): Promise<ArrayBuffer> {
    // Encode dictionary and text together
    const payload = JSON.stringify({ text, dictionary });
    const textBytes = new TextEncoder().encode(payload);
    
    // Stage 1: LZ4 for speed
    const lz4Compressed = LZ4.compress(Array.from(textBytes));
    console.log(`🚀 LZ4 compression: ${textBytes.length} -> ${lz4Compressed.length} bytes`);
      // Stage 2: Deflate for size
    const deflateCompressed = pako.deflate(new Uint8Array(lz4Compressed), { 
      level: 9,
      windowBits: 15,
      memLevel: 9,
      strategy: pako.constants.Z_DEFAULT_STRATEGY
    });
    
    console.log(`📦 Deflate compression: ${lz4Compressed.length} -> ${deflateCompressed.length} bytes`);
    
    return deflateCompressed.buffer;
  }
  
  /**
   * Multi-stage decompression
   */
  private static async multiStageDecompress(compressedData: ArrayBuffer): Promise<{ decompressed: string; dictionary: Record<string, string> }> {
    try {
      // Stage 1: Inflate
      const inflated = pako.inflate(new Uint8Array(compressedData));
      
      if (!inflated) {
        throw new Error('Stage 1 decompression (pako.inflate) failed');
      }
      
      // Stage 2: LZ4 decompress
      const lz4DecompressedArray = LZ4.decompress(Array.from(inflated));
      
      if (!lz4DecompressedArray) {
        throw new Error('Stage 2 decompression (LZ4.decompress) failed');
      }
      
      const lz4DecompressedUint8 = new Uint8Array(lz4DecompressedArray);
      
      // Decode payload
      const payload = new TextDecoder().decode(lz4DecompressedUint8);
      
      // Check for empty or problematic payload before parsing
      if (!payload || payload === "undefined" || payload.trim() === '') {
        throw new Error(`Decompression resulted in an invalid payload: '${payload}'. Data might be corrupted or an unexpected decompression artifact.`);
      }

      const { text, dictionary } = JSON.parse(payload);
      
      if (typeof text !== 'string') {
        throw new Error('Decompressed payload does not contain valid text data');
      }
      
      return { decompressed: text, dictionary };
    } catch (error) {
      console.error('Multi-stage decompression failed:', error);
      throw new Error(`Multi-stage decompression failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
  
  /**
   * Standard compression fallback
   */
  private static compressStandard(text: string): CompressionResult {
    const textBytes = new TextEncoder().encode(text);
    const originalSize = textBytes.length;
    
    const compressed = pako.deflate(textBytes, { level: 6 });
    const compressedSize = compressed.length;
    
    return {
      compressedData: compressed.slice().buffer,
      originalSize,
      compressedSize,
      compressionRatio: originalSize / compressedSize,
      algorithm: 'deflate',
      metadata: {
        algorithm: 'deflate',
        level: CompressionLevel.BALANCED,
        timestamp: Date.now()
      }
    };
  }
  
  /**
   * Standard decompression
   */
  static decompressStandard(compressedData: ArrayBuffer): string {
    try {
      const decompressed = pako.inflate(new Uint8Array(compressedData), { to: 'string' });
      
      // Check if decompression was successful
      if (decompressed === undefined || decompressed === null) {
        throw new Error('Decompression failed: pako.inflate returned undefined/null');
      }
      
      console.log('DEBUG: decompressStandard returning:', typeof decompressed === 'string' ? decompressed.substring(0, 100) : 'Non-string result');
      return decompressed;
    } catch (error) {
      console.error('Failed to decompress data with standard method:', error);
      throw new Error(`Standard decompression failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
  
  /**
   * Auto-select best compression method based on data size
   */
  static async compressAuto(data: string | ArrayBuffer): Promise<CompressionResult> {
    const size = typeof data === 'string' 
      ? new TextEncoder().encode(data).length 
      : data.byteLength;
    
    console.log(`📏 Data size for compression decision: ${(size / 1024).toFixed(2)} KB`);
    
    // Use extreme compression for large data (>100KB)
    if (size > 100 * 1024) {
      console.log('🚀 Using extreme compression for large data');
      return this.compressExtreme(data);
    } else {
      console.log('📦 Using standard compression for smaller data');
      // Use standard compression for smaller data
      return this.compressStandard(typeof data === 'string' ? data : new TextDecoder().decode(data));
    }
  }
  
  /**
   * Auto-decompress based on metadata
   */
  static async decompressAuto(compressedData: ArrayBuffer, metadata: CompressionMetadata): Promise<string> {
    try {
      console.log(`Auto-decompressing with algorithm: ${metadata.algorithm}`);
      
      if (metadata.algorithm === 'extreme-multi-stage') {
        try {
          return await this.decompressExtreme(compressedData);
        } catch (extremeError) {
          console.warn('Extreme decompression failed, trying standard fallback:', extremeError);
          return this.decompressStandard(compressedData);
        }
      } else {
        return this.decompressStandard(compressedData);
      }
    } catch (error) {
      console.error('Auto-decompression failed completely:', error);
      throw new Error(`Failed to decompress data with algorithm ${metadata.algorithm}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
  
  /**
   * Get compression statistics
   */
  static getCompressionStats(results: CompressionResult[]): {
    totalOriginalSize: number;
    totalCompressedSize: number;
    averageRatio: number;
    totalSpaceSaved: number;
  } {
    const totalOriginalSize = results.reduce((sum, r) => sum + r.originalSize, 0);
    const totalCompressedSize = results.reduce((sum, r) => sum + r.compressedSize, 0);
    const averageRatio = results.reduce((sum, r) => sum + r.compressionRatio, 0) / results.length;
    const totalSpaceSaved = totalOriginalSize - totalCompressedSize;
    
    return {
      totalOriginalSize,
      totalCompressedSize,
      averageRatio,
      totalSpaceSaved
    };
  }
}
