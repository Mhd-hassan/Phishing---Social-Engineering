import React, { useState, useRef, useEffect } from 'react';
import { analyzeContent } from './services/geminiService';
import { AnalysisResult, AnalysisHistoryItem } from './types';
import ResultCard from './components/ResultCard';
import HistoryItem from './components/HistoryItem';
import { Shield, Lock, ScanLine, Loader2, Upload, AlertCircle, History, Trash2, X, WifiOff, FileWarning, ServerCrash, ShieldAlert, Cpu, Wand2, FileCode, PlayCircle, HelpCircle, ChevronDown, ChevronUp, Mail, Globe, CheckCircle2, Zap, Eye, Binary, CreditCard, Crown, LayoutGrid } from 'lucide-react';

interface AppError {
  title: string;
  message: string;
  suggestion: string;
  type: 'validation' | 'network' | 'system' | 'safety' | 'quota';
}

interface FaqItem {
  question: string;
  answer: string;
}

// --- Image Processing Utility ---
const enhanceImageForAnalysis = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    
    img.onload = () => {
      URL.revokeObjectURL(url);
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) { reject(new Error("Canvas context unavailable")); return; }

      const MAX_W = 1920;
      let w = img.width;
      let h = img.height;
      if (w > MAX_W) {
        h = Math.round(h * (MAX_W / w));
        w = MAX_W;
      }
      canvas.width = w;
      canvas.height = h;

      ctx.drawImage(img, 0, 0, w, h);

      const imgData = ctx.getImageData(0, 0, w, h);
      const data = imgData.data;
      const copyData = new Uint8ClampedArray(data);

      // Simple Sharpening Kernel
      for (let y = 1; y < h - 1; y++) {
        for (let x = 1; x < w - 1; x++) {
          const idx = (y * w + x) * 4;
          const top = ((y - 1) * w + x) * 4;
          const bottom = ((y + 1) * w + x) * 4;
          const left = (y * w + (x - 1)) * 4;
          const right = (y * w + (x + 1)) * 4;

          for (let c = 0; c < 3; c++) { 
            const val = 5 * copyData[idx + c] 
                      - copyData[top + c] 
                      - copyData[bottom + c] 
                      - copyData[left + c] 
                      - copyData[right + c];
            data[idx + c] = Math.min(255, Math.max(0, val));
          }
        }
      }

      // Contrast Boost (20%)
      const contrast = 1.20;
      const intercept = 128 * (1 - contrast);

      for (let i = 0; i < data.length; i += 4) {
        data[i] = Math.min(255, Math.max(0, data[i] * contrast + intercept));
        data[i+1] = Math.min(255, Math.max(0, data[i+1] * contrast + intercept));
        data[i+2] = Math.min(255, Math.max(0, data[i+2] * contrast + intercept));
      }

      ctx.putImageData(imgData, 0, 0);
      resolve(canvas.toDataURL('image/jpeg', 0.95));
    };
    
    img.onerror = (e) => reject(e);
    img.src = url;
  });
};

const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = (error) => reject(error);
  });
};

