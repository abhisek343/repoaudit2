import localforage from 'localforage';
import { FileInfo } from '../types';
import { AdvancedCompressionService, CompressionMetadata } from './compressionService';

// Repository archive metadata interface
export interface RepositoryArchiveMetadata {
  id: string; // Unique identifier for the repository (e.g., "owner/repo")
  owner: string;
  repo: string;
  branch: string;
  downloadedAt: number; // Timestamp
  originalSize: number; // Original uncompressed size in bytes
  compressedSize: number; // Compressed size in bytes
  compressionRatio: number; // Compression ratio achieved
  fileCount: number;
  commitSha?: string; // Optional: to detect if repo has changed
  compressionMetadata: CompressionMetadata; // Compression algorithm details
}

// Repository archive data interface
export interface RepositoryArchiveData {
  metadata: RepositoryArchiveMetadata;
  compressedFiles: ArrayBuffer; // Extremely compressed file data
  rawArchive?: ArrayBuffer; // Optional: store the raw ZIP data (rarely used due to size)
}

let archiveStore: LocalForage;

// Initialize the repository archive storage
export const initializeArchiveStorage = async () => {
  archiveStore = localforage.createInstance({
    name: 'repo-auditor',
    storeName: 'repository-archives'
  });
  await archiveStore.ready();
};

export class RepositoryArchiveService {
  private static readonly MAX_ARCHIVES = 10; // Keep only the last 10 repositories
  private static readonly MAX_AGE_HOURS = 24; // Cache for 24 hours

  /**
   * Generate a unique ID for a repository
   */
  private static generateRepoId(owner: string, repo: string, branch: string = 'main'): string {
    return `${owner}/${repo}@${branch}`;
  }
  /**
   * Check if a cached archive exists and is still valid
   */
  static async getCachedArchive(
    owner: string, 
    repo: string, 
    branch: string = 'main'
  ): Promise<FileInfo[] | null> {
    try {
      const repoId = this.generateRepoId(owner, repo, branch);
      const cached = await archiveStore.getItem<RepositoryArchiveData>(repoId);
      
      if (!cached) {
        return null;
      }

      // Check if cache is still valid (not expired)
      const ageHours = (Date.now() - cached.metadata.downloadedAt) / (1000 * 60 * 60);
      if (ageHours > this.MAX_AGE_HOURS) {
        console.log(`Repository archive for ${repoId} is expired (${ageHours.toFixed(1)} hours old), removing from cache`);
        await archiveStore.removeItem(repoId);
        return null;
      }

      console.log(`Found valid cached archive for ${repoId} (${ageHours.toFixed(1)} hours old, ${cached.metadata.fileCount} files)`);
      
      // Decompress the files
      const filesJson = await AdvancedCompressionService.decompressAuto(
        cached.compressedFiles,
        cached.metadata.compressionMetadata
      );
      const files: FileInfo[] = JSON.parse(filesJson);
      
      console.log(`✅ Decompressed ${files.length} files from cache (ratio: ${cached.metadata.compressionRatio.toFixed(2)}:1)`);
      return files;
    } catch (error) {
      console.error('Failed to get cached repository archive:', error);
      return null;
    }
  }
  /**
   * Store a repository archive in IndexedDB
   */
  static async storeArchive(
    owner: string,
    repo: string,
    branch: string,
    files: FileInfo[],
    rawArchive?: ArrayBuffer
  ): Promise<void> {
    try {
      const repoId = this.generateRepoId(owner, repo, branch);
      
      // Calculate total size
      const totalSize = files.reduce((sum, file) => {
        return sum + (file.content?.length || 0);
      }, 0);

      console.log(`🗜️ Compressing ${files.length} files (${(totalSize / 1024 / 1024).toFixed(2)} MB) for cache storage...`);
      
      // Compress the files using extreme compression
      const filesJson = JSON.stringify(files);
      const compressionResult = await AdvancedCompressionService.compressAuto(filesJson);
      
      console.log(`✅ Compression completed: ${compressionResult.compressionRatio.toFixed(2)}:1 ratio, ${((compressionResult.originalSize - compressionResult.compressedSize) / 1024 / 1024).toFixed(2)} MB saved`);

      const archiveData: RepositoryArchiveData = {
        metadata: {
          id: repoId,
          owner,
          repo,
          branch,
          downloadedAt: Date.now(),
          originalSize: totalSize,
          compressedSize: compressionResult.compressedSize,
          compressionRatio: compressionResult.compressionRatio,
          fileCount: files.length,
          compressionMetadata: compressionResult.metadata
        },
        compressedFiles: compressionResult.compressedData,
        rawArchive
      };

      // Store the archive
      await archiveStore.setItem(repoId, archiveData);
      console.log(`💾 Stored repository archive for ${repoId} (${files.length} files, ${(compressionResult.compressedSize / 1024).toFixed(2)} KB compressed)`);

      // Clean up old archives to stay within limits
      await this.cleanupOldArchives();
    } catch (error) {
      console.error('Failed to store repository archive:', error);
      throw error;
    }
  }

