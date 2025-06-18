import React, { useEffect, useState } from 'react';
import { useParams, useLocation } from 'react-router-dom';
import { AnalysisService } from '../services/analysisService';
import { AnalysisResult } from '../types';
import FeatureFileMatrix from '../components/diagrams/FeatureFileMatrix';
import ErrorDisplay from '../components/ui/ErrorDisplay';

const FeatureMatrixPage: React.FC = () => {
  const { reportId } = useParams<{ reportId: string }>();
  const location = useLocation();
  const [reportData, setReportData] = useState<AnalysisResult | null>(
    location.state?.reportData || null
  );
  const [loading, setLoading] = useState(!reportData);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchReport = async () => {
      if (reportData) return;

      if (reportId) {
        try {
          const analysisService = new AnalysisService();
          const report = await analysisService.getAnalysisResult(reportId);
          if (report) {
            setReportData(report);
          } else {
            setError('Report not found.');
          }
        } catch (err) {
          setError('Failed to fetch report data.');
          console.error(err);
        } finally {
          setLoading(false);
        }
      } else {
        setError('No report ID provided.');
        setLoading(false);
      }
    };

    fetchReport();
  }, [reportId, reportData]);

  if (loading) {
    return <div className="p-8 text-center">Loading...</div>;
  }

  if (error) {
    return <ErrorDisplay title="Error" message={error} />;
  }

  const featureMatrixData = reportData?.advancedAnalysis?.featureFileMatrix || [];

  return (
    <div className="min-h-screen bg-gray-50 p-4 sm:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-2xl font-bold text-gray-900 mb-4">Features vs. Code Files</h1>
        <p className="text-gray-700 mb-6">
          This interactive chart shows which features (described in your .feature files) are implemented by which code files. Each colored cell indicates that a feature and a file are linked—helpful for understanding how high-level requirements map to your code.
        </p>
        <div className="bg-white shadow-lg rounded-lg p-4 overflow-x-auto">
          {featureMatrixData.length > 0 ? (
            <FeatureFileMatrix data={featureMatrixData} width={1200} height={800} />
          ) : (
            <ErrorDisplay 
              title="No Feature Data"
              message="We couldn't find any feature-to-file mappings. Try running the analysis again or check your project's feature files."
            />
          )}
        </div>
      </div>
    </div>
  );
};

export default FeatureMatrixPage;
