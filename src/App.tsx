import { useState, useRef, DragEvent, ChangeEvent } from "react";
import { 
  Upload, 
  FileText, 
  AlertTriangle, 
  Download, 
  Copy, 
  CheckCircle2, 
  Loader2, 
  Sparkles, 
  Edit3, 
  Eye, 
  BookOpen, 
  Layers, 
  HelpCircle,
  FileSpreadsheet,
  RefreshCw,
  Clock,
  ExternalLink,
  Sliders,
  Cpu,
  Settings
} from "lucide-react";
import { FileData, OCRResult, OCRAlert } from "./types";

// Standard English translations mapping conforming to English-only UI request
const TRANSLATIONS = {
  en: {
    title: "सम्यक OCR",
    subtitle: "High accuracy layout-preserving OCR utility for Hindi, Sanskrit, and English documents",
    uploadTitle: "Input Control",
    uploadDesc: "Drag & drop or select PDF / images (PNG, JPG, JPEG)",
    maxLimit: "Maximum limit: 15MB",
    processing: "Processing document and extracting content...",
    ocrStatus: "OCR Settings",
    wordToWord: "Word-to-word precision",
    layoutAnalysis: "Layout & Sequence Protection",
    formattingLogic: "Auto-Structuring (MD)",
    accuracyEst: "OCR Accuracy",
    wordCount: "Total Words",
    alertsCount: "High Alerts",
    viewStructured: "Structured View",
    viewEditor: "Text Editor",
    viewAlerts: "Legibility Alerts",
    downloadMd: "Download .md",
    downloadTxt: "Download .txt",
    copySuccess: "Copied successfully!",
    copyText: "Copy",
    noFile: "Please upload a document to begin analysis.",
    errorTitle: "Process Error",
    keyMissingError: "GEMINI_API_KEY is missing. Configure it in Settings > Secrets to enable OCR.",
    readyMessage: "Document loaded. Click process to run the Gemini-powered OCR.",
    processBtn: "Start Process",
    reProcessBtn: "Process Again",
    legibilityHelp: "Fuzzy, blurred, or unclear handwriting prompts custom 'High Alerts' with inline context helpers.",
    alertFragment: "Fuzzy Fragment",
    alertContext: "Sentence Context",
    alertReason: "Flag Reason",
    noAlertsFound: "All text is fully legible! No alerts raised."
  }
};

