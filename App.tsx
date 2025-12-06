import React, { useState, useRef, useEffect } from 'react';
import { analyzeContent } from './services/geminiService';
import { AnalysisResult, AnalysisHistoryItem } from './types';
import ResultCard from './components/ResultCard';
import HistoryItem from './components/HistoryItem';
import { Shield, Lock, ScanLine, Loader2, Upload, AlertCircle, History, Trash2, Github, X, WifiOff, FileWarning, ServerCrash, ShieldAlert, Cpu, Wand2 } from 'lucide-react';

interface AppError {
  title: string;
  message: string;
  suggestion: string;
  type: 'validation' | 'network' | 'system' | 'safety' | 'quota';
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

      // 1. Smart Resize (Max 1920px width - Standard Full HD is optimal for OCR)
      const MAX_W = 1920;
      let w = img.width;
      let h = img.height;
      if (w > MAX_W) {
        h = Math.round(h * (MAX_W / w));
        w = MAX_W;
      }
      canvas.width = w;
      canvas.height = h;

      // Draw original image scaled
      ctx.drawImage(img, 0, 0, w, h);

      // 2. APPLY SHARPENING (OCR ENHANCEMENT)
      //    A 3x3 convolution kernel to boost edge contrast for better text recognition.
      //    Kernel: [ 0, -1,  0 ]
      //            [-1,  5, -1 ]
      //            [ 0, -1,  0 ]
      const imgData = ctx.getImageData(0, 0, w, h);
      const data = imgData.data;
      const copyData = new Uint8ClampedArray(data); // Copy for reading neighbors

      for (let y = 1; y < h - 1; y++) {
        for (let x = 1; x < w - 1; x++) {
          const idx = (y * w + x) * 4;
          
          // Neighbor indices
          const top = ((y - 1) * w + x) * 4;
          const bottom = ((y + 1) * w + x) * 4;
          const left = (y * w + (x - 1)) * 4;
          const right = (y * w + (x + 1)) * 4;

          // Apply Kernel to RGB
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

      // 3. APPLY CONTRAST BOOST
      //    Increases the separation between text and background.
      const contrast = 1.20; // 20% boost (Increased for better accuracy)
      const intercept = 128 * (1 - contrast);

      for (let i = 0; i < data.length; i += 4) {
        data[i] = Math.min(255, Math.max(0, data[i] * contrast + intercept));     // R
        data[i+1] = Math.min(255, Math.max(0, data[i+1] * contrast + intercept)); // G
        data[i+2] = Math.min(255, Math.max(0, data[i+2] * contrast + intercept)); // B
      }

      ctx.putImageData(imgData, 0, 0);
      
      // Return as JPEG with high quality
      resolve(canvas.toDataURL('image/jpeg', 0.95));
    };
    
    img.onerror = (e) => reject(e);
    img.src = url;
  });
};