  /**
   * Remove old archives to maintain storage limits
   */
  private static async cleanupOldArchives(): Promise<void> {
    try {
      const allKeys = await archiveStore.keys();
      
      if (allKeys.length <= this.MAX_ARCHIVES) {
        return; // No cleanup needed
      }

      // Get all archives with metadata
      const archives: { key: string; metadata: RepositoryArchiveMetadata }[] = [];
      
      for (const key of allKeys) {
        try {
          const archive = await archiveStore.getItem<RepositoryArchiveData>(key);
          if (archive?.metadata) {
            archives.push({ key, metadata: archive.metadata });
          }
        } catch (error) {
          console.warn(`Failed to read archive metadata for ${key}:`, error);
          // Remove corrupted entry
          await archiveStore.removeItem(key);
        }
      }

      // Sort by download time (oldest first)
      archives.sort((a, b) => a.metadata.downloadedAt - b.metadata.downloadedAt);

      // Remove excess archives
      const toRemove = archives.slice(0, archives.length - this.MAX_ARCHIVES);
      for (const { key, metadata } of toRemove) {
        await archiveStore.removeItem(key);
        console.log(`Removed old repository archive: ${metadata.id}`);
      }
    } catch (error) {
      console.error('Failed to cleanup old archives:', error);
    }
  }

  /**
   * Clear all cached archives
   */
  static async clearAllArchives(): Promise<void> {
    try {
      await archiveStore.clear();
      console.log('Cleared all repository archives from cache');
    } catch (error) {
      console.error('Failed to clear repository archives:', error);
      throw error;
    }
  }

  /**
   * Get information about all cached archives (for management UI)
   */
  static async getArchiveList(): Promise<RepositoryArchiveMetadata[]> {
    try {
      const allKeys = await archiveStore.keys();
      const metadataList: RepositoryArchiveMetadata[] = [];

      for (const key of allKeys) {
        try {
          const archive = await archiveStore.getItem<RepositoryArchiveData>(key);
          if (archive?.metadata) {
            metadataList.push(archive.metadata);
          }
        } catch (error) {
          console.warn(`Failed to read archive metadata for ${key}:`, error);
        }
      }

      // Sort by download time (newest first)
      metadataList.sort((a, b) => b.downloadedAt - a.downloadedAt);
      return metadataList;
    } catch (error) {
      console.error('Failed to get archive list:', error);
      return [];
    }
  }

  /**
   * Remove a specific archive from cache
   */
  static async removeArchive(owner: string, repo: string, branch: string = 'main'): Promise<void> {
    try {
      const repoId = this.generateRepoId(owner, repo, branch);
      await archiveStore.removeItem(repoId);
      console.log(`Removed repository archive: ${repoId}`);
    } catch (error) {
      console.error('Failed to remove repository archive:', error);
      throw error;
    }
  }
  /**
   * Get cache statistics
   */
  static async getCacheStats(): Promise<{
    totalArchives: number;
    totalOriginalSize: number; // in bytes
    totalCompressedSize: number; // in bytes
    averageCompressionRatio: number;
    totalSpaceSaved: number; // in bytes
    oldestArchive?: RepositoryArchiveMetadata;
    newestArchive?: RepositoryArchiveMetadata;
  }> {
    try {
      const archives = await this.getArchiveList();
      
      const totalOriginalSize = archives.reduce((sum, archive) => sum + archive.originalSize, 0);
      const totalCompressedSize = archives.reduce((sum, archive) => sum + archive.compressedSize, 0);
      const averageCompressionRatio = archives.length > 0 
        ? archives.reduce((sum, archive) => sum + archive.compressionRatio, 0) / archives.length 
        : 0;
      const totalSpaceSaved = totalOriginalSize - totalCompressedSize;
      
      return {
        totalArchives: archives.length,
        totalOriginalSize,
        totalCompressedSize,
        averageCompressionRatio,
        totalSpaceSaved,
        oldestArchive: archives.length > 0 ? archives[archives.length - 1] : undefined,
        newestArchive: archives.length > 0 ? archives[0] : undefined,
      };
    } catch (error) {
      console.error('Failed to get cache statistics:', error);
      return {
        totalArchives: 0,
        totalOriginalSize: 0,
        totalCompressedSize: 0,
        averageCompressionRatio: 0,
        totalSpaceSaved: 0,
      };
    }
  }
}
