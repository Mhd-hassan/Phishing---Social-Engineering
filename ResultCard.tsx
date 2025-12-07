import React from 'react';
import { AnalysisResult, ThreatLevel, Verdict } from '../types';
import { ShieldCheck, ShieldAlert, AlertTriangle, AlertOctagon, CheckCircle, XCircle, Info, Activity, Search } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';

interface ResultCardProps {
  result: AnalysisResult;
}

const ResultCard: React.FC<ResultCardProps> = ({ result }) => {
  const getColors = (level: ThreatLevel) => {
    switch (level) {
      case ThreatLevel.Safe:
        return { bg: 'bg-emerald-900/30', border: 'border-emerald-500', text: 'text-emerald-400', icon: ShieldCheck };
      case ThreatLevel.Suspicious:
        return { bg: 'bg-yellow-900/30', border: 'border-yellow-500', text: 'text-yellow-400', icon: AlertTriangle };
      case ThreatLevel.HighRisk:
        return { bg: 'bg-orange-900/30', border: 'border-orange-500', text: 'text-orange-400', icon: AlertOctagon };
      case ThreatLevel.Fraud:
        return { bg: 'bg-red-900/30', border: 'border-red-600', text: 'text-red-500', icon: ShieldAlert };
      default:
        return { bg: 'bg-slate-800', border: 'border-slate-600', text: 'text-slate-400', icon: Info };
    }
  };

  const style = getColors(result.threatLevel);
  const Icon = style.icon;

  const chartData = [
    { name: 'Score', value: result.safetyScore },
    { name: 'Remaining', value: 100 - result.safetyScore },
  ];
  
  // Dynamic color for the gauge based on new stricter thresholds
  // > 90 = Safe (Green)
  // 41-89 = Suspicious (Yellow)
  // <= 40 = Fraud/High Risk (Red)
  const gaugeColor = result.safetyScore >= 90 ? '#10b981' : result.safetyScore > 70 ? '#eab308' : '#ef4444';

  return (
    <div className={`w-full rounded-2xl border ${style.border} ${style.bg} p-6 shadow-xl backdrop-blur-sm transition-all duration-500 animate-in fade-in slide-in-from-bottom-4`}>
      <div className="flex flex-col md:flex-row gap-8">
        
        {/* Left Column: Visual Score */}
        <div className="flex-shrink-0 flex flex-col items-center justify-center md:w-1/3 border-b md:border-b-0 md:border-r border-slate-700/50 pb-6 md:pb-0 md:pr-6">
           <div className="relative h-48 w-full max-w-[200px]">
             <ResponsiveContainer width="100%" height="100%">
               <PieChart>
                 <Pie
                   data={chartData}
                   cx="50%"
                   cy="50%"
                   innerRadius={60}
                   outerRadius={80}
                   startAngle={180}
                   endAngle={0}
                   paddingAngle={5}
                   dataKey="value"
                   stroke="none"
                   cornerRadius={10}
                 >
                   <Cell key="score" fill={gaugeColor} />
                   <Cell key="bg" fill="#334155" />
                 </Pie>
               </PieChart>
             </ResponsiveContainer>
             <div className="absolute inset-0 flex flex-col items-center justify-center pt-8">
                <span className={`text-4xl font-bold ${style.text}`}>{result.safetyScore}</span>
                <span className="text-xs text-slate-400 uppercase tracking-widest mt-1">Safety Score</span>
             </div>
           </div>
           
           <div className="mt-2 text-center">
              <div className={`inline-flex items-center gap-2 px-4 py-1.5 rounded-full border ${style.border} bg-slate-900/50`}>
                 <Icon className={`w-5 h-5 ${style.text}`} />
                 <span className={`font-bold ${style.text}`}>{result.threatLevel}</span>
              </div>
           </div>
        </div>

        {/* Right Column: Details */}
        <div className="flex-1 space-y-6">
          
          {/* Verdict */}
          <div>
            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Final Verdict</h3>
            <div className={`flex items-center gap-3 text-2xl font-bold ${result.finalVerdict === Verdict.Trust ? 'text-emerald-400' : 'text-red-500'}`}>
              {result.finalVerdict === Verdict.Trust ? <CheckCircle className="w-8 h-8" /> : <XCircle className="w-8 h-8" />}
              {result.finalVerdict}
            </div>
          </div>

          {/* Reason */}
          <div className="space-y-2">
             <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest">Forensic Analysis</h3>
             <p className="text-slate-200 leading-relaxed text-lg">{result.reason}</p>
          </div>

          {/* Forensic Steps (New) */}
          {result.analysisSteps && result.analysisSteps.length > 0 && (
            <div className="bg-black/20 rounded-lg p-3 border border-slate-700/50">
               <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-2 flex items-center gap-2">
                 <Search className="w-3 h-3" /> Forensic Trace
               </h3>
               <ul className="space-y-1">
                 {result.analysisSteps.map((step, idx) => (
                   <li key={idx} className="text-xs text-slate-300 flex items-start gap-2">
                     <Activity className="w-3 h-3 text-indigo-400 mt-0.5 shrink-0" />
                     {step}
                   </li>
                 ))}
               </ul>
            </div>
          )}

          {/* Suggestion/Warning */}
          <div className="bg-slate-900/60 rounded-lg p-4 border-l-4 border-blue-500">
             <h3 className="text-blue-400 font-semibold mb-1 flex items-center gap-2 text-sm uppercase tracking-wide">
                <Info className="w-4 h-4" /> Recommendation
             </h3>
             <p className="text-slate-300 italic text-sm md:text-base">{result.warning}</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ResultCard;