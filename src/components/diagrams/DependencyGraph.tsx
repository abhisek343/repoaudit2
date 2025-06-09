import React, { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';
import { Search, Filter, ZoomIn, ZoomOut, RefreshCw, Info, BarChart2, GitBranch, Clock, AlertCircle, FileText, Layers, GitCommit, GitPullRequest, GitMerge, Calendar } from 'lucide-react';

interface GitCommit {
  hash: string;
  author: string;
  date: string;
  message: string;
  files: string[];
  additions: number;
  deletions: number;
}

interface DailyCommits {
  date: Date;
  commits: GitCommit[];
  count: number;
  authors: Set<string>;
  totalAdditions: number;
  totalDeletions: number;
  totalFiles: number;
}

interface DependencyNode {
  id: string;
  name: string;
  type: string;
  size: number;
  cluster?: string;
  gitHistory?: GitCommit[];
  metrics?: {
    complexity?: number;
    dependencies?: number;
    dependents?: number;
    lastModified?: string;
    linesOfCode?: number;
    testCoverage?: number;
    bugCount?: number;
    technicalDebt?: number;
    performanceScore?: number;
    securityScore?: number;
    maintainabilityScore?: number;
    commitFrequency?: number;
    contributors?: string[];
    cyclomaticComplexity?: number;
    cognitiveComplexity?: number;
    duplication?: number;
    codeSmells?: number;
    vulnerabilities?: number;
    hotspots?: number;
    reliability?: number;
    maintainability?: number;
    security?: number;
    coverage?: number;
    duplications?: number;
    issues?: number;
    debt?: number;
    effort?: number;
    commitCount?: number;
    lastCommit?: string;
    branchCount?: number;
    mergeCount?: number;
    conflictCount?: number;
  };
  x?: number;
  y?: number;
  fx?: number | null;
  fy?: number | null;
}

interface DependencyLink {
  source: DependencyNode;
  target: DependencyNode;
  type: string;
  strength: number;
  name?: string;
  version?: string;
  vulnerabilities?: number;
  metrics?: {
    frequency?: number;
    lastUsed?: string;
    dataVolume?: number;
    latency?: number;
    reliability?: number;
    security?: number;
    complexity?: number;
    coupling?: number;
    cohesion?: number;
    stability?: number;
    volatility?: number;
    risk?: number;
    impact?: number;
    criticality?: number;
  };
}

interface DependencyGraphProps {
  nodes: DependencyNode[];
  links: DependencyLink[];
  width: number;
  height: number;
}

const DependencyGraph: React.FC<DependencyGraphProps> = ({
  nodes,
  links,
  width = 800,
  height = 600
}) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTypes, setSelectedTypes] = useState<string[]>(['module', 'package', 'file']);
  const [selectedClusters, setSelectedClusters] = useState<string[]>([]);
  const [zoomLevel, setZoomLevel] = useState(1);
  const [highlightedNode, setHighlightedNode] = useState<string | null>(null);
  const [selectedNode, setSelectedNode] = useState<DependencyNode | null>(null);
  const [showMetrics, setShowMetrics] = useState(true);
  const [layoutMode, setLayoutMode] = useState<'force' | 'hierarchical' | 'circular'>('force');
  const [viewMode, setViewMode] = useState<'standard' | 'metrics' | 'complexity' | 'security' | 'git'>('git');
  const [timeRange, setTimeRange] = useState<[Date, Date]>([
    new Date(Date.now() - 90 * 24 * 60 * 60 * 1000), // 90 days ago
    new Date()
  ]);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [dailyCommits, setDailyCommits] = useState<DailyCommits[]>([]);
  const [selectedCommit, setSelectedCommit] = useState<GitCommit | null>(null);
  const [showGitHistory, setShowGitHistory] = useState(false);
  const [gitFilter, setGitFilter] = useState({
    showMerges: true,
    showCommits: true,
    showBranches: true,
    minContributions: 0,
  });
  const [filterMetrics, setFilterMetrics] = useState({
    minComplexity: 0,
    maxComplexity: 100,
    minDependencies: 0,
    maxDependencies: 100,
    minSecurityScore: 0,
    maxSecurityScore: 100,
  });

  // Calculate advanced graph statistics
  const stats = {
    totalNodes: nodes.length,
    totalLinks: links.length,
    avgComplexity: d3.mean(nodes.map(n => n.metrics?.complexity || 0)) || 0,
    avgDependencies: d3.mean(nodes.map(n => n.metrics?.dependencies || 0)) || 0,
    criticalNodes: nodes.filter(n => (n.metrics?.complexity || 0) > 80).length,
    highDependencyNodes: nodes.filter(n => (n.metrics?.dependencies || 0) > 10).length,
    clusters: Array.from(new Set(nodes.map(n => n.cluster || 'default'))).length,
    securityIssues: nodes.filter(n => (n.metrics?.securityScore || 0) < 50).length,
    maintainabilityIssues: nodes.filter(n => (n.metrics?.maintainabilityScore || 0) < 50).length,
    performanceIssues: nodes.filter(n => (n.metrics?.performanceScore || 0) < 50).length,
    totalTechnicalDebt: d3.sum(nodes.map(n => n.metrics?.technicalDebt || 0)) || 0,
    avgTestCoverage: d3.mean(nodes.map(n => n.metrics?.testCoverage || 0)) || 0,
    totalBugs: d3.sum(nodes.map(n => n.metrics?.bugCount || 0)) || 0,
    totalCodeSmells: d3.sum(nodes.map(n => n.metrics?.codeSmells || 0)) || 0,
    totalVulnerabilities: d3.sum(nodes.map(n => n.metrics?.vulnerabilities || 0)) || 0,
    totalHotspots: d3.sum(nodes.map(n => n.metrics?.hotspots || 0)) || 0,
  };

  // Create color scales
  const nodeColor = d3.scaleOrdinal<string>()
    .domain(['module', 'package', 'file'])
    .range(['#4299e1', '#48bb78', '#ed8936']);

  const linkColor = d3.scaleOrdinal<string>()
    .domain(['import', 'require', 'dependency'])
    .range(['#4299e1', '#48bb78', '#ed8936']);

  const clusterColor = d3.scaleOrdinal<string>()
    .domain(Array.from(new Set(nodes.map(n => n.cluster || 'default'))))
    .range(d3.schemeSet3);

  const complexityColor = d3.scaleSequential(d3.interpolateRdYlGn)
    .domain([0, 100]);

  // Add git-specific color scales
  const gitActivityColor = d3.scaleSequential(d3.interpolateYlOrRd)
    .domain([0, 100]);

  const commitFrequencyColor = d3.scaleSequential(d3.interpolateBlues)
    .domain([0, 50]);

  // Process git history into daily commits
  useEffect(() => {
    const allCommits = nodes.flatMap(node => node.gitHistory || []);
    const commitsByDay = new Map<string, GitCommit[]>();

    allCommits.forEach(commit => {
      const date = new Date(commit.date).toISOString().split('T')[0];
      if (!commitsByDay.has(date)) {
        commitsByDay.set(date, []);
      }
      commitsByDay.get(date)?.push(commit);
    });

    const processedCommits: DailyCommits[] = Array.from(commitsByDay.entries())
      .map(([date, commits]) => ({
        date: new Date(date),
        commits,
        count: commits.length,
        authors: new Set(commits.map(c => c.author)),
        totalAdditions: commits.reduce((sum, c) => sum + c.additions, 0),
        totalDeletions: commits.reduce((sum, c) => sum + c.deletions, 0),
        totalFiles: commits.reduce((sum, c) => sum + c.files.length, 0)
      }))
      .sort((a, b) => a.date.getTime() - b.date.getTime());

    setDailyCommits(processedCommits);
  }, [nodes]);

  useEffect(() => {
    if (!svgRef.current || !dailyCommits.length) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();

    const margin = { top: 40, right: 40, bottom: 60, left: 60 };
    const innerWidth = width - margin.left - margin.right;
    const innerHeight = height - margin.top - margin.bottom;

    const g = svg
      .attr("width", width)
      .attr("height", height)
      .append("g")
      .attr("transform", `translate(${margin.left},${margin.top})`);

    // Create scales
    const x = d3.scaleTime()
      .domain(d3.extent(dailyCommits, d => d.date) as [Date, Date])
      .range([0, innerWidth]);

    const y = d3.scaleLinear()
      .domain([0, d3.max(dailyCommits, d => d.count) || 0])
      .range([innerHeight, 0])
      .nice();

    // Create axes
    const xAxis = d3.axisBottom(x)
      .ticks(d3.timeDay.every(7))
      .tickFormat(d3.timeFormat("%b %d"));

    const yAxis = d3.axisLeft(y)
      .ticks(5);

    g.append("g")
      .attr("transform", `translate(0,${innerHeight})`)
      .call(xAxis)
      .selectAll("text")
      .attr("transform", "rotate(-45)")
      .style("text-anchor", "end");

    g.append("g")
      .call(yAxis);

    // Add axis labels
    g.append("text")
      .attr("transform", `translate(${innerWidth / 2}, ${innerHeight + 40})`)
      .style("text-anchor", "middle")
      .text("Date");

    g.append("text")
      .attr("transform", "rotate(-90)")
      .attr("y", -40)
      .attr("x", -innerHeight / 2)
      .style("text-anchor", "middle")
      .text("Number of Commits");

    // Create the line
    const line = d3.line<DailyCommits>()
      .x(d => x(d.date))
      .y(d => y(d.count))
      .curve(d3.curveMonotoneX);

    // Add the line path
    g.append("path")
      .datum(dailyCommits)
      .attr("fill", "none")
      .attr("stroke", "#4299e1")
      .attr("stroke-width", 2)
      .attr("d", line);

    // Add dots for each data point
    const dots = g.selectAll(".dot")
      .data(dailyCommits)
      .enter()
      .append("circle")
      .attr("class", "dot")
      .attr("cx", d => x(d.date))
      .attr("cy", d => y(d.count))
      .attr("r", d => Math.sqrt(d.count) * 2 + 4)
      .attr("fill", "#4299e1")
      .attr("opacity", 0.7)
      .style("cursor", "pointer")
      .on("mouseover", function(event, d) {
        d3.select(this)
          .attr("opacity", 1)
          .attr("r", Math.sqrt(d.count) * 2 + 6);

        // Show tooltip
        const tooltip = d3.select("#tooltip");
        tooltip
          .style("display", "block")
          .html(`
            <div class="tooltip-date">${d.date.toLocaleDateString()}</div>
            <div class="tooltip-commits">${d.count} commits</div>
            <div class="tooltip-authors">${d.authors.size} authors</div>
            <div class="tooltip-changes">
              <span class="additions">+${d.totalAdditions}</span>
              <span class="deletions">-${d.totalDeletions}</span>
            </div>
          `)
          .style("left", (event.pageX + 10) + "px")
          .style("top", (event.pageY - 28) + "px");
      })
      .on("mouseout", function() {
        d3.select(this)
          .attr("opacity", 0.7)
          .attr("r", d => Math.sqrt(d.count) * 2 + 4);

        d3.select("#tooltip")
          .style("display", "none");
      })
      .on("click", (event, d) => {
        setSelectedDate(d.date);
      });

    // Add zoom behavior
    const zoom = d3.zoom()
      .scaleExtent([0.5, 5])
      .on("zoom", (event) => {
        const newX = event.transform.rescaleX(x);
        const newY = event.transform.rescaleY(y);

        g.select(".x-axis").call(xAxis.scale(newX));
        g.select(".y-axis").call(yAxis.scale(newY));

        g.select("path")
          .attr("d", line.x(d => newX(d.date)).y(d => newY(d.count)));

        dots
          .attr("cx", d => newX(d.date))
          .attr("cy", d => newY(d.count));
      });

    svg.call(zoom as any);

  }, [dailyCommits, width, height, timeRange]);

  return (
    <div className="dependency-graph-container">
      <div className="graph-controls">
        <div className="control-group">
          <button onClick={() => setViewMode('git')}>
            <Calendar />
            Timeline View
          </button>
          <input
            type="date"
            value={timeRange[0].toISOString().split('T')[0]}
            onChange={(e) => setTimeRange([new Date(e.target.value), timeRange[1]])}
          />
          <input
            type="date"
            value={timeRange[1].toISOString().split('T')[0]}
            onChange={(e) => setTimeRange([timeRange[0], new Date(e.target.value)])}
          />
        </div>
      </div>
      <div className="graph-content">
        <svg ref={svgRef} />
        <div id="tooltip" className="tooltip" style={{ display: 'none' }}></div>
        {selectedDate && (
          <div className="commit-details-panel">
            <h3>Commits for {selectedDate.toLocaleDateString()}</h3>
            <div className="commit-list">
              {dailyCommits
                .find(d => d.date.toDateString() === selectedDate.toDateString())
                ?.commits.map(commit => (
                  <div key={commit.hash} className="commit-item">
                    <div className="commit-header">
                      <span className="commit-hash">{commit.hash.substring(0, 7)}</span>
                      <span className="commit-author">{commit.author}</span>
                      <span className="commit-time">
                        {new Date(commit.date).toLocaleTimeString()}
                      </span>
                    </div>
                    <div className="commit-message">{commit.message}</div>
                    <div className="commit-stats">
                      <span className="additions">+{commit.additions}</span>
                      <span className="deletions">-{commit.deletions}</span>
                      <span className="files">{commit.files.length} files</span>
                    </div>
                  </div>
                ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default DependencyGraph; 