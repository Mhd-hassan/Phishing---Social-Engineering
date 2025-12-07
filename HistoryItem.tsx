import React from 'react';
import { AnalysisHistoryItem, ThreatLevel } from '../types';
import { Clock, MessageSquare, Image as ImageIcon } from 'lucide-react';

interface HistoryItemProps {
  item: AnalysisHistoryItem;
  onClick: (item: AnalysisHistoryItem) => void;
}

const HistoryItem: React.FC<HistoryItemProps> = ({ item, onClick }) => {
  const getColor = (level: ThreatLevel) => {
     switch (level) {
       case ThreatLevel.Safe: return 'bg-emerald-500';
       case ThreatLevel.Suspicious: return 'bg-yellow-500';
       case ThreatLevel.HighRisk: return 'bg-orange-500';
       case ThreatLevel.Fraud: return 'bg-red-500';
       default: return 'bg-slate-500';
     }
  };

  return (
    <div 
      onClick={() => onClick(item)}
      className="group flex items-center gap-4 p-4 rounded-xl bg-slate-800 hover:bg-slate-750 border border-slate-700 hover:border-slate-600 transition-all cursor-pointer mb-3"
    >
      <div className={`w-2 h-12 rounded-full ${getColor(item.threatLevel)} shadow-[0_0_10px_rgba(0,0,0,0.3)] group-hover:shadow-[0_0_15px_rgba(255,255,255,0.1)] transition-all`} />
      
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          {item.type === 'text' ? <MessageSquare className="w-3 h-3 text-slate-400" /> : <ImageIcon className="w-3 h-3 text-slate-400" />}
          <span className="text-xs text-slate-400 font-mono">{new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
          <span className={`text-xs font-bold px-2 py-0.5 rounded bg-slate-900 border border-slate-700 ${item.safetyScore > 80 ? 'text-emerald-400' : 'text-red-400'}`}>
             {item.safetyScore}/100
          </span>
        </div>
        <p className="text-slate-200 text-sm truncate pr-4 opacity-90 group-hover:opacity-100 transition-opacity">
          {item.preview}
        </p>
      </div>
    </div>
  );
};

export default HistoryItem;