const App: React.FC = () => {
  const [inputText, setInputText] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [processedImage, setProcessedImage] = useState<string | null>(null); // Store the enhanced version
  const [isProcessingImage, setIsProcessingImage] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [error, setError] = useState<AppError | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Initialize history from localStorage (Lazy Init) to prevent race conditions
  const [history, setHistory] = useState<AnalysisHistoryItem[]>(() => {
    if (typeof window === 'undefined') return [];
    try {
      const saved = localStorage.getItem('cyberShieldHistory');
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      console.error("Failed to parse history", e);
      return [];
    }
  });

  // Save history to local storage whenever it changes
  useEffect(() => {
    localStorage.setItem('cyberShieldHistory', JSON.stringify(history));
  }, [history]);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setSelectedFile(file);
      setResult(null);
      setError(null);
      
      // 1. Show immediate preview of original
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);

      // 2. Process image in background for AI
      if (file.type.startsWith('image/')) {
        setIsProcessingImage(true);
        try {
          const enhanced = await enhanceImageForAnalysis(file);
          setProcessedImage(enhanced);
        } catch (err) {
          console.error("Image processing failed, falling back to original", err);
          setProcessedImage(null);
        } finally {
          setIsProcessingImage(false);
        }
      } else {
        setProcessedImage(null);
      }
    }
  };

  const clearFile = () => {
    setSelectedFile(null);
    setImagePreview(null);
    setProcessedImage(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleAnalyze = async () => {
    if (!inputText && !selectedFile) {
      setError({
        title: "Input Missing",
        message: "The analysis engine requires data to process.",
        suggestion: "Please paste the suspicious text OR upload a screenshot/image.",
        type: 'validation'
      });
      return;
    }

    if (isProcessingImage) {
      setError({
        title: "Processing Image",
        message: "Please wait, we are enhancing the image for maximum forensic clarity.",
        suggestion: "This usually takes less than a second.",
        type: 'system'
      });
      return;
    }

    setIsLoading(true);
    setProgress(0);
    setError(null);
    setResult(null);

    // Simulate progress while waiting for API
    const progressInterval = setInterval(() => {
      setProgress((prev) => {
        // Increment randomly, stall at 90%
        const next = prev + Math.floor(Math.random() * 15) + 1;
        return next > 90 ? 90 : next;
      });
    }, 600);

    try {
      let base64Image = undefined;
      let mimeType = undefined;
      let finalInputText = inputText;

      if (selectedFile) {
        if (processedImage) {
          // Use the Enhanced Image (JPEG)
          base64Image = processedImage.replace(/^data:.+;base64,/, '');
          mimeType = 'image/jpeg';
          // append metadata to help the AI understand the image has been pre-processed
          finalInputText = inputText + "\n\n[SYSTEM METADATA: Image pre-processed with Edge Sharpening and Contrast Boost for optimal OCR extraction.]";
        } else if (imagePreview) {
          // Fallback to Original
          base64Image = imagePreview.replace(/^data:.+;base64,/, '');
          mimeType = selectedFile.type;
        }
      }

      const analysisData = await analyzeContent(finalInputText, base64Image, mimeType);
      
      // Force progress to 100% on success
      clearInterval(progressInterval);
      setProgress(100);

      // Short delay to let user see 100%
      await new Promise(resolve => setTimeout(resolve, 400));
      
      setResult(analysisData);

      // Add to history
      const newHistoryItem: AnalysisHistoryItem = {
        ...analysisData,
        id: crypto.randomUUID(),
        timestamp: Date.now(),
        preview: selectedFile ? (inputText || `Image: ${selectedFile.name}`) : inputText,
        type: selectedFile ? 'image' : 'text'
      };

      setHistory(prev => [newHistoryItem, ...prev].slice(0, 50)); // Keep last 50

    } catch (err: any) {
      clearInterval(progressInterval);
      setProgress(0);
      console.error("Analysis Error:", err);
      
      const msg = (err.message || "").toLowerCase();
      // Attempt to stringify the error to catch embedded codes, handle circular refs gracefully
      let fullErrString = "";
      try { fullErrString = JSON.stringify(err).toLowerCase(); } catch { fullErrString = msg; }

      let appError: AppError = {
        title: "System Error",
        message: "An unexpected error interrupted the analysis protocol.",
        suggestion: "Please try again. If the issue persists, refresh the page.",
        type: 'system'
      };

      // --- ERROR CLASSIFICATION LOGIC ---

      // 1. SAFETY & MODERATION (AI Filter blocks)
      if (msg.includes('safety') || msg.includes('blocked') || (fullErrString.includes('finishreason') && fullErrString.includes('safety'))) {
        appError = {
          title: "Safety Protocol Triggered",
          message: "The content was flagged by our safety filters as potentially harmful or explicit.",
          suggestion: "We cannot process content that violates safety policies. Please redact sensitive/explicit data.",
          type: 'safety'
        };
      }
      
      // 2. AUTHENTICATION & CONFIG (API Key issues)
      else if (msg.includes('api key') || msg.includes('403') || msg.includes('permission_denied')) {
        appError = {
          title: "Authentication Failed",
          message: "The system could not verify the API credentials.",
          suggestion: "Please check that your API_KEY environment variable is set and valid.",
          type: 'system'
        };
      }

      // 3. QUOTA & RATE LIMITS (429)
      else if (msg.includes('429') || msg.includes('quota') || msg.includes('resource exhausted') || msg.includes('too many requests')) {
        appError = {
          title: "High Traffic Volume",
          message: "The analysis engine is currently at maximum capacity.",
          suggestion: "Please wait 30 seconds before retrying to let the queue clear.",
          type: 'quota'
        };
      }

      // 4. NETWORK & SERVER (503, Fetch)
      else if (msg.includes('fetch') || msg.includes('network') || msg.includes('connection') || msg.includes('503') || msg.includes('500')) {
        appError = {
          title: "Connection Severed",
          message: "Unable to establish a link with the analysis servers.",
          suggestion: "Check your internet connection. Firewalls or VPNs might be blocking the request.",
          type: 'network'
        };
      }

      // 5. PARSING & DATA INTEGRITY (JSON Errors)
      else if (msg.includes('json') || msg.includes('token') || msg.includes('syntax') || msg.includes('parse')) {
        appError = {
          title: "Report Generation Error",
          message: "The AI generated a malformed report that could not be decoded.",
          suggestion: "This is a temporary glitch. Please click 'Analyze Risk' again.",
          type: 'system'
        };
      }

      // 6. IMAGE/FILE ISSUES
      else if (msg.includes('image') || msg.includes('mime') || msg.includes('format')) {
        appError = {
          title: "File Read Error",
          message: "The uploaded image data is corrupted or unsupported.",
          suggestion: "Try uploading a standard JPG or PNG file.",
          type: 'validation'
        };
      }

      setError(appError);
    } finally {
      setIsLoading(false);
      // Reset progress after a moment to clear the button state cleanly
      setTimeout(() => setProgress(0), 200);
    }
  };

  const handleClearHistory = () => {
    setHistory([]);
  };

  const restoreFromHistory = (item: AnalysisHistoryItem) => {
    setResult(item);
    setError(null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const getErrorIcon = (type: AppError['type']) => {
    switch (type) {
      case 'network': return WifiOff;
      case 'validation': return FileWarning;
      case 'system': return ServerCrash;
      case 'safety': return ShieldAlert;
      case 'quota': return Cpu;
      default: return AlertCircle;
    }
  };

  const getErrorColorClass = (type: AppError['type']) => {
    switch (type) {
        case 'safety': return 'bg-red-900/20 border-red-500/50 text-red-200';
        case 'network': return 'bg-blue-900/20 border-blue-500/50 text-blue-200';
        case 'quota': return 'bg-orange-900/20 border-orange-500/50 text-orange-200';
        case 'validation': return 'bg-yellow-900/20 border-yellow-500/50 text-yellow-200';
        case 'system': return 'bg-slate-800 border-slate-500/50 text-slate-200';
        default: return 'bg-slate-800 border-slate-600 text-slate-200';
    }
  };

  const getErrorIconBg = (type: AppError['type']) => {
    switch (type) {
        case 'safety': return 'bg-red-900/50 text-red-500';
        case 'network': return 'bg-blue-900/50 text-blue-500';
        case 'quota': return 'bg-orange-900/50 text-orange-500';
        case 'validation': return 'bg-yellow-900/50 text-yellow-500';
        case 'system': return 'bg-slate-700 text-slate-400';
        default: return 'bg-slate-700 text-slate-400';
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 text-slate-200 selection:bg-indigo-500/30">
      
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
          <div className="flex items-center gap-4">
             <a href="#" className="text-slate-500 hover:text-indigo-400 transition-colors">
               <Github className="w-5 h-5" />
             </a>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-8 space-y-12">
        
        {/* Intro */}
        <section className="text-center space-y-4 max-w-2xl mx-auto">
           <h2 className="text-3xl md:text-4xl font-bold text-slate-100">
             Is that message <span className="text-emerald-400">safe</span> or a <span className="text-red-500">scam</span>?
           </h2>
           <p className="text-slate-400 text-lg">
             Paste emails, SMS, URLs, or upload screenshots. <br className="hidden md:inline" /> 
             Our AI analyzes patterns to detect phishing and social engineering.
           </p>
        </section>

        {/* Input Area */}
        <section className="max-w-3xl mx-auto bg-slate-800/50 rounded-2xl border border-slate-700/50 p-6 shadow-2xl relative overflow-hidden">
           {/* Background decorative glow */}
           <div className="absolute top-0 right-0 -mt-20 -mr-20 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none"></div>
           
           <div className="relative space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2 ml-1">Message Content / URL / Transcript</label>
                <textarea
                  value={inputText}
                  onChange={(e) => {
                    setInputText(e.target.value);
                    if (error?.type === 'validation') setError(null);
                  }}
                  placeholder="Paste text here or describe the image you are uploading..."
                  className="w-full h-32 bg-slate-900 border border-slate-700 rounded-xl p-4 text-slate-200 placeholder-slate-500 focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition-all resize-none"
                />
              </div>

              <div className="flex items-center gap-4">
                 <div className="flex-1">
                    <input 
                      type="file" 
                      ref={fileInputRef}
                      onChange={handleFileChange}
                      accept="image/*"
                      className="hidden"
                    />
                    <button 
                      onClick={() => fileInputRef.current?.click()}
                      className={`w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl border border-dashed transition-all ${selectedFile ? 'border-indigo-500 bg-indigo-500/10 text-indigo-300' : 'border-slate-600 hover:border-slate-500 hover:bg-slate-700/50 text-slate-400'}`}
                    >
                      {selectedFile ? (
                        <>
                          <ScanLine className="w-5 h-5" />
                          <span className="truncate max-w-[200px]">{selectedFile.name}</span>
                        </>
                      ) : (
                        <>
                          <Upload className="w-5 h-5" />
                          <span>Upload Screenshot (Optional)</span>
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
              
              {imagePreview && (
                <div className="mt-4 relative rounded-xl overflow-hidden border border-slate-700 inline-block group">
                  <img src={imagePreview} alt="Preview" className="h-32 object-cover" />
                  {isProcessingImage && (
                    <div className="absolute inset-0 bg-slate-900/60 flex items-center justify-center backdrop-blur-sm">
                      <div className="flex flex-col items-center gap-2">
                         <Loader2 className="w-6 h-6 animate-spin text-indigo-400" />
                         <span className="text-xs font-medium text-indigo-300">Sharpening for OCR...</span>
                      </div>
                    </div>
                  )}
                  {processedImage && !isProcessingImage && (
                    <div className="absolute bottom-2 right-2 bg-black/60 backdrop-blur-md px-2 py-1 rounded-md flex items-center gap-1.5 border border-white/10 shadow-lg">
                      <Wand2 className="w-3 h-3 text-emerald-400" />
                      <span className="text-[10px] font-bold text-white uppercase tracking-wide">OCR Optimized</span>
                    </div>
                  )}
                </div>
              )}

              {error && (
                <div className={`relative rounded-xl p-4 border flex items-start gap-4 transition-all animate-in fade-in slide-in-from-top-2 shadow-lg ${getErrorColorClass(error.type)}`}>
                  <div className={`p-2 rounded-lg shrink-0 ${getErrorIconBg(error.type)}`}>
                    {React.createElement(getErrorIcon(error.type), { className: "w-6 h-6" })}
                  </div>
                  <div className="flex-1 space-y-1">
                    <h4 className="font-bold text-sm uppercase tracking-wide opacity-90">{error.title}</h4>
                    <p className="font-medium text-sm leading-relaxed">{error.message}</p>
                    <div className="mt-2 flex items-start gap-2 text-xs opacity-80 bg-black/20 p-2 rounded">
                        <span className="font-bold uppercase text-[10px] mt-0.5 tracking-wider">Fix:</span>
                        <p className="italic">{error.suggestion}</p>
                    </div>
                  </div>
                  <button 
                    onClick={() => setError(null)}
                    className="absolute top-2 right-2 p-1.5 opacity-60 hover:opacity-100 hover:bg-white/10 rounded-lg transition-all"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              )}

              <button
                onClick={handleAnalyze}
                disabled={isLoading || isProcessingImage}
                className="relative w-full py-4 bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-500 hover:to-blue-500 text-white font-bold rounded-xl shadow-lg shadow-indigo-900/20 disabled:cursor-not-allowed transition-all transform hover:scale-[1.01] active:scale-[0.99] overflow-hidden"
              >
                {/* Progress Bar Background Overlay */}
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
                      <span>Running Forensic Analysis... {progress}%</span>
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

        {/* History Section - Permanently Visible */}
        <section className="max-w-3xl mx-auto pt-8 border-t border-slate-800">
           <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold flex items-center gap-2 text-slate-300">
                <History className="w-5 h-5" />
                Security Scan Log
              </h3>
              {history.length > 0 && (
                <button 
                  onClick={handleClearHistory}
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
             <div className="text-center py-12 border-2 border-dashed border-slate-800 rounded-xl">
                <History className="w-12 h-12 text-slate-700 mx-auto mb-3" />
                <p className="text-slate-500 font-medium">No analysis history available</p>
                <p className="text-slate-600 text-sm mt-1">Recent scans will appear here automatically</p>
             </div>
           )}
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