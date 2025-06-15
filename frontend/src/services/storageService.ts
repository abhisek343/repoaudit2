import localforage from 'localforage';
import { AnalysisResult } from '../types';

// Create an IndexedDB store using localforage
const analysisStore = localforage.createInstance({
  name: 'repo-auditor',
  storeName: 'analysis-results'
});

export class StorageService {
  private static readonly MAX_RESULTS = 10; // Keep only the last 10 results

  /**
   * Store an analysis result with automatic cleanup of old results
   */
  static async storeAnalysisResult(result: AnalysisResult): Promise<void> {
    try {
      // Get existing results (array)
      const existing: AnalysisResult[] = (await analysisStore.getItem<AnalysisResult[]>('results')) || [];
      // Prepend new result
      const updated = [result, ...existing.filter(r => r.id !== result.id)];
      // Trim to MAX_RESULTS
      const trimmed = updated.slice(0, this.MAX_RESULTS);
      await analysisStore.setItem('results', trimmed);
      console.log(`Stored analysis result with ID: ${result.id}`);
      console.log(`Total stored results: ${trimmed.length}`);
    } catch (error) {
      console.error('Failed to store analysis result in IndexedDB:', error);
      throw error;
    }
  }

  /**
   * Get the most recent analysis result
   */
  static async getLatestAnalysisResult(): Promise<AnalysisResult | null> {
    try {
      const results = (await analysisStore.getItem<AnalysisResult[]>('results')) || [];
      return results.length > 0 ? results[0] : null;
    } catch (error) {
      console.error('Failed to get latest analysis result from IndexedDB:', error);
      throw error; // Re-throw error
    }
  }

  /**
   * Get an analysis result by ID
   */
  static async getAnalysisResultById(id: string): Promise<AnalysisResult | null> {
    try {
      const results = (await analysisStore.getItem<AnalysisResult[]>('results')) || [];
      return results.find(r => r.id === id) || null;
    } catch (error) {
      console.error('Failed to get analysis result by ID from IndexedDB:', error);
      // Re-throw the error so the caller can handle it more specifically
      // This helps differentiate between "not found" (returns null) and "storage error" (throws)
      throw error;
    }
  }

  /**
   * Clear all analysis results
   */
  static async clearAllResults(): Promise<void> {
    try {
      await analysisStore.removeItem('results');
      console.log('Cleared all analysis results from IndexedDB');
    } catch (error) {
      console.error('Failed to clear analysis results from IndexedDB:', error);
      throw error; // Re-throw error
    }
  }

  /**
   * Utility to list all results (for debugging)
   */
  static async getAllResults(): Promise<AnalysisResult[]> {
    try {
      const results = (await analysisStore.getItem<AnalysisResult[]>('results')) || [];
      return results; // Return the full array
    } catch (error) {
      console.error('Failed to list all analysis results from IndexedDB:', error); // Corrected log message
      // Re-throw the error for consistency
      throw error;
    }
  }
}
