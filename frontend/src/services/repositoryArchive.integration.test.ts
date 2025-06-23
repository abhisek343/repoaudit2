import { RepositoryArchiveService, initializeArchiveStorage } from './repositoryArchiveService';
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

describe('RepositoryArchiveService Integration', () => {
  beforeAll(async () => {
    await initializeArchiveStorage();
  });

  beforeEach(async () => {
    // Clear any existing data
    await RepositoryArchiveService.clearAllArchives();
  });

  it('should store and retrieve archive correctly', async () => {
    // Store archive
    await RepositoryArchiveService.storeArchive(
      'testowner',
      'testrepo',
      'main',
      mockFiles
    );

    // Retrieve archive
    const cached = await RepositoryArchiveService.getCachedArchive(
      'testowner',
      'testrepo',
      'main'
    );

    expect(cached).toBeDefined();
    expect(cached).toHaveLength(mockFiles.length);
    
    // Verify content
    for (let i = 0; i < mockFiles.length; i++) {
      expect(cached![i].path).toBe(mockFiles[i].path);
      expect(cached![i].name).toBe(mockFiles[i].name);
      expect(cached![i].content).toBe(mockFiles[i].content);
      expect(cached![i].language).toBe(mockFiles[i].language);
    }
  });

  it('should return null for non-existent archive', async () => {
    const cached = await RepositoryArchiveService.getCachedArchive(
      'nonexistent',
      'repo',
      'main'
    );

    expect(cached).toBeNull();
  });

  it('should provide correct cache statistics', async () => {
    // Store an archive
    await RepositoryArchiveService.storeArchive(
      'testowner',
      'testrepo',
      'main',
      mockFiles
    );

    const stats = await RepositoryArchiveService.getCacheStats();

    expect(stats.totalArchives).toBe(1);
    expect(stats.totalOriginalSize).toBeGreaterThan(0);
    expect(stats.totalCompressedSize).toBeGreaterThan(0);
    expect(stats.averageCompressionRatio).toBeGreaterThan(0);
    
    // Debug the stats to understand the values
    console.log('Debug - Cache Stats:', {
      totalOriginalSize: stats.totalOriginalSize,
      totalCompressedSize: stats.totalCompressedSize,
      totalSpaceSaved: stats.totalSpaceSaved,
      averageCompressionRatio: stats.averageCompressionRatio
    });
    
    // The space saved calculation should be mathematically consistent
    expect(stats.totalSpaceSaved).toBe(stats.totalOriginalSize - stats.totalCompressedSize);
    
    // For small test data, compression might not always save space due to overhead
    // So we just verify the calculation is correct, not that space is always saved
  });

  it('should remove archive correctly', async () => {
    // Store archive
    await RepositoryArchiveService.storeArchive(
      'testowner',
      'testrepo',
      'main',
      mockFiles
    );

    // Verify it exists
    let cached = await RepositoryArchiveService.getCachedArchive(
      'testowner',
      'testrepo',
      'main'
    );
    expect(cached).toBeDefined();

    // Remove archive
    await RepositoryArchiveService.removeArchive('testowner', 'testrepo', 'main');

    // Verify it's gone
    cached = await RepositoryArchiveService.getCachedArchive(
      'testowner',
      'testrepo',
      'main'
    );
    expect(cached).toBeNull();
  });

  it('should handle multiple archives', async () => {
    // Store multiple archives
    await RepositoryArchiveService.storeArchive('owner1', 'repo1', 'main', mockFiles);
    await RepositoryArchiveService.storeArchive('owner2', 'repo2', 'main', mockFiles);
    await RepositoryArchiveService.storeArchive('owner3', 'repo3', 'main', mockFiles);

    const stats = await RepositoryArchiveService.getCacheStats();
    expect(stats.totalArchives).toBe(3);

    const archiveList = await RepositoryArchiveService.getArchiveList();
    expect(archiveList).toHaveLength(3);

    // Verify each archive can be retrieved
    const cached1 = await RepositoryArchiveService.getCachedArchive('owner1', 'repo1', 'main');
    const cached2 = await RepositoryArchiveService.getCachedArchive('owner2', 'repo2', 'main');
    const cached3 = await RepositoryArchiveService.getCachedArchive('owner3', 'repo3', 'main');

    expect(cached1).toHaveLength(mockFiles.length);
    expect(cached2).toHaveLength(mockFiles.length);
    expect(cached3).toHaveLength(mockFiles.length);
  });
});