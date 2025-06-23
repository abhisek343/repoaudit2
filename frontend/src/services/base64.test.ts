// Test the base64 conversion functions
describe('Base64 ArrayBuffer conversion', () => {
  // Helper functions (copied from RepositoryArchiveService)
  const arrayBufferToBase64 = (buffer: ArrayBuffer): string => {
    const bytes = new Uint8Array(buffer);
    let binary = '';
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  };

  const base64ToArrayBuffer = (base64: string): ArrayBuffer => {
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return bytes.buffer;
  };

  it('should convert ArrayBuffer to base64 and back correctly', () => {
    // Create test data
    const originalData = new TextEncoder().encode('Hello, World! This is test data for compression.');
    const originalBuffer = originalData.buffer;

    // Convert to base64
    const base64 = arrayBufferToBase64(originalBuffer);
    expect(base64).toBeDefined();
    expect(typeof base64).toBe('string');
    expect(base64.length).toBeGreaterThan(0);

    // Convert back to ArrayBuffer
    const restoredBuffer = base64ToArrayBuffer(base64);
    expect(restoredBuffer).toBeInstanceOf(ArrayBuffer);
    expect(restoredBuffer.byteLength).toBe(originalBuffer.byteLength);

    // Verify the data is identical
    const restoredData = new Uint8Array(restoredBuffer);
    const originalDataArray = new Uint8Array(originalBuffer);
    
    expect(restoredData.length).toBe(originalDataArray.length);
    for (let i = 0; i < originalDataArray.length; i++) {
      expect(restoredData[i]).toBe(originalDataArray[i]);
    }

    // Verify the text content is the same
    const restoredText = new TextDecoder().decode(restoredBuffer);
    const originalText = new TextDecoder().decode(originalBuffer);
    expect(restoredText).toBe(originalText);
  });

  it('should handle empty ArrayBuffer', () => {
    const emptyBuffer = new ArrayBuffer(0);
    const base64 = arrayBufferToBase64(emptyBuffer);
    const restoredBuffer = base64ToArrayBuffer(base64);
    
    expect(restoredBuffer.byteLength).toBe(0);
  });

  it('should handle binary data', () => {
    // Create binary data with all byte values
    const binaryData = new Uint8Array(256);
    for (let i = 0; i < 256; i++) {
      binaryData[i] = i;
    }
    
    const base64 = arrayBufferToBase64(binaryData.buffer);
    const restoredBuffer = base64ToArrayBuffer(base64);
    const restoredData = new Uint8Array(restoredBuffer);
    
    expect(restoredData.length).toBe(256);
    for (let i = 0; i < 256; i++) {
      expect(restoredData[i]).toBe(i);
    }
  });
});