const ServicesSection: React.FC = () => {
  const services = [
    {
      icon: ShieldAlert,
      title: "Phishing Detection",
      desc: "Real-time analysis of emails and messages to detect social engineering patterns."
    },
    {
      icon: Eye,
      title: "Deepfake Forensics",
      desc: "Video analysis analyzing lip-sync and facial artifacts to identify AI-generated content."
    },
    {
      icon: Binary,
      title: "Malware Audit",
      desc: "Static metadata analysis for .exe and .apk files to detect naming anomalies and risky signatures."
    },
    {
      icon: Zap,
      title: "Instant OCR",
      desc: "High-contrast text extraction from screenshots to read hidden malicious URLs."
    }
  ];

  return (
    <div className="py-8">
      <h3 className="text-xl font-bold flex items-center gap-2 text-slate-300 mb-6">
        <CheckCircle2 className="w-5 h-5" />
        Our Security Services
      </h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {services.map((s, idx) => (
          <div key={idx} className="bg-slate-800/40 border border-slate-700/50 p-4 rounded-xl flex items-start gap-4 hover:bg-slate-800 transition-colors">
            <div className="p-2 bg-indigo-500/10 rounded-lg text-indigo-400">
              <s.icon className="w-6 h-6" />
            </div>
            <div>
              <h4 className="font-bold text-slate-200">{s.title}</h4>
              <p className="text-sm text-slate-400 mt-1">{s.desc}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

interface PricingTier {
  name: string;
  price: string;
  period?: string;
  description: string;
  features: string[];
  cta: string;
  highlight?: boolean;
  icon: React.ElementType;
}

interface SubscriptionSectionProps {
  onSubscribe: (plan: string) => void;
}

const SubscriptionSection: React.FC<SubscriptionSectionProps> = ({ onSubscribe }) => {
  const tiers: PricingTier[] = [
    {
      name: "Free Guard",
      price: "$0",
      description: "Essential protection for individuals.",
      features: [
        "Basic Text Analysis",
        "Standard Image Scan",
        "5 Scans / Day",
        "Community Support"
      ],
      cta: "Current Plan",
      highlight: false,
      icon: Shield
    },
    {
      name: "Pro Shield",
      price: "$9",
      period: "/mo",
      description: "Advanced forensics for power users.",
      features: [
        "Deep Video Forensics",
        "APK/EXE Metadata Audit",
        "50 Scans / Day",
        "Priority Processing",
        "No Wait Time"
      ],
      cta: "Upgrade to Pro",
      highlight: true,
      icon: Crown
    },
    {
      name: "Premium Ops",
      price: "$29",
      period: "/mo",
      description: "Complete security suite for freelancers.",
      features: [
        "Unlimited Scans",
        "API Access (1k req/mo)",
        "24/7 Expert Chat",
        "Detailed PDF Reports",
        "Malware Heuristics"
      ],
      cta: "Get Premium",
      highlight: false,
      icon: Zap
    },
    {
      name: "Enterprise",
      price: "Custom",
      description: "Dedicated infrastructure for teams.",
      features: [
        "Custom API Rate Limits",
        "On-Premise Deployment",
        "Dedicated Account Manager",
        "SLA Guarantee",
        "SSO Integration"
      ],
      cta: "Contact Sales",
      highlight: false,
      icon: LayoutGrid
    }
  ];

  return (
    <div className="py-12">
      <div className="flex items-center justify-between mb-8">
        <h3 className="text-xl font-bold flex items-center gap-2 text-slate-300">
          <CreditCard className="w-5 h-5" />
          Plans & Pricing
        </h3>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
        {tiers.map((tier, idx) => (
          <div 
            key={idx} 
            className={`relative p-6 rounded-2xl border flex flex-col ${
              tier.highlight 
                ? 'bg-slate-800/80 border-indigo-500 shadow-xl shadow-indigo-500/10 scale-105 z-10' 
                : 'bg-slate-800/40 border-slate-700/50 hover:bg-slate-800 transition-colors'
            }`}
          >
            {tier.highlight && (
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 bg-gradient-to-r from-indigo-500 to-blue-500 rounded-full text-[10px] font-bold uppercase tracking-wider text-white shadow-lg">
                Most Popular
              </div>
            )}

            <div className="mb-4">
              <div className={`p-3 rounded-lg inline-block mb-3 ${tier.highlight ? 'bg-indigo-500/20 text-indigo-400' : 'bg-slate-700/50 text-slate-400'}`}>
                <tier.icon className="w-6 h-6" />
              </div>
              <h4 className={`text-lg font-bold ${tier.highlight ? 'text-indigo-400' : 'text-slate-200'}`}>
                {tier.name}
              </h4>
              <div className="mt-2 flex items-baseline gap-1">
                <span className="text-3xl font-bold text-white">{tier.price}</span>
                {tier.period && <span className="text-slate-500 text-sm">{tier.period}</span>}
              </div>
              <p className="text-sm text-slate-400 mt-2 min-h-[40px]">{tier.description}</p>
            </div>

            <ul className="space-y-3 mb-8 flex-1">
              {tier.features.map((feat, fIdx) => (
                <li key={fIdx} className="flex items-start gap-2 text-sm text-slate-300">
                  <CheckCircle2 className={`w-4 h-4 mt-0.5 shrink-0 ${tier.highlight ? 'text-indigo-400' : 'text-slate-500'}`} />
                  {feat}
                </li>
              ))}
            </ul>

            <button 
              onClick={() => onSubscribe(tier.name)}
              className={`w-full py-3 rounded-xl font-bold transition-all ${
                tier.highlight 
                  ? 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-900/20' 
                  : 'bg-slate-700 hover:bg-slate-600 text-slate-200 border border-slate-600'
              }`}
            >
              {tier.cta}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};

const ContactSection: React.FC = () => {
  return (
    <div className="py-8 border-t border-slate-800 mt-8">
      <div className="bg-gradient-to-br from-slate-900 to-indigo-950/30 rounded-2xl border border-slate-700/50 p-8 text-center md:text-left md:flex items-center justify-between gap-8">
        <div>
          <h3 className="text-2xl font-bold text-white mb-2">Need Enterprise Protection?</h3>
          <p className="text-slate-400 max-w-md">
            Contact our security research team for API access, dedicated hosting, or custom threat model integration.
          </p>
        </div>
        <div className="flex flex-col gap-3 mt-6 md:mt-0 min-w-[200px]">
          <a href="mailto:security@cybershield.ai" className="flex items-center gap-3 text-slate-300 bg-black/20 px-4 py-2 rounded-lg border border-white/5 hover:bg-slate-800 hover:text-white transition-colors cursor-pointer">
            <Mail className="w-4 h-4 text-indigo-400" />
            <span className="text-sm">security@cybershield.ai</span>
          </a>
          <a href="http://www.cybershield.com" target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 text-slate-300 bg-black/20 px-4 py-2 rounded-lg border border-white/5 hover:bg-slate-800 hover:text-white transition-colors cursor-pointer">
            <Globe className="w-4 h-4 text-cyan-400" />
            <span className="text-sm">www.cybershield.com</span>
          </a>
        </div>
      </div>
    </div>
  );
};

const FAQSection: React.FC = () => {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  const faqs: FaqItem[] = [
    {
      question: "How does the Deepfake detection work?",
      answer: "We analyze video frames for subtle inconsistencies in lip-syncing, eye blinking patterns, and facial micro-expressions that are typical of AI-generated videos."
    },
    {
      question: "Is it safe to upload my files?",
      answer: "Yes. Your files are processed in real-time by the AI engine and are not stored on our servers. Images are processed locally in your browser to enhance quality before being sent for analysis."
    },
    {
      question: "Can you analyze .exe or .apk files?",
      answer: "We perform a 'Static Metadata Audit' on executable files. We do not run the program. Instead, we analyze the file structure, naming conventions, and origin context to detect common malware patterns like Double Extensions (e.g., 'invoice.pdf.exe')."
    },
    {
      question: "What does the Safety Score mean?",
      answer: "The Safety Score is a deductive metric starting at 100. We subtract points for every risk factor found (e.g., -50 for bad grammar, -80 for typosquatted URLs). A score below 90 is always marked as 'Do NOT Trust'."
    }
  ];

  return (
    <div className="max-w-3xl mx-auto py-8">
       <h3 className="text-xl font-bold flex items-center gap-2 text-slate-300 mb-6">
          <HelpCircle className="w-5 h-5" />
          Frequently Asked Questions
       </h3>
       <div className="space-y-4">
         {faqs.map((faq, idx) => (
           <div key={idx} className="bg-slate-800/50 rounded-xl border border-slate-700/50 overflow-hidden transition-all">
             <button 
               onClick={() => setOpenIndex(openIndex === idx ? null : idx)}
               className="w-full flex items-center justify-between p-4 text-left hover:bg-slate-800 transition-colors"
             >
               <span className="font-medium text-slate-200">{faq.question}</span>
               {openIndex === idx ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
             </button>
             {openIndex === idx && (
               <div className="p-4 pt-0 text-slate-400 text-sm leading-relaxed border-t border-slate-700/30">
                 {faq.answer}
               </div>
             )}
           </div>
         ))}
       </div>
    </div>
  );
};

interface SubscriptionModalProps {
  isOpen: boolean;
  onClose: () => void;
  status: 'loading' | 'success' | 'contact' | 'info';
  plan: string;
}

const SubscriptionModal: React.FC<SubscriptionModalProps> = ({ isOpen, onClose, status, plan }) => {
  if (!isOpen) return null;
  
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
       <div className="bg-slate-900 border border-slate-700 rounded-2xl p-8 max-w-md w-full shadow-2xl relative animate-in zoom-in-95 duration-200">
          <button onClick={onClose} className="absolute top-4 right-4 text-slate-500 hover:text-white transition-colors">
             <X className="w-5 h-5" />
          </button>
          
          {status === 'loading' && (
             <div className="text-center py-8">
                <Loader2 className="w-12 h-12 text-indigo-500 animate-spin mx-auto mb-4" />
                <h3 className="text-xl font-bold text-white">Processing Request...</h3>
                <p className="text-slate-400 mt-2">Connecting to secure payment gateway.</p>
             </div>
          )}

          {status === 'success' && (
             <div className="text-center py-6">
                <div className="w-16 h-16 bg-emerald-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
                   <CheckCircle2 className="w-8 h-8 text-emerald-500" />
                </div>
                <h3 className="text-2xl font-bold text-white mb-2">Success!</h3>
                <p className="text-slate-300">
                   You have successfully subscribed to <span className="text-indigo-400 font-bold">{plan}</span>.
                </p>
                <button onClick={onClose} className="mt-8 w-full py-3 bg-indigo-600 hover:bg-indigo-500 rounded-xl font-bold text-white transition-colors">
                   Get Started
                </button>
             </div>
          )}

          {status === 'contact' && (
              <div className="text-center py-6">
                <div className="w-16 h-16 bg-blue-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
                   <Mail className="w-8 h-8 text-blue-500" />
                </div>
                <h3 className="text-xl font-bold text-white mb-2">Request Sent</h3>
                <p className="text-slate-300">
                   Our sales team has received your inquiry for <span className="text-white font-bold">{plan}</span>. We will contact you shortly.
                </p>
                <button onClick={onClose} className="mt-8 w-full py-3 bg-slate-700 hover:bg-slate-600 rounded-xl font-bold text-white transition-colors">
                   Close
                </button>
             </div>
          )}
          
          {status === 'info' && (
              <div className="text-center py-6">
                <div className="w-16 h-16 bg-slate-700/50 rounded-full flex items-center justify-center mx-auto mb-4">
                   <Shield className="w-8 h-8 text-slate-400" />
                </div>
                <h3 className="text-xl font-bold text-white mb-2">Current Plan</h3>
                <p className="text-slate-300">
                   You are currently active on <span className="text-white font-bold">{plan}</span>.
                </p>
                <button onClick={onClose} className="mt-8 w-full py-3 bg-slate-700 hover:bg-slate-600 rounded-xl font-bold text-white transition-colors">
                   Close
                </button>
             </div>
          )}
       </div>
    </div>
  );
};

const App: React.FC = () => {
  const [inputText, setInputText] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [processedImage, setProcessedImage] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [error, setError] = useState<AppError | null>(null);
  
  // Subscription Modal State
  const [subModal, setSubModal] = useState<{isOpen: boolean; status: 'loading'|'success'|'contact'|'info'; plan: string}>({
    isOpen: false,
    status: 'loading',
    plan: ''
  });

  const fileInputRef = useRef<HTMLInputElement>(null);

  const [history, setHistory] = useState<AnalysisHistoryItem[]>(() => {
    if (typeof window === 'undefined') return [];
    try {
      const saved = localStorage.getItem('cyberShieldHistory');
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      return [];
    }
  });

  useEffect(() => {
    localStorage.setItem('cyberShieldHistory', JSON.stringify(history));
  }, [history]);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setSelectedFile(file);
      setResult(null);
      setError(null);
      setProcessedImage(null);
      
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);

      // Handle Image Processing
      if (file.type.startsWith('image/')) {
        setIsProcessing(true);
        try {
          const enhanced = await enhanceImageForAnalysis(file);
          setProcessedImage(enhanced);
        } catch (err) {
          console.error("Image processing failed", err);
        } finally {
          setIsProcessing(false);
        }
      }
      // Handle Video (Check size)
      else if (file.type.startsWith('video/')) {
        if (file.size > 20 * 1024 * 1024) { // 20MB limit for demo
          setError({
            title: "File Too Large",
            message: "For this demo, video files must be under 20MB.",
            suggestion: "Please upload a shorter clip or compress the video.",
            type: 'validation'
          });
          setSelectedFile(null);
          setPreviewUrl(null);
        }
      }
    }
  };

  const clearFile = () => {
    setSelectedFile(null);
    setPreviewUrl(null);
    setProcessedImage(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleAnalyze = async () => {
    if (!inputText && !selectedFile) {
      setError({
        title: "Input Missing",
        message: "The analysis engine requires data to process.",
        suggestion: "Please paste text OR upload a file (Image, Video, APK, EXE).",
        type: 'validation'
      });
      return;
    }

    if (isProcessing) return;

    setIsLoading(true);
    setProgress(0);
    setError(null);
    setResult(null);

    const progressInterval = setInterval(() => {
      setProgress((prev) => (prev < 90 ? prev + Math.floor(Math.random() * 15) + 1 : 90));
    }, 600);

    try {
      let contentPayload = inputText;
      let base64Data = undefined;
      let mimeType = undefined;

      if (selectedFile) {
        if (selectedFile.type.startsWith('image/') && processedImage) {
           base64Data = processedImage.replace(/^data:.+;base64,/, '');
           mimeType = 'image/jpeg';
           contentPayload += "\n\n[SYSTEM METADATA: Image pre-processed with Edge Sharpening.]";
        } else if (selectedFile.type.startsWith('video/')) {
           const rawBase64 = await fileToBase64(selectedFile);
           base64Data = rawBase64.replace(/^data:.+;base64,/, '');
           mimeType = selectedFile.type;
           contentPayload += `\n\n[SYSTEM METADATA: Analyzing Video Clip: ${selectedFile.name}]`;
        } else {
           // BINARY FILES (EXE, APK) - We send metadata ONLY
           contentPayload += `\n\n[FILE METADATA]\nFilename: ${selectedFile.name}\nSize: ${(selectedFile.size/1024).toFixed(2)} KB\nType: ${selectedFile.type || 'Unknown Binary'}\n\nWARNING: USER UPLOADED AN EXECUTABLE/INSTALLER FILE. CHECK FOR MALWARE NAMING CONVENTIONS.`;
        }
      }

      const analysisData = await analyzeContent(contentPayload, base64Data, mimeType);
      
      clearInterval(progressInterval);
      setProgress(100);
      await new Promise(resolve => setTimeout(resolve, 400));
      
      setResult(analysisData);

      let type: 'text' | 'image' | 'video' | 'binary' = 'text';
      if (selectedFile) {
        if (selectedFile.type.startsWith('image/')) type = 'image';
        else if (selectedFile.type.startsWith('video/')) type = 'video';
        else type = 'binary';
      }

      const newHistoryItem: AnalysisHistoryItem = {
        ...analysisData,
        id: crypto.randomUUID(),
        timestamp: Date.now(),
        preview: selectedFile ? `${selectedFile.name} (${type})` : inputText,
        type: type
      };

      setHistory(prev => [newHistoryItem, ...prev].slice(0, 50));

    } catch (err: any) {
      clearInterval(progressInterval);
      setProgress(0);
      console.error(err);
      setError({
         title: "Analysis Failed",
         message: "Could not complete the security audit.",
         suggestion: "Please check your API key and network connection.",
         type: 'system'
      });
    } finally {
      setIsLoading(false);
      setTimeout(() => setProgress(0), 200);
    }
  };

  const restoreFromHistory = (item: AnalysisHistoryItem) => {
    setResult(item);
    setError(null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSubscribe = (plan: string) => {
    if (plan === 'Free Guard') {
      setSubModal({ isOpen: true, status: 'info', plan });
      return;
    }
    
    // Start loading state
    setSubModal({ isOpen: true, status: 'loading', plan });

    // Simulate different outcomes
    setTimeout(() => {
      if (plan === 'Enterprise') {
        setSubModal({ isOpen: true, status: 'contact', plan });
      } else {
        setSubModal({ isOpen: true, status: 'success', plan });
      }
    }, 1500);
  };

  const closeSubModal = () => {
    setSubModal(prev => ({ ...prev, isOpen: false }));
  };

  return (
    <div className="min-h-screen bg-slate-900 text-slate-200 selection:bg-indigo-500/30">
      
      {/* Subscription Modal */}
      <SubscriptionModal 
        isOpen={subModal.isOpen} 
        onClose={closeSubModal} 
        status={subModal.status} 
        plan={subModal.plan} 
      />

      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-slate-800 bg-slate-900/80 backdrop-blur-md">
        <div className="max-w-5xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="relative">
              <Shield className="w-8 h-8 text-indigo-500" />
              <div className="absolute -bottom-1 -right-1 bg-slate-900 rounded-full p-0.5">
                 <Lock className="w-3 h-3 text-emerald-400" />
              </div>
            </div>
            <div>
               <h1 className="text-xl font-bold bg-gradient-to-r from-indigo-400 to-cyan-400 bg-clip-text text-transparent">
                 CyberShield-AI
               </h1>
               <p className="text-[10px] text-slate-400 uppercase tracking-widest leading-none">Threat Detection System</p>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-8 space-y-12">
        
        {/* Intro */}
        <section className="text-center space-y-4 max-w-2xl mx-auto">
           <h2 className="text-3xl md:text-4xl font-bold text-slate-100">
             Is that file <span className="text-emerald-400">safe</span> or <span className="text-red-500">malware</span>?
           </h2>
           <p className="text-slate-400 text-lg">
             Analyze emails, screenshots, videos, and suspicious files (.exe, .apk).
           </p>
        </section>

        {/* Input Area */}
        <section className="max-w-3xl mx-auto bg-slate-800/50 rounded-2xl border border-slate-700/50 p-6 shadow-2xl relative overflow-hidden">
           <div className="absolute top-0 right-0 -mt-20 -mr-20 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none"></div>
           
           <div className="relative space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2 ml-1">Context / Description / Message</label>
                <textarea
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  placeholder="Describe where you got this file or paste the message text..."
                  className="w-full h-24 bg-slate-900 border border-slate-700 rounded-xl p-4 text-slate-200 placeholder-slate-500 focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition-all resize-none"
                />
              </div>

              <div className="flex items-center gap-4">
                 <div className="flex-1">
                    <input 
                      type="file" 
                      ref={fileInputRef}
                      onChange={handleFileChange}
                      accept="image/*,video/mp4,application/vnd.android.package-archive,application/x-msdownload,.exe,.apk"
                      className="hidden"
                    />
                    <button 
                      onClick={() => fileInputRef.current?.click()}
                      className={`w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl border border-dashed transition-all ${selectedFile ? 'border-indigo-500 bg-indigo-500/10 text-indigo-300' : 'border-slate-600 hover:border-slate-500 hover:bg-slate-700/50 text-slate-400'}`}
                    >
                      {selectedFile ? (
                        <>
                          {selectedFile.type.startsWith('video') ? <PlayCircle className="w-5 h-5"/> : 
                           selectedFile.type.startsWith('image') ? <ScanLine className="w-5 h-5"/> : 
                           <FileCode className="w-5 h-5"/>}
                          <span className="truncate max-w-[200px]">{selectedFile.name}</span>
                        </>
                      ) : (
                        <>
                          <Upload className="w-5 h-5" />
                          <span>Upload File (Img, Vid, Exe, Apk)</span>
                        </>
                      )}
                    </button>
                 </div>
                 {selectedFile && (
                    <button onClick={clearFile} className="p-3 text-slate-400 hover:text-red-400 hover:bg-red-400/10 rounded-xl transition-colors">
                       <Trash2 className="w-5 h-5" />
                    </button>
                 )}
              </div>
              
              {/* Previews */}
              {previewUrl && selectedFile?.type.startsWith('image/') && (
                <div className="mt-4 relative rounded-xl overflow-hidden border border-slate-700 inline-block group">
                  <img src={previewUrl} alt="Preview" className="h-32 object-cover" />
                  {isProcessing && (
                    <div className="absolute inset-0 bg-slate-900/60 flex items-center justify-center backdrop-blur-sm">
                       <Loader2 className="w-6 h-6 animate-spin text-indigo-400" />
                    </div>
                  )}
                  {processedImage && !isProcessing && (
                    <div className="absolute bottom-2 right-2 bg-black/60 backdrop-blur-md px-2 py-1 rounded-md flex items-center gap-1.5 border border-white/10 shadow-lg">
                      <Wand2 className="w-3 h-3 text-emerald-400" />
                      <span className="text-[10px] font-bold text-white uppercase tracking-wide">OCR Optimized</span>
                    </div>
                  )}
                </div>
              )}

              {previewUrl && selectedFile?.type.startsWith('video/') && (
                <div className="mt-4 rounded-xl overflow-hidden border border-slate-700 inline-block bg-black">
                   <video src={previewUrl} className="h-48" controls />
                   <div className="p-2 text-xs text-slate-400 flex items-center gap-2">
                      <PlayCircle className="w-3 h-3" /> Video Forensics Ready
                   </div>
                </div>
              )}

              {selectedFile && !selectedFile.type.startsWith('image/') && !selectedFile.type.startsWith('video/') && (
                 <div className="mt-4 p-4 bg-slate-900 rounded-xl border border-slate-700 flex items-center gap-3">
                    <FileCode className="w-8 h-8 text-orange-400" />
                    <div>
                       <p className="text-sm font-bold text-slate-200">{selectedFile.name}</p>
                       <p className="text-xs text-slate-500">{(selectedFile.size/1024).toFixed(1)} KB &bull; Metadata Audit Only</p>
                    </div>
                 </div>
              )}

              {error && (
                <div className="p-4 bg-red-900/20 border border-red-500/50 rounded-xl text-red-200 text-sm">
                   <strong className="block mb-1">{error.title}</strong>
                   {error.message}
                </div>
              )}

              <button
                onClick={handleAnalyze}
                disabled={isLoading || isProcessing}
                className="relative w-full py-4 bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-500 hover:to-blue-500 text-white font-bold rounded-xl shadow-lg shadow-indigo-900/20 disabled:cursor-not-allowed transition-all transform hover:scale-[1.01] active:scale-[0.99] overflow-hidden"
              >
                {isLoading && (
                  <div 
                    className="absolute inset-y-0 left-0 bg-white/20 transition-all duration-300 ease-out"
                    style={{ width: `${progress}%` }}
                  />
                )}
                
                <div className="relative z-10 flex items-center justify-center gap-2">
                  {isLoading ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      <span>Running Forensics... {progress}%</span>
                    </>
                  ) : (
                    <>
                      <ScanLine className="w-5 h-5" />
                      <span>Analyze Risk</span>
                    </>
                  )}
                </div>
              </button>
           </div>
        </section>

        {/* Results Section */}
        {result && (
          <section className="max-w-3xl mx-auto">
             <ResultCard result={result} />
          </section>
        )}

        {/* History Section */}
        <section className="max-w-3xl mx-auto pt-8 border-t border-slate-800">
           <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold flex items-center gap-2 text-slate-300">
                <History className="w-5 h-5" />
                Security Scan Log
              </h3>
              {history.length > 0 && (
                <button 
                  onClick={() => setHistory([])}
                  className="text-xs text-slate-500 hover:text-red-400 transition-colors"
                >
                  Clear History
                </button>
              )}
           </div>
           
           {history.length > 0 ? (
             <div className="space-y-3">
                {history.map(item => (
                  <HistoryItem key={item.id} item={item} onClick={restoreFromHistory} />
                ))}
             </div>
           ) : (
             <div className="text-center py-8 border-2 border-dashed border-slate-800 rounded-xl text-slate-500">
                <p>No analysis history available</p>
             </div>
           )}
        </section>

        {/* Services Section */}
        <section className="max-w-3xl mx-auto border-t border-slate-800 pt-8">
           <ServicesSection />
        </section>

        {/* Subscription Section */}
        <section className="max-w-7xl mx-auto border-t border-slate-800 pt-8">
          <SubscriptionSection onSubscribe={handleSubscribe} />
        </section>

        {/* FAQ Section */}
        <section className="border-t border-slate-800 pt-8">
           <FAQSection />
        </section>
        
        {/* Contact Section */}
        <section>
          <ContactSection />
        </section>

      </main>

      <footer className="border-t border-slate-800 mt-20 py-8 bg-slate-900">
         <div className="max-w-5xl mx-auto px-4 text-center text-slate-500 text-sm">
            <p className="mb-2">CyberShield-AI uses AI to detect scams. Always verify with official sources.</p>
            <p>&copy; {new Date().getFullYear()} CyberShield Security. All rights reserved.</p>
         </div>
      </footer>
    </div>
  );
};

export default App;