export default function App() {
  const [lang] = useState<"en">("en");
  const t = TRANSLATIONS[lang];

  const [uploadedFile, setUploadedFile] = useState<FileData | null>(null);
  const [activeTab, setActiveTab] = useState<"preview" | "editor" | "alerts">("preview");
  const [isDragOver, setIsDragOver] = useState(false);
  
  // Custom interactive layout settings matching Geometric Balance layout panel
  const [ocrEngine, setOcrEngine] = useState<string>("Google Vision API (High Precision)");
  const [layoutAnalysisEnabled, setLayoutAnalysisEnabled] = useState<boolean>(true);
  const [autoStructuringEnabled, setAutoStructuringEnabled] = useState<boolean>(true);

  // Custom interactive editable markdown text state
  const [editableMarkdown, setEditableMarkdown] = useState<string>("");
  const [copiedMessage, setCopiedMessage] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Stats helper to parse human readable size
  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  // Convert uploaded file to base64
  const handleFile = (file: File) => {
    if (!file) return;

    if (file.size > 15 * 1024 * 1024) {
      alert("फ़ाइल का आकार 15MB से अधिक नहीं होना चाहिए। File size limit is 15MB.");
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      const base64String = reader.result as string;
      // Extract clean raw base64 data without data:prefix
      const cleanBase64 = base64String.split(",")[1];

      setUploadedFile({
        id: Math.random().toString(36).substring(7),
        name: file.name,
        size: formatBytes(file.size),
        type: file.type || "application/pdf",
        base64: cleanBase64,
        previewUrl: file.type.startsWith("image/") ? URL.createObjectURL(file) : null,
        status: "idle",
      });
      // Reset active views
      setActiveTab("preview");
    };
    reader.readAsDataURL(file);
  };

  const onDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const onDragLeave = () => {
    setIsDragOver(false);
  };

  const onDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  const onFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFile(e.target.files[0]);
    }
  };

  const triggerUploadClick = () => {
    fileInputRef.current?.click();
  };

  const resetProject = () => {
    setUploadedFile(null);
    setEditableMarkdown("");
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  // Call server Express API for OCR Structuring
  const processOCR = async () => {
    if (!uploadedFile) return;

    setUploadedFile(prev => prev ? { ...prev, status: "processing", error: undefined } : null);

    try {
      const response = await fetch("/api/ocr", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fileBase64: uploadedFile.base64,
          mimeType: uploadedFile.type,
          fileName: uploadedFile.name,
          engine: ocrEngine,
          enableLayoutAnalysis: layoutAnalysisEnabled,
          enableStructuring: autoStructuringEnabled
        }),
      });

      if (!response.ok) {
        const errJson = await response.json();
        throw new Error(errJson.error || `HTTP ${response.status} Error`);
      }

      const ocrResult: OCRResult = await response.json();
      
      setUploadedFile(prev => {
        if (!prev) return null;
        return {
          ...prev,
          status: "completed",
          result: ocrResult
        };
      });
      setEditableMarkdown(ocrResult.markdown);

    } catch (err: any) {
      console.error(err);
      setUploadedFile(prev => {
        if (!prev) return null;
        return {
          ...prev,
          status: "failed",
          error: err.message || "OCR Processing failed unexpectedly."
        };
      });
    }
  };

  // Helper to copy text to clipboard
  const copyToClipboard = () => {
    navigator.clipboard.writeText(editableMarkdown);
    setCopiedMessage(true);
    setTimeout(() => setCopiedMessage(false), 3000);
  };

  // Helper to download as Markdown
  const downloadFile = (extension: "md" | "txt") => {
    const element = document.createElement("a");
    const file = new Blob([editableMarkdown], { type: "text/plain;charset=utf-8" });
    element.href = URL.createObjectURL(file);
    element.download = `${uploadedFile?.name.split(".")[0] || "hindi-ocr-structured"}.${extension}`;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  // Custom UI Parser to beautifully format headings, bullets, and Exception warning highlights
  const renderFormattedMarkdownToReact = (text: string) => {
    if (!text) return null;

    const lines = text.split("\n");

    return lines.map((line, idx) => {
      // Preserve alignment spacing/indentation by rendering padding dynamically
      const indentMatch = line.match(/^(\s+)/);
      const indentPadding = indentMatch ? indentMatch[1].length * 8 : 0;

      // Clean line without custom margins
      let cleanLine = line.trim();

      // Heading 1
      if (cleanLine.startsWith("# ")) {
        return (
          <h1 key={idx} style={{ paddingLeft: `${indentPadding}px` }} className="text-2xl font-display font-extrabold text-indigo-950 mt-6 mb-3 tracking-tight border-b border-slate-200 pb-2">
            {cleanLine.substring(2)}
          </h1>
        );
      }
      // Heading 2
      if (cleanLine.startsWith("## ")) {
        return (
          <h2 key={idx} style={{ paddingLeft: `${indentPadding}px` }} className="text-xl font-display font-bold text-slate-800 mt-5 mb-2.5 tracking-tight">
            {cleanLine.substring(3)}
          </h2>
        );
      }
      // Heading 3
      if (cleanLine.startsWith("### ")) {
        return (
          <h3 key={idx} style={{ paddingLeft: `${indentPadding}px` }} className="text-lg font-display font-semibold text-slate-700 mt-4 mb-2">
            {cleanLine.substring(4)}
          </h3>
        );
      }
      // List spacing & highlights
      if (cleanLine.startsWith("- ") || cleanLine.startsWith("• ")) {
        const listText = cleanLine.substring(2);
        return (
          <div key={idx} style={{ paddingLeft: `${indentPadding + 16}px` }} className="flex items-start gap-2.5 my-1.5 text-slate-700 font-sans leading-relaxed">
            <span className="text-indigo-500 font-bold mt-1">•</span>
            <div className="flex-1">{parseInlineHighlights(listText)}</div>
          </div>
        );
      }

      // Default styled text block
      return (
        <p key={idx} style={{ paddingLeft: `${indentPadding}px` }} className="my-2 text-slate-600 font-sans leading-relaxed min-h-[1.5rem]">
          {parseInlineHighlights(cleanLine)}
        </p>
      );
    });
  };

  // Locate bad handwriting and inline "High Alerts" and swap visually with beautifully animated alerts
  const parseInlineHighlights = (text: string) => {
    // Regular expression matching: ==⚠️ High Alert: [illegible word]==
    const regex = /==⚠️ High Alert: \[(.*?)\]==/g;
    const parts = [];
    let lastIndex = 0;
    let match;

    while ((match = regex.exec(text)) !== null) {
      if (match.index > lastIndex) {
        parts.push(text.substring(lastIndex, match.index));
      }
      const capturedPart = match[1];
      parts.push(
        <span 
          key={match.index} 
          className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-xs font-semibold text-amber-900 bg-amber-50 border border-amber-200 shadow-xs animate-pulse cursor-pointer high-alert-highlight"
          title="This handwriting segment is fuzzy or illegible. Please match with the original view."
        >
          <AlertTriangle className="w-3 h-3 text-amber-600 fill-amber-600/10" />
          <span>Fuzzy: {capturedPart}</span>
        </span>
      );
      lastIndex = regex.lastIndex;
    }

    if (lastIndex < text.length) {
      parts.push(text.substring(lastIndex));
    }

    return parts.length > 0 ? parts : text;
  };

  return (
    <div id="app-root" className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-sans transition-all">
      {/* Geometric Balance Premium Header */}
      <header id="app-header" className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-6 shrink-0 shadow-xs sticky top-0 z-40">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 bg-indigo-600 flex items-center justify-center rounded-sm text-white font-bold text-lg select-none">
            स
          </div>
          <div>
            <h1 className="text-lg md:text-xl font-display font-black tracking-tight text-slate-800">
              {t.title}
            </h1>
            <p className="hidden md:block text-[10px] text-slate-500 font-semibold mt-0.5">
              Devanagari Document Layout & Structured Output Pipeline
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-4 text-xs font-semibold">
          <button 
            id="reset-project-btn" 
            onClick={resetProject}
            className="px-4 py-2 rounded-md border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 transition-colors cursor-pointer text-[11px] font-bold shadow-2xs"
          >
            New Project
          </button>
        </div>
      </header>

      {/* Main Workspace Workspace */}
      <main id="app-content-area" className="flex-1 flex flex-col lg:flex-row p-6 gap-6 min-h-[calc(100vh-104px)] overflow-y-auto">
        
        {/* Left Side: Input Controls & Settings */}
        <aside id="panel-left-ops" className="w-full lg:w-80 flex flex-col gap-5 shrink-0">
          
          {/* Upload Widget card */}
          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs">
            <h3 className="text-xs font-black uppercase tracking-widest text-slate-400 mb-4 flex items-center gap-2">
              <Layers className="w-4 h-4 text-indigo-500" />
              {t.uploadTitle}
            </h3>

            {/* Drag Area Box */}
            <div
              id="drag-and-drop-area"
              onDragOver={onDragOver}
              onDragLeave={onDragLeave}
              onDrop={onDrop}
              onClick={triggerUploadClick}
              className={`border-2 border-dashed rounded-lg p-5 text-center cursor-pointer transition-all duration-300 relative overflow-hidden group ${
                isDragOver 
                  ? "border-indigo-500 bg-indigo-50/20" 
                  : "border-indigo-100 bg-indigo-50/5 hover:border-indigo-300 hover:bg-indigo-50/20"
              }`}
            >
              <input
                type="file"
                ref={fileInputRef}
                onChange={onFileChange}
                accept="image/png, image/jpeg, image/jpg, application/pdf"
                className="hidden"
              />

              <Upload className="w-8 h-8 mx-auto text-indigo-400 mb-2 transition-transform group-hover:scale-110" />

              <span className="text-xs font-bold text-indigo-600 block mb-1">
                {t.uploadDesc}
              </span>
              <span className="text-[10px] text-slate-400 font-medium">
                {t.maxLimit} • PDF / Image
              </span>
            </div>

            {/* Current Loaded File Details */}
            {uploadedFile && (
              <div className="mt-4 pt-4 border-t border-slate-100">
                <div className="p-3 bg-slate-50 rounded border border-slate-150 flex items-center space-x-3">
                  <div className={`w-9 h-11 rounded flex items-center justify-center font-bold text-[10px] shadow-xs ${
                    uploadedFile.name.endsWith(".pdf") ? "bg-red-50 text-red-600 border border-red-100" : "bg-indigo-50 text-indigo-600 border border-indigo-100"
                  }`}>
                    {uploadedFile.name.endsWith(".pdf") ? "PDF" : "IMG"}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold text-slate-700 truncate" title={uploadedFile.name}>
                      {uploadedFile.name}
                    </p>
                    <p className="text-[10px] text-slate-400 font-semibold mt-0.5">
                      {uploadedFile.size} • {uploadedFile.status.toUpperCase()}
                    </p>
                  </div>
                </div>

                {/* Error Box */}
                {uploadedFile.status === "failed" && (
                  <div className="mt-3 p-3 bg-rose-50 border border-rose-100 rounded text-rose-800 flex flex-col gap-1 text-[11px] leading-relaxed">
                    <p className="font-extrabold">{t.errorTitle}</p>
                    <p>{uploadedFile.error}</p>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Interactive OCR Processing Settings */}
          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs flex flex-col gap-4">
            <h3 className="text-xs font-black uppercase tracking-widest text-slate-400 flex items-center gap-2">
              <Sliders className="w-4 h-4 text-indigo-500" />
              {t.ocrStatus}
            </h3>

            <div className="space-y-3.5">
              {/* Select OCR Engine */}
              <div className="space-y-1.5 text-left">
                <label className="text-[11px] font-bold text-slate-650 flex items-center gap-1">
                  <Cpu className="w-3.5 h-3.5 text-slate-400" />
                  OCR Engine
                </label>
                <select 
                  value={ocrEngine}
                  onChange={(e) => setOcrEngine(e.target.value)}
                  className="w-full text-xs p-2.5 border border-slate-200 rounded outline-hidden bg-slate-50 font-medium text-slate-700"
                >
                  <option value="Google Vision API (High Precision)">Google Vision API (High Precision)</option>
                  <option value="Fine-tuned Tesseract">Fine-tuned Tesseract OCR</option>
                  <option value="Multimodal Gemini Vision OCR">Gemini Pro Vision Engine</option>
                </select>
              </div>

              {/* Layout preservation switch toggle */}
              <div className="flex items-center justify-between text-xs font-bold">
                <span className="text-slate-600 font-medium">{t.layoutAnalysis}</span>
                <button
                  onClick={() => setLayoutAnalysisEnabled(!layoutAnalysisEnabled)}
                  className={`w-9 h-5 rounded-full relative p-0.5 transition-colors cursor-pointer ${
                    layoutAnalysisEnabled ? "bg-indigo-600" : "bg-slate-200"
                  }`}
                >
                  <div className={`w-3.5 h-3.5 bg-white rounded-full transition-transform ${
                    layoutAnalysisEnabled ? "translate-x-4" : "translate-x-0"
                  }`} />
                </button>
              </div>

              {/* Auto-Structuring switch toggle */}
              <div className="flex items-center justify-between text-xs font-bold">
                <span className="text-slate-600 font-medium">{t.formattingLogic}</span>
                <button
                  onClick={() => setAutoStructuringEnabled(!autoStructuringEnabled)}
                  className={`w-9 h-5 rounded-full relative p-0.5 transition-colors cursor-pointer ${
                    autoStructuringEnabled ? "bg-indigo-600" : "bg-slate-200"
                  }`}
                >
                  <div className={`w-3.5 h-3.5 bg-white rounded-full transition-transform ${
                    autoStructuringEnabled ? "translate-x-4" : "translate-x-0"
                  }`} />
                </button>
              </div>
            </div>

            {/* Execute processing triggers */}
            {uploadedFile && (
              <div className="mt-2 text-left">
                {uploadedFile.status === "idle" && (
                  <button
                    onClick={processOCR}
                    className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-bold text-xs shadow-md shadow-indigo-600/10 active:scale-95 transition-transform cursor-pointer"
                  >
                    {t.processBtn}
                  </button>
                )}

                {uploadedFile.status === "processing" && (
                  <div className="flex items-center justify-center gap-2 p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold text-slate-700 text-center animate-pulse">
                    <Loader2 className="w-4 h-4 text-indigo-600 animate-spin" />
                    {t.processing}
                  </div>
                )}

                {uploadedFile.status === "completed" && (
                  <button
                    onClick={processOCR}
                    className="w-full py-2.5 bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-700 rounded-lg font-bold text-xs transition-transform cursor-pointer"
                  >
                    {t.reProcessBtn}
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Quick Help Guide */}
          <div className="bg-indigo-50/40 border border-indigo-100 rounded-xl p-5 shadow-xs">
            <h4 className="text-xs font-black text-indigo-950 uppercase tracking-widest mb-3 flex items-center gap-1.5">
              <BookOpen className="w-4 h-4 text-indigo-700" />
              How to use:
            </h4>
            <div className="flex flex-col gap-2.5 text-slate-700 text-[11px] leading-relaxed font-semibold">
              <p>1. Drag & drop or upload a picture or PDF document containing notes.</p>
              <p>2. Choose layout settings and click 'Start Process' to run the adaptive OCR.</p>
              <p>3. Review, edit, copy to clipboard, or download your adaptive layout-preserving output.</p>
              <p className="mt-1 text-[10px] text-indigo-800 leading-normal bg-indigo-50 border border-indigo-100/60 p-2.5 rounded italic">
                {t.legibilityHelp}
              </p>
            </div>
          </div>
        </aside>

        {/* Right Side: Geometric split Canvas View */}
        <section id="panel-right-canvas" className="flex-1 bg-white border border-slate-200 rounded-xl shadow-xs overflow-hidden flex flex-col">
          
          {/* Default blank placeholder */}
          {!uploadedFile ? (
            <div className="flex-1 flex flex-col items-center justify-center text-center p-12 min-h-[480px]">
              <div className="w-16 h-16 bg-indigo-50 border border-indigo-100 text-indigo-500 rounded-full flex items-center justify-center mb-5 animate-pulse">
                <FileText className="w-7 h-7" />
              </div>
              <h3 className="text-lg font-display font-black text-slate-800 mb-2">
                {t.title}
              </h3>
              <p className="text-xs text-slate-500 max-w-sm leading-relaxed font-semibold">
                {t.noFile}
              </p>
            </div>
          ) : (
            <div className="flex-1 flex flex-col min-h-0">
              {/* Top Original & Markdown split preview header */}
              <div className="h-12 bg-white border-b border-slate-200 flex items-center justify-between px-4 shrink-0">
                <div className="flex items-center space-x-2">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                    {uploadedFile.name} • OCR MONITOR
                  </span>
                </div>

                {/* Sub Tab selection switches */}
                {uploadedFile.status === "completed" && (
                  <div className="flex items-center bg-slate-100 border border-slate-200 p-0.5 rounded-md text-[11px] font-bold">
                    <button
                      id="tab-preview"
                      onClick={() => setActiveTab("preview")}
                      className={`px-3 py-1 rounded transition-all ${
                        activeTab === "preview"
                          ? "bg-white text-indigo-700 shadow-xs"
                          : "text-slate-500 hover:text-slate-900"
                      }`}
                    >
                      {t.viewStructured}
                    </button>
                    <button
                      id="tab-editor"
                      onClick={() => setActiveTab("editor")}
                      className={`px-3 py-1 rounded transition-all ${
                        activeTab === "editor"
                          ? "bg-white text-indigo-700 shadow-xs"
                          : "text-slate-500 hover:text-slate-900"
                      }`}
                    >
                      {t.viewEditor}
                    </button>
                    <button
                      id="tab-alerts"
                      onClick={() => setActiveTab("alerts")}
                      className={`px-3 py-1 rounded transition-all ${
                        activeTab === "alerts"
                          ? "bg-white text-indigo-700 shadow-xs"
                          : "text-slate-500 hover:text-slate-900"
                      }`}
                    >
                      {t.viewAlerts} ({uploadedFile.result?.alerts.length || 0})
                    </button>
                  </div>
                )}
              </div>

              {/* Stats overview banner */}
              {uploadedFile.status === "completed" && uploadedFile.result && (
                <div className="bg-slate-50/60 border-b border-slate-200/80 px-6 py-3.5 grid grid-cols-3 gap-4 shrink-0 text-left">
                  <div>
                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider block">{t.accuracyEst}</span>
                    <span className="text-lg font-display font-black text-indigo-600 block mt-0.5">
                      {uploadedFile.result.confidenceEstimate}%
                    </span>
                  </div>
                  <div className="border-l border-slate-200 pl-4">
                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider block">{t.wordCount}</span>
                    <span className="text-lg font-display font-black text-slate-800 block mt-0.5">
                      {uploadedFile.result.wordCount}
                    </span>
                  </div>
                  <div className="border-l border-slate-200 pl-4">
                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider block">{t.alertsCount}</span>
                    <span className={`text-lg font-display font-black block mt-0.5 ${uploadedFile.result.alerts.length > 0 ? "text-amber-600" : "text-slate-400"}`}>
                      {uploadedFile.result.alerts.length}
                    </span>
                  </div>
                </div>
              )}

              {/* Dynamic Viewer Panel */}
              <div className="flex-1 flex flex-col md:flex-row min-h-0 bg-slate-50">
                
                {/* Left pane: File Previews (PDF/Image) */}
                <div className="w-full md:w-1/2 border-b md:border-b-0 md:border-r border-slate-200 flex flex-col bg-slate-50 min-h-[250px] md:min-h-0">
                  <div className="h-9 bg-white border-b border-slate-200 flex items-center px-4 justify-between shrink-0">
                    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">
                      Original Document (Visual View)
                    </span>
                  </div>

                  <div className="flex-1 p-6 flex items-center justify-center overflow-auto">
                    {uploadedFile.previewUrl ? (
                      <div className="relative max-w-full max-h-[380px] bg-white p-3 border border-slate-200 shadow-xs rounded">
                        <img 
                          src={uploadedFile.previewUrl} 
                          alt="Original Devanagari Note" 
                          referrerPolicy="no-referrer"
                          className="max-h-[350px] object-contain rounded-md"
                        />
                      </div>
                    ) : (
                      <div className="bg-white border border-slate-200 rounded-lg p-6 max-w-sm text-center shadow-2xs select-none">
                        <FileText className="w-8 h-8 mx-auto text-slate-300 mb-2" />
                        <p className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                          {uploadedFile.name.endsWith(".pdf") ? "PDF File Document" : "Image File"}
                        </p>
                        <p className="text-[10px] text-slate-400 leading-normal font-medium">
                          The visual preview of the uploaded file and layout components are displayed here.
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Right pane: Active tab digital outputs */}
                <div className="w-full md:w-1/2 flex flex-col bg-white min-h-[350px] md:min-h-0">
                  
                  {/* Export action bars */}
                  {uploadedFile.status === "completed" && (
                    <div className="h-9 bg-slate-50 border-b border-slate-200/80 flex items-center justify-between px-4 shrink-0">
                      <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">
                        Markdown / Text Output
                      </span>
                      <div className="flex space-x-2">
                        <button 
                          onClick={copyToClipboard}
                          className="px-2.5 py-0.5 text-[9px] bg-indigo-50 border border-indigo-150 rounded text-indigo-700 font-bold hover:bg-indigo-100 transition-colors cursor-pointer"
                        >
                          {copiedMessage ? t.copySuccess : t.copyText}
                        </button>
                        <button 
                          onClick={() => downloadFile("md")}
                          className="px-2.5 py-0.5 text-[9px] bg-indigo-600 text-white font-bold rounded shadow-xs hover:bg-indigo-700 transition-colors cursor-pointer"
                        >
                          डाउनलोड .md
                        </button>
                      </div>
                    </div>
                  )}

                  <div className="flex-1 p-6 overflow-y-auto">
                    
                    {/* Process Loading Screen */}
                    {uploadedFile.status === "processing" && (
                      <div className="h-full flex flex-col items-center justify-center text-center gap-3">
                        <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
                        <p className="text-xs font-bold text-indigo-950 animate-pulse">{t.processing}</p>
                      </div>
                    )}

                    {/* Idle State instructions */}
                    {uploadedFile.status === "idle" && (
                      <div className="h-full flex flex-col items-center justify-center text-center p-4">
                        <Sparkles className="w-7 h-7 text-indigo-400 animate-pulse mb-2.5" />
                        <p className="text-xs text-indigo-950 font-bold block mb-1">
                          {t.readyMessage}
                        </p>
                        <button
                          onClick={processOCR}
                          className="mt-3 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded font-bold text-xs"
                        >
                          {t.processBtn}
                        </button>
                      </div>
                    )}

                    {/* Complete State Active Visuals */}
                    {uploadedFile.status === "completed" && (
                      <div className="h-full">
                        
                        {/* Tab-1: High Accuracy render panel */}
                        {activeTab === "preview" && (
                          <div id="ocr-rendered-content" className="prose prose-slate max-w-none text-left">
                            {renderFormattedMarkdownToReact(editableMarkdown)}
                          </div>
                        )}

                        {/* Tab-2: Source raw text editor mode */}
                        {activeTab === "editor" && (
                          <textarea
                            id="ocr-text-editor"
                            value={editableMarkdown}
                            onChange={(e) => setEditableMarkdown(e.target.value)}
                            className="w-full h-full min-h-[300px] border-0 outline-hidden font-mono text-xs md:text-sm leading-relaxed text-slate-800 focus:ring-0 bg-transparent resize-none"
                            placeholder="OCR Output Markdown text will appear here..."
                          />
                        )}

                        {/* Tab-3: Exception Warnings Alert reviewers */}
                        {activeTab === "alerts" && (
                          <div className="flex flex-col gap-4 text-left">
                            <div className="bg-amber-50 border border-amber-200 rounded p-4">
                              <div className="flex items-start gap-2.5 text-amber-900">
                                <AlertTriangle className="w-4 h-4 text-amber-600 font-bold shrink-0 mt-0.5" />
                                <div>
                                  <p className="text-[11px] font-bold">
                                    Exception Management & Blurry Phrases:
                                  </p>
                                  <p className="text-[10px] text-amber-800 font-semibold leading-relaxed mt-1">
                                    Instead of dropping fuzzy text, the model flags bad handwriting, stains, or blurred prints to let you compare and verify with the original document.
                                  </p>
                                </div>
                              </div>
                            </div>

                            {(!uploadedFile.result?.alerts || uploadedFile.result.alerts.length === 0) ? (
                              <div className="p-8 text-center bg-indigo-50 border border-indigo-100 rounded flex flex-col items-center gap-1.5 justify-center">
                                <CheckCircle2 className="w-6 h-6 text-indigo-650" />
                                <p className="text-xs font-bold text-indigo-900">{t.noAlertsFound}</p>
                              </div>
                            ) : (
                              <div className="flex flex-col gap-3">
                                {uploadedFile.result.alerts.map((alertItem: OCRAlert, alertIdx: number) => (
                                  <div 
                                    key={alertIdx} 
                                    className="bg-white border border-amber-200/80 rounded-xl p-4 shadow-xs flex flex-col gap-3.5 transition-all hover:border-amber-300"
                                  >
                                    <div className="flex justify-between items-center text-xs">
                                      <span className="bg-amber-100 text-amber-800 px-2.5 py-0.5 rounded-full font-extrabold flex items-center gap-1 leading-none">
                                        <AlertTriangle className="w-3 h-3 text-amber-600" />
                                        HIGH ALERT #{alertIdx + 1}
                                      </span>
                                      <span className="text-slate-400 font-mono text-[10px] font-semibold">
                                        {t.alertReason}: {alertItem.reason}
                                      </span>
                                    </div>

                                    <div>
                                      <p className="text-[10px] uppercase font-bold text-slate-400 leading-relaxed">{t.alertFragment}:</p>
                                      <p className="text-sm font-bold text-amber-955 mt-0.5 font-mono px-2 py-1 bg-amber-50 rounded-md border border-amber-100/60">
                                        {alertItem.fragment}
                                      </p>
                                    </div>

                                    <div>
                                      <p className="text-[10px] uppercase font-bold text-slate-400 leading-relaxed">{t.alertContext}:</p>
                                      <p className="text-xs text-slate-650 italic mt-0.5 leading-relaxed">
                                        "...{alertItem.context}..."
                                      </p>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}

                          </div>
                        )}

                      </div>
                    )}

                  </div>
                </div>

              </div>

            </div>
          )}
        </section>

      </main>

      {/* Footer System Credits */}
      <footer id="app-footer" className="bg-white border-t border-slate-200/80 mt-auto py-5 px-4 shadow-sm shrink-0">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-400 font-semibold uppercase tracking-wider">
          <p>© 2026 {t.title}</p>
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1.5 text-emerald-600 font-extrabold">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              Secure Multi-modal OCR Engine
            </span>
            <span className="hidden sm:inline">|</span>
            <span>Made in Cloud Sandbox</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
