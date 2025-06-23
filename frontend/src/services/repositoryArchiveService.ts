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

// Repository archive data interface for storage
interface RepositoryArchiveStorageData {
  metadata: RepositoryArchiveMetadata;
  compressedFilesBase64: string; // Base64 encoded compressed file data for storage compatibility
  rawArchive?: ArrayBuffer; // Optional: store the raw ZIP data (rarely used due to size)
}

// Repository archive data interface for API
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
   * Convert ArrayBuffer to base64 string for storage
   */
  private static arrayBufferToBase64(buffer: ArrayBuffer): string {
    const bytes = new Uint8Array(buffer);
    let binary = '';
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  }

  /**
   * Convert base64 string back to ArrayBuffer
   */
  private static base64ToArrayBuffer(base64: string): ArrayBuffer {
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return bytes.buffer;
  }

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
      const cached = await archiveStore.getItem<RepositoryArchiveStorageData>(repoId);
      
      if (!cached) {
        console.log(`No cached archive found for ${repoId}`);
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
      
      // Ensure compressedFiles is valid before attempting decompression
      if (!cached.compressedFilesBase64 || cached.compressedFilesBase64.length === 0) {
        console.error(`Cached archive for ${repoId} has invalid or empty compressedFiles. Removing from cache.`);
        await archiveStore.removeItem(repoId);
        return null;
      }

      // Convert base64 back to ArrayBuffer
      const compressedArrayBuffer = this.base64ToArrayBuffer(cached.compressedFilesBase64);
      
      console.log(`DEBUG: Decompressing cached archive: ${compressedArrayBuffer.byteLength} bytes, algorithm: ${cached.metadata.compressionMetadata.algorithm}`);

      // Decompress the files
      const filesJson = await AdvancedCompressionService.decompressAuto(
        compressedArrayBuffer,
        cached.metadata.compressionMetadata
      );
      
      if (!filesJson || typeof filesJson !== 'string') {
        console.error(`Decompression returned invalid data for ${repoId}:`, typeof filesJson);
        await archiveStore.removeItem(repoId);
        return null;
      }
      
      const files: FileInfo[] = JSON.parse(filesJson);
      
      console.log(`Successfully decompressed ${files.length} files from cache (ratio: ${cached.metadata.compressionRatio.toFixed(2)}:1)`);
      return files;
    } catch (error) {
      console.error('Failed to get cached repository archive:', error);
      // Remove corrupted cache entry
      try {
        const repoId = this.generateRepoId(owner, repo, branch);
        await archiveStore.removeItem(repoId);
        console.log(`Removed corrupted cache entry for ${repoId}`);
      } catch (removeError) {
        console.error('Failed to remove corrupted cache entry:', removeError);
      }
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

      console.log(`Compressing ${files.length} files (${(totalSize / 1024 / 1024).toFixed(2)} MB) for cache storage...`);
      
      // Compress the files using extreme compression
      const filesJson = JSON.stringify(files);
      const compressionResult = await AdvancedCompressionService.compressAuto(filesJson);
      
      console.log(`Compression completed: ${compressionResult.compressionRatio.toFixed(2)}:1 ratio, ${((compressionResult.originalSize - compressionResult.compressedSize) / 1024 / 1024).toFixed(2)} MB saved`);

      // Convert ArrayBuffer to base64 for storage compatibility
      const compressedFilesBase64 = this.arrayBufferToBase64(compressionResult.compressedData);
      
      const archiveData: RepositoryArchiveStorageData = {
        metadata: {
          id: repoId,
          owner,
          repo,
          branch,
          downloadedAt: Date.now(),
          originalSize: compressionResult.originalSize, // Use the actual JSON size that was compressed
          compressedSize: compressionResult.compressedSize,
          compressionRatio: compressionResult.compressionRatio,
          fileCount: files.length,
          compressionMetadata: compressionResult.metadata
        },
        compressedFilesBase64,
        rawArchive
      };

      // Store the archive
      await archiveStore.setItem(repoId, archiveData);
      console.log(`Stored repository archive for ${repoId} (${files.length} files, ${(compressionResult.compressedSize / 1024).toFixed(2)} KB compressed)`);
      
      // Verify the data was stored correctly by immediately reading it back
      const verification = await archiveStore.getItem<RepositoryArchiveStorageData>(repoId);
      
      if (!verification || !verification.compressedFilesBase64) {
        console.error(`Data verification failed for ${repoId}. No data found after storage.`);
        throw new Error('Failed to store archive data correctly');
      }
      
      // Verify the base64 data can be converted back to the correct size
      const verificationBuffer = this.base64ToArrayBuffer(verification.compressedFilesBase64);
      if (verificationBuffer.byteLength !== compressionResult.compressedSize) {
        console.error(`Data verification failed for ${repoId}. Expected ${compressionResult.compressedSize} bytes, got ${verificationBuffer.byteLength}`);
        throw new Error('Failed to store archive data correctly');
      }
      console.log(`Data verification passed for ${repoId}`);

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
          const archive = await archiveStore.getItem<RepositoryArchiveStorageData>(key);
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
          const archive = await archiveStore.getItem<RepositoryArchiveStorageData>(key);
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