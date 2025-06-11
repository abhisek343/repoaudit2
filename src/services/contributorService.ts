import { ContributorStats, ContributorDetail } from '../types/contributor'; // Use ContributorDetail

class ContributorService {
  private static instance: ContributorService;
  private cache: Map<string, { data: ContributorStats, timestamp: number }> = new Map(); // Added timestamp for cache expiry
  private cacheTimeout = 1000 * 60 * 5; // 5 minutes

  private constructor() {}

  public static getInstance(): ContributorService {
    if (!ContributorService.instance) {
      ContributorService.instance = new ContributorService();
    }
    return ContributorService.instance;
  }

  async getContributorStats(period: 'week' | 'month' | 'year' = 'month'): Promise<ContributorStats> {
    const cacheKey = `stats_${period}`;
    const cachedEntry = this.cache.get(cacheKey);
    
    if (cachedEntry && (Date.now() - cachedEntry.timestamp < this.cacheTimeout)) {
      return cachedEntry.data;
    }

    try {
      // This endpoint needs to be implemented on the backend (server.ts)
      // It should query GitHub for commit activity within the specified period
      // and aggregate stats per contributor.
      const response = await fetch(`/api/contributors/stats?period=${period}`);
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({})); // Try to parse error
        throw new Error(errorData.error || `Failed to fetch contributor stats (status: ${response.status})`);
      }

      const data: ContributorStats = await response.json();
      
      // Validate data structure
      if (!data || !data.topContributors || !Array.isArray(data.topContributors) || !data.period) {
          console.error("Invalid data structure received for contributor stats:", data);
          throw new Error("Invalid data structure received for contributor stats.");
      }

      this.cache.set(cacheKey, { data, timestamp: Date.now() });
      
      return data;
    } catch (error) {
      console.error('Error fetching contributor stats:', error);
      // Propagate a more specific error or the original one
      throw error instanceof Error ? error : new Error('Failed to fetch contributor stats due to an unknown error.');
    }
  }

  // This method might be less used if all contributor data comes from the main AnalysisResult
  async getContributorDetails(contributorLogin: string): Promise<ContributorDetail | null> { // Return type ContributorDetail
    try {
      // This endpoint also needs backend implementation
      const response = await fetch(`/api/contributors/details/${contributorLogin}`);
      if (!response.ok) {
        if (response.status === 404) return null; // Contributor not found
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Failed to fetch contributor details (status: ${response.status})`);
      }
      const data: ContributorDetail = await response.json();
       if (!data || !data.id || !data.name) { // Basic validation
          console.error("Invalid data structure received for contributor details:", data);
          throw new Error("Invalid data structure received for contributor details.");
      }
      return data;
    } catch (error) {
      console.error(`Error fetching contributor details for ${contributorLogin}:`, error);
      throw error;
    }
  }
}

export default ContributorService;
