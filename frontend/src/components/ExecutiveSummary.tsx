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
  const summaryToDisplay = aiSummary && aiSummary.length > 50 ? aiSummary : fallbackSummary;
  const insightsToDisplay = aiSummary && aiSummary.length > 50 ? [] : getFallbackInsights();


  return (
    <div className="bg-white rounded-2xl shadow-lg p-6 md:p-8 mb-8 border border-gray-100">
      <h3 className="text-2xl font-bold text-gray-900 mb-6 flex items-center">
        <Brain className="w-6 h-6 text-indigo-500 mr-3" />
        Executive Summary
      </h3>
      
      <div className="prose prose-lg max-w-none prose-indigo">
        <div className="bg-gradient-to-r from-indigo-50 to-purple-50 rounded-xl p-6 mb-6 border-l-4 border-indigo-500">
          <p className="text-gray-800 leading-relaxed whitespace-pre-wrap">
            {summaryToDisplay}
          </p>
          {(!aiSummary || aiSummary.length <= 50) && (
            <p className="text-xs text-indigo-700 mt-3">
                <AlertTriangle className="inline w-3 h-3 mr-1" />
                This is a basic summary. For deeper insights, configure an AI provider in settings.
            </p>
          )}
        </div>

        {(insightsToDisplay.length > 0) && (
            <div className="mt-6">
            <h4 className="text-lg font-semibold text-gray-900 flex items-center mb-3">
                <Lightbulb className="w-5 h-5 text-yellow-500 mr-2" />
                Key Observations
            </h4>
            <ul className="space-y-2 text-gray-700 text-sm">
                {insightsToDisplay.map((insight, index) => (
                <li key={index} className="flex items-start">
                    <span className="w-2 h-2 bg-indigo-400 rounded-full mt-1.5 mr-2.5 flex-shrink-0"></span>
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
