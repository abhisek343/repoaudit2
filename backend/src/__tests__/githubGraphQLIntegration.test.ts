import { GitHubGraphQLService } from '../services/githubGraphQLService';

describe('GitHub GraphQL Service', () => {
  let graphqlService: GitHubGraphQLService;

  beforeEach(() => {
    // Create services without token for basic testing
    graphqlService = new GitHubGraphQLService();
  });

  it('should create GraphQL service without token', () => {
    expect(graphqlService).toBeDefined();
    expect(graphqlService.hasToken()).toBe(false);
  });

  it('should create GraphQL service with token', () => {
    const token = 'test-token';
    const serviceWithToken = new GitHubGraphQLService(token);
    
    expect(serviceWithToken.hasToken()).toBe(true);
  });

  it('should have required GraphQL methods', () => {
    expect(graphqlService.getBatchedRepositoryData).toBeDefined();
    expect(graphqlService.getRepository).toBeDefined();
    expect(graphqlService.getRepositoryFiles).toBeDefined();
    expect(graphqlService.getContributors).toBeDefined();
    expect(graphqlService.getCommits).toBeDefined();
    
    expect(typeof graphqlService.getBatchedRepositoryData).toBe('function');
    expect(typeof graphqlService.getRepository).toBe('function');
    expect(typeof graphqlService.getRepositoryFiles).toBe('function');
    expect(typeof graphqlService.getContributors).toBe('function');
    expect(typeof graphqlService.getCommits).toBe('function');
  });
});
