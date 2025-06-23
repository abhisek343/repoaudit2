/**
 * @file IndexedDB utility for storing and managing analysis reports.
 *
 * This implementation follows best practices for database versioning and transaction management.
 * By centralizing database logic, we ensure consistent and reliable data handling across the application.
 */

// Database configuration
const DB_NAME = 'RepoAuditDB';
const DB_VERSION = 1; // Increment this to trigger onupgradeneeded
const STORE_NAME = 'reports';

/**
 * Opens and initializes the IndexedDB database.
 * @returns A promise that resolves with the database instance.
 */
export const openDB = (): Promise<IDBDatabase> => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => {
      console.error('Error opening IndexedDB');
      reject('Error opening database');
    };

    request.onsuccess = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      resolve(db);
    };

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
        // Indexes for efficient querying
        store.createIndex('repositoryName', 'repositoryName', { unique: false });
        store.createIndex('createdAt', 'createdAt', { unique: false });
        store.createIndex('category', 'category', { unique: false });
      }
    };
  });
};

import { SavedReport } from '../types';

/**
 * Saves or updates a report in IndexedDB.
 * @param report The report to save.
 */
export const saveReport = async (report: SavedReport): Promise<void> => {
  try {
    const db = await openDB();
    const transaction = db.transaction(STORE_NAME, 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    
    // Add or update the report
    store.put({
      ...report,
      lastAccessed: new Date().toISOString(),
    }, report.id);

    return new Promise((resolve, reject) => {
      transaction.oncomplete = () => resolve();
      transaction.onerror = (event) => {
        console.error('Error saving report:', event);
        reject('Error saving report');
      };
    });
  } catch (error) {
    console.error('Failed to save report:', error);
    throw error;
  }
};

/**
 * Retrieves all reports from IndexedDB, sorted by creation date.
 * @returns A promise that resolves with an array of saved reports.
 */
export const getAllReports = async (): Promise<SavedReport[]> => {
  try {
    const db = await openDB();
    const transaction = db.transaction(STORE_NAME, 'readonly');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.getAll();

    return new Promise((resolve, reject) => {
      request.onsuccess = () => {
        const reports = request.result || [];
        // Sort by creation date (newest first)
        resolve(reports.sort((a, b) => 
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        ));
      };
      
      request.onerror = (event) => {
        console.error('Error getting reports:', event);
        reject('Error getting reports');
      };
    });
  } catch (error) {
    console.error('Failed to get reports:', error);
    return [];
  }
};
/**
 * Retrieves a report by its repository name.
 * @param repoName The name of the repository to find.
 * @returns A promise that resolves with the report, or undefined if not found.
 */
export const getReportByRepoName = async (repoName: string): Promise<SavedReport | undefined> => {
  try {
    const db = await openDB();
    const transaction = db.transaction(STORE_NAME, 'readonly');
    const store = transaction.objectStore(STORE_NAME);
    const index = store.index('repositoryName');
    const request = index.get(repoName);

    return new Promise((resolve, reject) => {
      request.onsuccess = () => {
        resolve(request.result);
      };
      
      request.onerror = (event) => {
        console.error(`Error getting report for ${repoName}:`, event);
        reject(`Error getting report for ${repoName}`);
      };
    });
  } catch (error) {
    console.error(`Failed to get report for ${repoName}:`, error);
    return undefined;
  }
};

/**
 * Deletes a report from IndexedDB by its ID.
 * @param id The ID of the report to delete.
 */
export const deleteReport = async (id: string): Promise<void> => {
  try {
    const db = await openDB();
    const transaction = db.transaction(STORE_NAME, 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    
    store.delete(id);

    return new Promise((resolve, reject) => {
      transaction.oncomplete = () => resolve();
      transaction.onerror = (event) => {
        console.error('Error deleting report:', event);
        reject('Error deleting report');
      };
    });
  } catch (error) {
    console.error('Failed to delete report:', error);
    throw error;
  }
};

/**
 * Clears all reports from the IndexedDB store.
 */
export const clearAllReports = async (): Promise<void> => {
  try {
    const db = await openDB();
    const transaction = db.transaction(STORE_NAME, 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    
    store.clear();

    return new Promise((resolve, reject) => {
      transaction.oncomplete = () => resolve();
      transaction.onerror = (event) => {
        console.error('Error clearing reports:', event);
        reject('Error clearing reports');
      };
    });
  } catch (error) {
    console.error('Failed to clear reports:', error);
    throw error;
  }
};
