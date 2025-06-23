/**
 * @file Manages analysis reports, handling storage, retrieval, and migration.
 *
 * This service abstracts the underlying database logic, providing a clean API for report management.
 * It includes functionality for migrating legacy reports from localStorage to IndexedDB.
 */
import { SavedReport } from '../types';
import { saveReport, getAllReports, getReportByRepoName, deleteReport as deleteReportFromDB, clearAllReports } from '../utils/db';
import { toast } from 'react-hot-toast';

/**
 * Migrates reports from localStorage to IndexedDB to support the updated storage mechanism.
 * This ensures a seamless transition for users with existing data.
 */
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

/**
 * Fetches all saved reports from the database.
 * @returns A promise that resolves with an array of reports.
 */
export const getReports = async (): Promise<SavedReport[]> => {
  try {
    return await getAllReports();
  } catch (error) {
    console.error('Failed to get reports:', error);
    throw error;
  }
};

/**
 * Saves or updates a report in the database.
 * If a report with the same repository name exists, it's updated; otherwise, a new report is created.
 * @param report The report data to save.
 * @returns The ID of the saved or updated report.
 */
export const saveReportToDB = async (report: Omit<SavedReport, 'id' | 'lastAccessed'>): Promise<string> => {
  try {
    const existingReport = await getReportByRepoName(report.repositoryName);
    
    const reportToSave: SavedReport = {
      ...report,
      id: existingReport?.id || `report_${Date.now()}`,
      lastAccessed: new Date().toISOString(),
    };
    
    await saveReport(reportToSave);
    toast.success(`Report ${existingReport ? 'updated' : 'saved'} successfully!`);
    return reportToSave.id;
  } catch (error) {
    console.error('Failed to save report:', error);
    toast.error('Failed to save report.');
    throw error;
  }
};

/**
 * Deletes a report from the database by its ID.
 * @param id The ID of the report to delete.
 */
export const deleteReport = async (id: string): Promise<void> => {
  try {
    await deleteReportFromDB(id);
  } catch (error) {
    console.error('Failed to delete report:', error);
    throw error;
  }
};

/**
 * Clears all reports from the database.
 */
export const clearReports = async (): Promise<void> => {
  try {
    await clearAllReports();
  } catch (error) {
    console.error('Failed to clear reports:', error);
    throw error;
  }
};
