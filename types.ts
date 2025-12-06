export enum ThreatLevel {
  Safe = 'Safe',
  Suspicious = 'Suspicious',
  HighRisk = 'High-Risk',
  Fraud = 'Fraud'
}

export enum Verdict {
  Trust = 'Trust',
  DoNotTrust = 'Do NOT Trust'
}

export interface AnalysisResult {
  threatLevel: ThreatLevel;
  reason: string;
  warning: string;
  finalVerdict: Verdict;
  safetyScore: number;
  analysisSteps: string[];
}

export interface AnalysisHistoryItem extends AnalysisResult {
  id: string;
  timestamp: number;
  preview: string;
  type: 'text' | 'image' | 'video' | 'binary';
}