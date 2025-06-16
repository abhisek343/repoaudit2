import { Brain, Lightbulb, AlertTriangle } from 'lucide-react'; // Added AlertTriangle
import { AnalysisResult } from '../types'; // Import AnalysisResult, removed Repository

interface ExecutiveSummaryProps {
  // Pass the full reportData or specific parts needed
  reportData: Pick<AnalysisResult, 'basicInfo' | 'aiSummary' | 'metrics'>;
}

const ExecutiveSummary = ({ reportData }: ExecutiveSummaryProps) => {
  const { basicInfo, aiSummary, metrics } = reportData;

  // Generate some simple insights if AI summary is not available or too short
  const getFallbackInsights = () => {
    const insights = [];
    if (metrics.totalCommits > 1000) insights.push("High commit frequency indicates active development.");
    else if (metrics.totalCommits > 100) insights.push("Consistent commit activity shows ongoing maintenance.");
    else insights.push("Relatively low commit activity observed.");

    if (metrics.totalContributors > 10) insights.push("Healthy number of contributors suggesting good collaboration.");
    else if (metrics.totalContributors > 3) insights.push("A small, focused team of contributors.");
    else insights.push("Very few contributors; potential bus factor risk.");
    
    return insights.slice(0, 4); // Max 4 fallback insights
  };

  const fallbackSummary = `The repository ${basicInfo.fullName} is primarily a ${basicInfo.language} project. It has ${basicInfo.stars} stars and ${metrics.totalCommits} commits from ${metrics.totalContributors} contributors. ${basicInfo.description || 'No further description provided.'}`;
  
  const summaryLinesToDisplay = aiSummary ? aiSummary.split('\n').filter(s => s.trim().length > 0) : [fallbackSummary]; // Split by newline, filter empty. Use fallback if aiSummary is empty or null.
  
  const insightsToDisplay = aiSummary ? [] : getFallbackInsights(); // Only show fallback insights if no AI summary


  return (
    <div className="bg-white rounded-2xl shadow-lg p-8 border border-gray-100">
      <h3 className="text-2xl font-bold text-gray-900 mb-6 flex items-center">
        <Brain className="w-6 h-6 text-blue-500 mr-3" />
        Executive Summary
      </h3>
      
      <div className="prose prose-indigo max-w-none">
        <div className="relative bg-cyan-50 rounded-2xl p-6 mb-8 shadow-xl border-2 border-cyan-200">
          <div className="absolute inset-0 bg-grid-cyan-100/50 [mask-image:linear-gradient(180deg,white,transparent)]" />
          
          <div className="relative space-y-4 z-10">
            {summaryLinesToDisplay.map((line, index) => {
              const [title, ...descParts] = line.split(':');
              const description = descParts.join(':').trim();
              return (
                <div key={index} className="flex group">
                  {/* Numbered indicator with connecting line */}
                  <div className="flex flex-col items-center w-8 mr-4">
                    <div className="w-6 h-6 bg-cyan-500 rounded-full flex items-center justify-center text-white text-xs font-bold">
                      {index + 1}
                    </div>
                    {index < summaryLinesToDisplay.length - 1 && (
                      <div className="flex-1 w-px bg-cyan-300 mt-2"></div>
                    )}
                  </div>

                  {/* Content card */}
                  <div className="flex-1 bg-white p-4 rounded-lg shadow-sm border border-cyan-200 group-hover:border-cyan-400 transition-colors">
                    <h4 className="text-sm font-semibold text-cyan-900 mb-2 flex items-center">
                      <svg className="w-4 h-4 mr-2 text-cyan-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      {title.trim()}
                    </h4>
                    {description && (
                      <div className="pl-6 border-l-2 border-cyan-100 ml-2">
                        <p className="text-xs text-cyan-800 leading-relaxed">
                          {description}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
          {(!aiSummary || summaryLinesToDisplay.length === 0) && ( // Check if aiSummary is empty or resulted in no lines
            <div className="mt-6 p-4 bg-cyan-50 rounded-lg border border-cyan-200 flex items-start animate-pulse-fast">
              <AlertTriangle className="w-4 h-4 text-cyan-600 mr-2 flex-shrink-0 mt-0.5" />
              <span className="text-sm text-cyan-800">
                Architectural analysis preview. Connect AI for full structural decomposition and dependency mapping.
              </span>
            </div>
          )}
        </div>

        {(insightsToDisplay.length > 0) && (
            <div className="mt-6 p-4 bg-gray-50 rounded-xl border border-gray-200">
            <h4 className="text-lg font-semibold text-gray-800 flex items-center mb-3">
                <Lightbulb className="w-5 h-5 text-yellow-600 mr-2" />
                Key Observations
            </h4>
            <ul className="space-y-2 text-gray-700 text-base">
                {insightsToDisplay.map((insight, index) => (
                <li key={index} className="flex items-start">
                    <span className="w-2.5 h-2.5 bg-blue-500 rounded-full mt-1.5 mr-3 flex-shrink-0 animate-pulse"></span>
                    <span>{insight}</span>
                </li>
                ))}
            </ul>
            </div>
        )}
      </div>
    </div>
  );
};

export default ExecutiveSummary;
