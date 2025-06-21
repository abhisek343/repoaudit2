import { SavedReport } from '../types';
import { saveReport, getAllReports, deleteReport as deleteReportFromDB, clearAllReports } from '../utils/db';
import { toast } from 'react-hot-toast';

// Migrate reports from localStorage to IndexedDB
export const migrateReportsToIndexedDB = async (): Promise<void> => {
  try {
    const reportsInLocalStorage: SavedReport[] = [];
    
    // Get all reports from localStorage
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith('report_')) {
        try {
          const reportItem = localStorage.getItem(key);
          if (reportItem) {
            const parsedReport = JSON.parse(reportItem);
            const report: SavedReport = {
              id: key.replace('report_', ''),
              repositoryName: parsedReport.repository?.fullName || parsedReport.repositoryName || 'Unknown Repo',
              category: parsedReport.category || 'comprehensive',
              createdAt: parsedReport.createdAt || new Date().toISOString(),
              summary: parsedReport.executiveSummary || parsedReport.summary || 'No summary available.',
              tags: parsedReport.tags || [parsedReport.repository?.language || 'general'],
              isPublic: parsedReport.isPublic || false,
              userId: parsedReport.userId || 'local',
              repositoryUrl: parsedReport.repositoryUrl || `https://github.com/${parsedReport.repository?.fullName}`,
              lastAccessed: parsedReport.lastAccessed || new Date().toISOString(),
            };
            reportsInLocalStorage.push(report);
          }
        } catch (error) {
          console.error(`Failed to parse report ${key}:`, error);
          toast.error(`Failed to parse report: ${key}`);
        }
      }
    }

    // Save all reports to IndexedDB
    if (reportsInLocalStorage.length > 0) {
      await Promise.all(reportsInLocalStorage.map(report => saveReport(report)));
      
      // Clear reports from localStorage after successful migration
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith('report_')) {
          localStorage.removeItem(key);
        }
      }
      
      console.log(`Successfully migrated ${reportsInLocalStorage.length} reports to IndexedDB`);
      toast.success(`Migrated ${reportsInLocalStorage.length} reports to local database`);
    }
  } catch (error) {
    console.error('Failed to migrate reports to IndexedDB:', error);
    throw error;
  }
};

// Get all reports from IndexedDB
export const getReports = async (): Promise<SavedReport[]> => {
  try {
    return await getAllReports();
  } catch (error) {
    console.error('Failed to get reports:', error);
    throw error;
  }
};

// Save a report to IndexedDB
export const saveReportToDB = async (report: Omit<SavedReport, 'id'> & { id?: string }): Promise<string> => {
  try {
    const reportId = report.id || `report_${Date.now()}`;
    const reportToSave: SavedReport = {
      ...report,
      id: reportId,
      lastAccessed: new Date().toISOString(),
    };
    
    await saveReport(reportToSave);
    return reportId;
  } catch (error) {
    console.error('Failed to save report:', error);
    throw error;
  }
};

// Delete a report from IndexedDB
export const deleteReport = async (id: string): Promise<void> => {
  try {
    await deleteReportFromDB(id);
  } catch (error) {
    console.error('Failed to delete report:', error);
    throw error;
  }
};

// Clear all reports from IndexedDB
export const clearReports = async (): Promise<void> => {
  try {
    await clearAllReports();
  } catch (error) {
    console.error('Failed to clear reports:', error);
    throw error;
  }
};
