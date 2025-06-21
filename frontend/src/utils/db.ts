// Database configuration
const DB_NAME = 'RepoAuditDB';
const DB_VERSION = 1;
const STORE_NAME = 'reports';

// Open or create the database
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
      
      // Create object store if it doesn't exist
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
        // Create indexes for querying
        store.createIndex('createdAt', 'createdAt', { unique: false });
        store.createIndex('category', 'category', { unique: false });
        store.createIndex('repositoryName', 'repositoryName', { unique: false });
      }
    };
  });
};

// Save a report to IndexedDB
export const saveReport = async (report: any): Promise<void> => {
  try {
    const db = await openDB();
    const transaction = db.transaction(STORE_NAME, 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    
    // Add or update the report
    store.put({
      ...report,
      lastAccessed: new Date().toISOString(),
    });

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

// Get all reports from IndexedDB
export const getAllReports = async (): Promise<any[]> => {
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

// Delete a report from IndexedDB
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

// Clear all reports from IndexedDB
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
