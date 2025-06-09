import { ContributorStats } from '../types/contributor';

class ContributorService {
  private static instance: ContributorService;
  private cache: Map<string, ContributorStats> = new Map();
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
    const cached = this.cache.get(cacheKey);
    
    if (cached) {
      return cached;
    }

    try {
      const response = await fetch(`/api/contributors/stats?period=${period}`);
      if (!response.ok) {
        throw new Error('Failed to fetch contributor stats');
      }

      const data = await response.json();
      this.cache.set(cacheKey, data);
      
      // Clear cache after timeout
      setTimeout(() => {
        this.cache.delete(cacheKey);
      }, this.cacheTimeout);

      return data;
    } catch (error) {
      console.error('Error fetching contributor stats:', error);
      throw error;
    }
  }

  async getContributorDetails(contributorId: string): Promise<any> {
    try {
      const response = await fetch(`/api/contributors/${contributorId}`);
      if (!response.ok) {
        throw new Error('Failed to fetch contributor details');
      }
      return await response.json();
    } catch (error) {
      console.error('Error fetching contributor details:', error);
      throw error;
    }
  }
}

export default ContributorService; 