import { RepositoryArchiveService, initializeArchiveStorage } from '../services/repositoryArchiveService';
import { FileInfo } from '../types';

// Mock file data for testing
const mockFiles: FileInfo[] = [
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
  },
  {
    path: 'README.md',
    name: 'README.md',
    type: 'file',
    size: 800,
    content: '# Test Repository\n\nThis is a test repository.',
    language: 'markdown'
  }
];

export class RepositoryArchiveServiceTest {
  async runTests(): Promise<void> {
    console.log('🧪 Starting Repository Archive Service Tests...');
    
    try {
      // Initialize storage
      await initializeArchiveStorage();
      console.log('✅ Storage initialized');
      
      // Test 1: Store archive
      await this.testStoreArchive();
      
      // Test 2: Retrieve cached archive
      await this.testGetCachedArchive();
      
      // Test 3: Cache statistics
      await this.testCacheStats();
      
      // Test 4: Clear cache
      await this.testClearCache();
      
      console.log('🎉 All tests passed!');
      
    } catch (error) {
      console.error('❌ Test failed:', error);
      throw error;
    }
  }
  
  private async testStoreArchive(): Promise<void> {
    console.log('🧪 Test 1: Store archive');
    
    await RepositoryArchiveService.storeArchive(
      'testowner',
      'testrepo',
      'main',
      mockFiles
    );
    
    console.log('✅ Archive stored successfully');
  }
  
  private async testGetCachedArchive(): Promise<void> {
    console.log('🧪 Test 2: Get cached archive');
    
    const cached = await RepositoryArchiveService.getCachedArchive(
      'testowner',
      'testrepo',
      'main'
    );
    
    if (!cached) {
      throw new Error('No cached archive found');
    }
    
    if (cached.files.length !== mockFiles.length) {
      throw new Error(`Expected ${mockFiles.length} files, got ${cached.files.length}`);
    }
    
    console.log('✅ Cached archive retrieved successfully');
  }
  
  private async testCacheStats(): Promise<void> {
    console.log('🧪 Test 3: Cache statistics');
    
    const stats = await RepositoryArchiveService.getCacheStats();
    
    if (stats.totalArchives === 0) {
      throw new Error('Expected at least 1 cached archive');
    }
    
    if (stats.totalSize === 0) {
      throw new Error('Expected cache size > 0');
    }
    
    console.log(`✅ Cache stats: ${stats.totalArchives} archives, ${stats.totalSize} bytes`);
  }
  
  private async testClearCache(): Promise<void> {
    console.log('🧪 Test 4: Clear cache');
    
    // Clear specific archive
    await RepositoryArchiveService.removeArchive('testowner', 'testrepo', 'main');
    
    // Verify it's gone
    const cached = await RepositoryArchiveService.getCachedArchive(
      'testowner',
      'testrepo',
      'main'
    );
    
    if (cached) {
      throw new Error('Archive should have been removed');
    }
    
    console.log('✅ Cache cleared successfully');
  }
}

// Export test runner for manual execution
export const runRepositoryArchiveTests = async (): Promise<void> => {
  const tester = new RepositoryArchiveServiceTest();
  await tester.runTests();
};

// Auto-run tests in development mode
if (process.env.NODE_ENV === 'development' && typeof window !== 'undefined') {
  // Add a global function for manual testing
  (window as unknown as { testRepositoryArchive: () => Promise<void> }).testRepositoryArchive = runRepositoryArchiveTests;
  console.log('🧪 Repository Archive Service test available via: testRepositoryArchive()');
}
