/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useTransition, useRef } from "react";
import Papa from "papaparse";
import * as XLSX from "xlsx";
import JSZip from "jszip";
import {
  DataType,
  ColumnProfile,
  StatisticalSummary,
  DatasetSummary,
  CleaningConfig,
  CleaningLog,
  ChatMessage,
} from "./types";
import {
  detectType,
  estimateMemoryUsage,
  profileColumns,
  calculateStatistics,
  countDuplicates,
  precomputeGroupBy,
  runCleaningPipeline,
} from "./utils/dataProfiler";
import VisualizationEngine from "./components/VisualizationEngine";
import Markdown from "./components/Markdown";
import {
  Upload,
  Sparkles,
  RefreshCw,
  Search,
  Download,
  CheckCircle2,
  AlertTriangle,
  FileSpreadsheet,
  Trash2,
  Filter,
  BarChart3,
  HelpCircle,
  Play,
  Terminal,
  Settings,
  Flame,
  ArrowRight,
  Database,
  Grid,
  Mail,
  Linkedin,
  ExternalLink,
  User,
  Award,
  Briefcase,
  Globe,
  Info,
  Code,
} from "lucide-react";

// Robust high-fidelity demo dataset
const DEMO_ROWS = [
  { Transaction_ID: 101, Date: "2026-01-05", Region: "North", Category: "Electronics", Sales: 1200, Quantity: 3, Satisfaction: 4.5 },
  { Transaction_ID: 102, Date: "2026-01-06", Region: "North", Category: "Furniture", Sales: 800, Quantity: 2, Satisfaction: 4.0 },
  { Transaction_ID: 103, Date: "2026-01-08", Region: "South", Category: "Electronics", Sales: 3400, Quantity: "", Satisfaction: 4.8 },
  { Transaction_ID: 104, Date: "2026-01-10", Region: "East", Category: "Office Supplies", Sales: 150, Quantity: 5, Satisfaction: 3.5 },
  { Transaction_ID: 105, Date: "2026-01-12", Region: "West", Category: "Electronics", Sales: 2200, Quantity: 4, Satisfaction: 4.2 },
  { Transaction_ID: 106, Date: "2026-01-15", Region: "South", Category: "Furniture", Sales: 950, Quantity: 1, Satisfaction: 1520 }, // Satisfaction outlier
  { Transaction_ID: 107, Date: "2026-01-20", Region: "East", Category: "Electronics", Sales: 1100, Quantity: 2, Satisfaction: 3.9 },
  { Transaction_ID: 108, Date: "2026-01-22", Region: "West", Category: "Office Supplies", Sales: "", Quantity: 8, Satisfaction: 4.1 }, // Missing Sales
  { Transaction_ID: 109, Date: "2026-01-25", Region: "North", Category: "Office Supplies", Sales: 320, Quantity: 3, Satisfaction: 4.4 },
  { Transaction_ID: 110, Date: "2026-01-26", Region: "North", Category: "Office Supplies", Sales: 320, Quantity: 3, Satisfaction: 4.4 }, // Duplicate row
  { Transaction_ID: 111, Date: "2026-01-30", Region: "South", Category: "Office Supplies", Sales: 450, Quantity: 10, Satisfaction: 4.7 },
  { Transaction_ID: 112, Date: "2026-02-02", Region: "West", Category: "Furniture", Sales: 1650, Quantity: "", Satisfaction: 4.3 },
  { Transaction_ID: 113, Date: "2026-02-05", Region: "South", Category: "Electronics", Sales: 4200, Quantity: 6, Satisfaction: 4.9 },
  { Transaction_ID: 114, Date: "2026-02-12", Region: "East", Category: "Furniture", Sales: 720, Quantity: 2, Satisfaction: 3.8 },
  { Transaction_ID: 115, Date: "2026-02-15", Region: "East", Category: "Furniture", Sales: 720, Quantity: 2, Satisfaction: 3.8 }, // Duplicate row
  { Transaction_ID: 116, Date: "2026-02-20", Region: "West", Category: "Electronics", Sales: 2800, Quantity: 4, Satisfaction: 4.6 },
];

// High-fidelity custom stylized vector portrait representing creator K. Kishore
function KishoreAvatarSVG({ className = "h-10 w-10" }: { className?: string }) {
  return (
    <svg viewBox="0 0 400 400" className={`${className} bg-slate-100 rounded-lg shrink-0 object-cover`} xmlns="http://www.w3.org/2000/svg">
      {/* Background: Styled Temple/Ancient Stone Wall Pattern */}
      <defs>
        <linearGradient id="stone-grad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#adb5bd" />
          <stop offset="50%" stopColor="#8a95a5" />
          <stop offset="100%" stopColor="#6c757d" />
        </linearGradient>
        <linearGradient id="skin-grad" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#e8b18a" />
          <stop offset="100%" stopColor="#c98a5f" />
        </linearGradient>
        <linearGradient id="shadow-grad" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#1e293b" stopOpacity="0.4" />
          <stop offset="100%" stopColor="#0f172a" stopOpacity="0" />
        </linearGradient>
        <linearGradient id="hair-grad" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#2c2c2c" />
          <stop offset="100%" stopColor="#0a0a0a" />
        </linearGradient>
        <linearGradient id="shirt-grad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#2563eb" />
          <stop offset="100%" stopColor="#1e3a8a" />
        </linearGradient>
        <filter id="shadow">
          <feDropShadow dx="2" dy="2" stdDeviation="3" floodOpacity="0.3"/>
        </filter>
      </defs>

      {/* Background */}
      <rect width="400" height="400" fill="url(#stone-grad)" />
      {/* Stone texture bricks lines */}
      <path d="M0,100 L400,100 M0,220 L400,220 M0,320 L400,320 M120,0 L120,100 M280,0 L280,100 M200,100 L200,220 M100,220 L100,320 M300,220 L300,320 M180,320 L180,400" stroke="#495057" strokeWidth="2.5" opacity="0.4" strokeDasharray="1, 8" />
      <path d="M0,100 L400,100 M0,220 L400,220 M0,320 L400,320 M120,0 L120,100 M280,0 L280,100 M200,100 L200,220 M100,220 L100,320 M300,220 L300,320 M180,320 L180,400" stroke="#343a40" strokeWidth="1.5" opacity="0.3" />

      {/* Neck Shadow */}
      <path d="M170,220 Q200,250 230,220 L220,170 L180,170 Z" fill="url(#shadow-grad)" />

      {/* Neck */}
      <rect x="175" y="165" width="50" height="60" rx="10" fill="url(#skin-grad)" />

      {/* Human Body (Navy/Cobalt blue shirt) */}
      <path d="M100,340 C100,260 140,220 200,220 C260,220 300,260 300,340 L280,400 L120,400 Z" fill="url(#shirt-grad)" filter="url(#shadow)" />
      
      {/* Collar left */}
      <path d="M135,230 L175,255 L182,225 Z" fill="#1d4ed8" stroke="#1e3a8a" strokeWidth="1" />
      {/* Collar right */}
      <path d="M265,230 L225,255 L218,225 Z" fill="#1d4ed8" stroke="#1e3a8a" strokeWidth="1" />
      
      {/* Neck opening skin visible */}
      <path d="M180,225 Q200,245 220,225 L200,265 Z" fill="url(#skin-grad)" />
      
      {/* Placket/buttons of the shirt */}
      <path d="M197,250 L203,250 L203,400 L197,400 Z" fill="#172554" opacity="0.5" />
      <circle cx="200" cy="280" r="3.5" fill="#f8fafc" />
      <circle cx="200" cy="320" r="3.5" fill="#f8fafc" />
      <circle cx="200" cy="360" r="3.5" fill="#f8fafc" />

      {/* Face shape */}
      <path d="M140,110 C140,55 260,55 260,110 C260,175 240,195 200,195 C160,195 140,175 140,110 Z" fill="url(#skin-grad)" filter="url(#shadow)" />

      {/* Ears */}
      <circle cx="136" cy="115" r="9.5" fill="#c98a5f" />
      <circle cx="264" cy="115" r="9.5" fill="#c98a5f" />

      {/* Eye Brows */}
      <path d="M160,88 C168,81 180,81 185,86" stroke="#1a1a1a" strokeWidth="3" fill="none" strokeLinecap="round" />
      <path d="M240,88 C232,81 220,81 215,86" stroke="#1a1a1a" strokeWidth="3" fill="none" strokeLinecap="round" />

      {/* Eyes */}
      <ellipse cx="172" cy="98" rx="6" ry="4" fill="#ffffff" stroke="#1a1a1a" strokeWidth="1.5" />
      <circle cx="172" cy="98" r="3" fill="#0f172a" />
      <circle cx="174" cy="96" r="1.2" fill="#ffffff" />

      <ellipse cx="228" cy="98" rx="6" ry="4" fill="#ffffff" stroke="#1a1a1a" strokeWidth="1.5" />
      <circle cx="228" cy="98" r="3" fill="#0f172a" />
      <circle cx="226" cy="96" r="1.2" fill="#ffffff" />

      {/* Nose */}
      <path d="M196,95 L200,128 L206,128" stroke="#a1663f" strokeWidth="2.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />

      {/* Stubble beard & mustache matching the user's photo */}
      <path d="M152,125 C146,145 156,182 200,182 C244,182 254,145 248,125 C250,140 248,186 200,186 C152,186 150,140 152,125 Z" fill="#2d2d2d" opacity="0.45" />
      <path d="M180,138 Q200,145 220,138 M180,140 Q200,148 220,140" stroke="#1a1a1a" strokeWidth="4.5" opacity="0.8" fill="none" strokeLinecap="round" />
      <path d="M190,165 Q200,168 210,165 L200,180 Z" fill="#111" opacity="0.6" />

      {/* Smile */}
      <path d="M188,148 Q200,154 212,148" stroke="#1c1917" strokeWidth="2.5" fill="none" strokeLinecap="round" />

      {/* Glasses - Black frames */}
      <rect x="156" y="88" width="34" height="24" rx="5" fill="none" stroke="#000000" strokeWidth="3" />
      <rect x="210" y="88" width="34" height="24" rx="5" fill="none" stroke="#000000" strokeWidth="3" />
      <path d="M190,96 L210,96" stroke="#000000" strokeWidth="3.5" strokeLinecap="round" />
      <path d="M156,96 L138,94" stroke="#000000" strokeWidth="3" strokeLinecap="round" />
      <path d="M244,96 L262,94" stroke="#000000" strokeWidth="3" strokeLinecap="round" />

      {/* Curly Hair - high-detail locks matching photo */}
      <g fill="url(#hair-grad)">
        <circle cx="200" cy="50" r="32" />
        <circle cx="170" cy="54" r="28" />
        <circle cx="230" cy="54" r="28" />
        <circle cx="148" cy="68" r="24" />
        <circle cx="252" cy="68" r="24" />
        
        <circle cx="185" cy="42" r="22" />
        <circle cx="215" cy="42" r="22" />
        <circle cx="158" cy="50" r="20" />
        <circle cx="242" cy="50" r="20" />
        <circle cx="138" cy="80" r="16" />
        <circle cx="262" cy="80" r="16" />
        
        {/* Forehead curls */}
        <path d="M160,70 Q170,78 175,64" stroke="#000000" strokeWidth="5" fill="none" strokeLinecap="round" />
        <path d="M180,68 Q192,76 195,62" stroke="#000000" strokeWidth="5" fill="none" strokeLinecap="round" />
        <path d="M200,66 Q210,76 215,62" stroke="#000000" strokeWidth="5" fill="none" strokeLinecap="round" />
        <path d="M220,68 Q232,76 235,64" stroke="#000000" strokeWidth="5" fill="none" strokeLinecap="round" />
        <path d="M240,70 Q248,76 250,62" stroke="#000000" strokeWidth="5" fill="none" strokeLinecap="round" />
      </g>
    </svg>
  );
}

const getApiUrl = (endpoint: string) => {
  let basePath = window.location.pathname;
  if (basePath.endsWith(".html")) {
    basePath = basePath.substring(0, basePath.lastIndexOf("/"));
  }
  if (basePath.endsWith("/")) {
    basePath = basePath.slice(0, -1);
  }
  return `${basePath}${endpoint}`;
};

export default function App() {
  const [isPending, startTransition] = useTransition();

  // Active dataset states
  const [rawData, setRawData] = useState<any[]>([]);
  const [headers, setHeaders] = useState<string[]>([]);
  const [isDataLoaded, setIsDataLoaded] = useState(false);
  const [fileName, setFileName] = useState("");
  const [fileSizeStr, setFileSizeStr] = useState("");

  // Statistics summaries
  const [profiles, setProfiles] = useState<ColumnProfile[]>([]);
  const [stats, setStats] = useState<{ [colName: string]: StatisticalSummary }>({});
  const [duplicateCount, setDuplicateCount] = useState(0);
  const [summaryMeta, setSummaryMeta] = useState<DatasetSummary | null>(null);

  // Pre-processed cleaned copies
  const [isCleaned, setIsCleaned] = useState(false);
  const [cleanedData, setCleanedData] = useState<any[]>([]);
  const [cleanedHeaders, setCleanedHeaders] = useState<string[]>([]);
  const [cleanedProfiles, setCleanedProfiles] = useState<ColumnProfile[]>([]);
  const [cleanedStats, setCleanedStats] = useState<{ [colName: string]: StatisticalSummary }>({});
  const [cleaningLogs, setCleaningLogs] = useState<CleaningLog[]>([]);

  // Selection configurations
  const [activeTab, setActiveTab] = useState<"overview" | "clean" | "visuals" | "insights" | "query" | "export">("overview");
  const [outlierMethod, setOutlierMethod] = useState<"IQR" | "Z-Score">("IQR");
  const [cleaningConfig, setCleaningConfig] = useState<CleaningConfig>({
    missingValueAction: {},
    removeDuplicates: true,
    outlierAction: {},
    typeCorrections: {},
    standardizeHeaders: false,
  });

  // Insights State
  const [aiInsights, setAiInsights] = useState("");
  const [isLoadingInsights, setIsLoadingInsights] = useState(false);

  // Q&A Copilot State
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [isLoadingQuery, setIsLoadingQuery] = useState(false);

  // Logo Branding State
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const headerLogoInputRef = useRef<HTMLInputElement>(null);

  // Administrative / Admin Profile State
  const [isAdminModalOpen, setIsAdminModalOpen] = useState(false);
  const [adminAvatarUrl, setAdminAvatarUrl] = useState<string | null>(() => {
    return localStorage.getItem("admin_avatar_url") || new URL("../assets/admin_profile.jpg", import.meta.url).href;
  });
  const adminAvatarInputRef = useRef<HTMLInputElement>(null);

  const saveAdminAvatar = (url: string | null) => {
    setAdminAvatarUrl(url);
    if (url) {
      localStorage.setItem("admin_avatar_url", url);
    } else {
      localStorage.removeItem("admin_avatar_url");
    }
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (reader.result) {
        setLogoUrl(reader.result as string);
      }
    };
    reader.readAsDataURL(file);
    // Reset inputs so the same file can be uploaded again if cleared
    e.target.value = "";
  };

  const triggerHeaderLogoUpload = () => {
    headerLogoInputRef.current?.click();
  };

  // Handle local files (CSV, JSON, XLS)
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    processUploadedFile(file);
  };

  const processUploadedFile = (file: File) => {
    setFileName(file.name);
    // bytes format
    const size = file.size;
    const formatSize = size < 1024 ? `${size} B` : size < 1024 * 1024 ? `${(size / 1024).toFixed(1)} KB` : `${(size / (1024 * 1024)).toFixed(1)} MB`;
    setFileSizeStr(formatSize);

    const fileReader = new FileReader();
    const ext = file.name.split(".").pop()?.toLowerCase();

    if (ext === "json") {
      fileReader.onload = (event) => {
        try {
          const parsed = JSON.parse(event.target?.result as string);
          const dataArray = Array.isArray(parsed) ? parsed : [parsed];
          if (dataArray.length > 0) {
            const cols = Object.keys(dataArray[0]);
            initializeDataset(dataArray, cols);
          }
        } catch (err) {
          alert("Error parsing JSON. Ensure it is formatted correctly as a JSON array of objects.");
        }
      };
      fileReader.readAsText(file);
    } else if (ext === "xlsx" || ext === "xls") {
      fileReader.onload = (event) => {
        try {
          const binaryStr = event.target?.result;
          const workbook = XLSX.read(binaryStr, { type: "binary" });
          const sheetName = workbook.SheetNames[0];
          const sheet = workbook.Sheets[sheetName];
          const json: any[] = XLSX.utils.sheet_to_json(sheet, { defval: "" });
          if (json.length > 0) {
            const cols = Object.keys(json[0]);
            initializeDataset(json, cols);
          }
        } catch (err) {
          alert("Error reading Excel file. Check format and permissions.");
        }
      };
      fileReader.readAsBinaryString(file);
    } else {
      // Default CSV
      Papa.parse(file, {
        header: true,
        dynamicTyping: false,
        skipEmptyLines: "greedy",
        complete: (results) => {
          if (results.data && results.data.length > 0) {
            const cols = results.meta.fields || Object.keys(results.data[0]);
            initializeDataset(results.data, cols);
          } else {
            alert("Empty or corrupt CSV file provided.");
          }
        },
        error: () => {
          alert("Failed to parse CSV file standard structure.");
        },
      });
    }
  };

  // Drag and Drop
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file) {
      processUploadedFile(file);
    }
  };

  // Launch pre-baked Demo Dataset
  const loadDemoDataset = () => {
    setFileName("sample_sales_records.csv");
    setFileSizeStr("2.4 KB");
    initializeDataset(DEMO_ROWS, Object.keys(DEMO_ROWS[0]));
  };

  // Process and initialize profiles
  const initializeDataset = (rows: any[], cols: string[]) => {
    setIsDataLoaded(true);
    setIsCleaned(false);
    setCleaningLogs([]);
    setAiInsights("");
    setChatHistory([
      {
        id: "sys-init",
        sender: "system",
        text: `Active dataset initialized successfully with ${rows.length} records. Datatypes and distributions have been calculated. You can now configure your cleansing parameters or run natural language search commands!`,
        timestamp: new Date().toLocaleTimeString(),
      },
    ]);

    startTransition(() => {
      setRawData(rows);
      setHeaders(cols);

      // Perform deep profiling
      const profs = profileColumns(rows, cols);
      setProfiles(profs);

      // Run statistical analysis for each column
      const calculatedStats: { [colName: string]: StatisticalSummary } = {};
      let totalMiss = 0;
      profs.forEach(p => {
        calculatedStats[p.name] = calculateStatistics(rows, p, outlierMethod);
        totalMiss += p.missingCount;
      });
      setStats(calculatedStats);

      const dups = countDuplicates(rows, cols);
      setDuplicateCount(dups);

      setSummaryMeta({
        name: fileName || "Untitled Dataset",
        sizeBytes: rows.length * cols.length * 10, // approximate sizing
        rowCount: rows.length,
        columnCount: cols.length,
        totalMissingCount: totalMiss,
        duplicateRowsCount: dups,
        isCleaned: false,
      });

      // Populate default cleaning pipeline setup
      const initialMissAction: { [key: string]: any } = {};
      const initialOutlierAction: { [key: string]: any } = {};
      const initialTypeAdjust: { [key: string]: DataType } = {};

      profs.forEach(p => {
        initialMissAction[p.name] = p.missingCount > 0 ? (p.role === "numerical" ? "mean" : "mode") : "ignore";
        initialOutlierAction[p.name] = "ignore";
        initialTypeAdjust[p.name] = p.detectedType;
      });

      setCleaningConfig({
        missingValueAction: initialMissAction,
        removeDuplicates: dups > 0,
        outlierAction: initialOutlierAction,
        typeCorrections: initialTypeAdjust,
        standardizeHeaders: false,
      });
    });
  };

  // Recalculate if outlier criteria changes
  const handleOutlierCriteriaChange = (method: "IQR" | "Z-Score") => {
    setOutlierMethod(method);
    if (!isDataLoaded) return;
    const currentRows = isCleaned ? cleanedData : rawData;
    const currentProfs = isCleaned ? cleanedProfiles : profiles;

    const updatedStats: { [colName: string]: StatisticalSummary } = {};
    currentProfs.forEach(p => {
      updatedStats[p.name] = calculateStatistics(currentRows, p, method);
    });
    if (isCleaned) {
      setCleanedStats(updatedStats);
    } else {
      setStats(updatedStats);
    }
  };

  // Trigger Preprocessing actions with 1-Click execution
  const executePreprocessingPipeline = () => {
    if (!isDataLoaded || !summaryMeta) return;

    startTransition(() => {
      const results = runCleaningPipeline(rawData, headers, profiles, cleaningConfig);

      setCleanedData(results.cleanedRows);
      setCleanedHeaders(results.cleanedHeaders);

      // Re-profile the results
      const cProfs = profileColumns(results.cleanedRows, results.cleanedHeaders);
      setCleanedProfiles(cProfs);

      const cStats: { [col: string]: StatisticalSummary } = {};
      cProfs.forEach(cp => {
        cStats[cp.name] = calculateStatistics(results.cleanedRows, cp, outlierMethod);
      });
      setCleanedStats(cStats);
      setCleaningLogs(results.logs);
      setIsCleaned(true);

      const newMiss = cProfs.reduce((a, b) => a + b.missingCount, 0);
      const newDups = countDuplicates(results.cleanedRows, results.cleanedHeaders);

      setSummaryMeta(prev =>
        prev
          ? {
              ...prev,
              rowCount: results.cleanedRows.length,
              columnCount: results.cleanedHeaders.length,
              totalMissingCount: newMiss,
              duplicateRowsCount: newDups,
              isCleaned: true,
            }
          : null
      );

      // Print terminal success message
      setChatHistory(prev => [
        ...prev,
        {
          id: `sys-cleaning-${Date.now()}`,
          sender: "system",
          text: `Preprocessing complete! Ran ${results.logs.length} operations. 
Rows updated from ${rawData.length} to ${results.cleanedRows.length}.
All clean variables are structured and ready in your workspace! Check the cleaning log for fully detailed statistics.`,
          timestamp: new Date().toLocaleTimeString(),
        },
      ]);

      // Move view to overview to show cleaned spreadsheets
      setActiveTab("overview");
    });
  };

  // Reset work
  const resetWorkspace = () => {
    setIsDataLoaded(false);
    setIsCleaned(false);
    setRawData([]);
    setHeaders([]);
    setProfiles([]);
    setStats({});
    setCleanedData([]);
    setCleanedHeaders([]);
    setCleaningLogs([]);
    setSummaryMeta(null);
    setAiInsights("");
    setChatHistory([]);
  };

  // Server-Side Gemini endpoint queries for insights
  const fetchAIInsights = async () => {
    if (!isDataLoaded) return;
    setIsLoadingInsights(true);

    const activeRows = isCleaned ? cleanedData : rawData;
    const activeHeaders = isCleaned ? cleanedHeaders : headers;
    const activeProfs = isCleaned ? cleanedProfiles : profiles;
    const activeStats = isCleaned ? cleanedStats : stats;

    const sample = activeRows.slice(0, 20);

    // Filter frequencies & stats to keep prompts compact
    const promptStatsSummary = activeProfs.map(p => {
      const colS = activeStats[p.name];
      if (p.role === "numerical") {
        return {
          col: p.name,
          role: "numerical",
          mean: colS?.mean?.toFixed(2),
          median: colS?.median?.toFixed(2),
          min: colS?.min,
          max: colS?.max,
          outliers: colS?.outliersCount,
        };
      } else {
        return {
          col: p.name,
          role: "categorical",
          unique: colS?.uniqueValues,
          topCategory: colS?.topCategory,
          topCount: colS?.topCategoryCount,
          freqs: colS?.frequencies?.slice(0, 5).map(f => `${f.value}:${f.count}`),
        };
      }
    });

    try {
      const response = await fetch(getApiUrl("/api/generate-insights"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          datasetName: fileName,
          rowsCount: activeRows.length,
          columnsCount: activeHeaders.length,
          columns: activeProfs.map(p => ({ name: p.name, detected: p.detectedType, missing: p.missingCount })),
          summaryStats: promptStatsSummary,
          sampleRows: sample,
          categoricalAnalysis: activeProfs
            .filter(p => p.role === "categorical")
            .map(p => ({
              column: p.name,
              freq: activeStats[p.name]?.frequencies?.slice(0, 5),
            })),
        }),
      });

      if (!response.ok) {
        throw new Error(await response.text());
      }
      const data = await response.json();
      setAiInsights(data.insights);
    } catch (err: any) {
      alert(`Backend integration error: ${err.message || "Failed to call Gemini"}`);
    } finally {
      setIsLoadingInsights(false);
    }
  };

  // Natural Language Queries on Database with Gemini pre-computed statistics
  const handleCopilotQuery = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!chatInput.trim() || !isDataLoaded) return;

    const userMessage: ChatMessage = {
      id: `usr-${Date.now()}`,
      sender: "user",
      text: chatInput,
      timestamp: new Date().toLocaleTimeString(),
    };

    setChatHistory(prev => [...prev, userMessage]);
    const currentQuery = chatInput;
    setChatInput("");
    setIsLoadingQuery(true);

    const activeRows = isCleaned ? cleanedData : rawData;
    const activeHeaders = isCleaned ? cleanedHeaders : headers;
    const activeProfs = isCleaned ? cleanedProfiles : profiles;
    const activeStats = isCleaned ? cleanedStats : stats;

    // Advanced calculated group-bys (E.g. Region vs Sales average)
    const groupedSummaries = precomputeGroupBy(activeRows, activeProfs);

    const promptStatsSummary = activeProfs.map(p => {
      const colS = activeStats[p.name];
      if (p.role === "numerical") {
        return {
          col: p.name,
          role: "numerical",
          mean: colS?.mean?.toFixed(2),
          median: colS?.median?.toFixed(2),
          min: colS?.min,
          max: colS?.max,
          outliers: colS?.outliersCount,
        };
      } else {
        return {
          col: p.name,
          role: "categorical",
          unique: colS?.uniqueValues,
          topCategory: colS?.topCategory,
          topCount: colS?.topCategoryCount,
          freqs: colS?.frequencies?.slice(0, 8).map(f => `${f.value}:${f.count}`),
        };
      }
    });

    try {
      const response = await fetch(getApiUrl("/api/query-dataset"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          query: currentQuery,
          datasetName: fileName,
          columns: activeProfs.map(p => ({ name: p.name, type: p.detectedType })),
          summaryStats: promptStatsSummary,
          categoricalAnalysis: activeProfs
            .filter(p => p.role === "categorical")
            .map(p => ({
              colName: p.name,
              valueFrequencies: activeStats[p.name]?.frequencies?.slice(0, 10),
            })),
          groupByAnalysis: groupedSummaries,
          sampleRows: activeRows.slice(0, 30),
        }),
      });

      if (!response.ok) {
        throw new Error(await response.text());
      }
      const data = await response.json();

      setChatHistory(prev => [
        ...prev,
        {
          id: `bot-${Date.now()}`,
          sender: "system",
          text: data.answer,
          timestamp: new Date().toLocaleTimeString(),
        },
      ]);
    } catch (err: any) {
      setChatHistory(prev => [
        ...prev,
        {
          id: `bot-err-${Date.now()}`,
          sender: "system",
          text: `⚠️ Query lookup failure: ${err.message || "Failed to resolve query."}`,
          timestamp: new Date().toLocaleTimeString(),
        },
      ]);
    } finally {
      setIsLoadingQuery(false);
    }
  };

  // Standard File Downloads (Module 10 Download Center)
  const downloadCleanedDataset = () => {
    if (!isDataLoaded) return;

    let dataToDownload = cleanedData;
    if (!isCleaned) {
      // Execute the cleansing pipeline automatically on download request with current settings
      const results = runCleaningPipeline(rawData, headers, profiles, cleaningConfig);
      dataToDownload = results.cleanedRows;

      setCleanedData(results.cleanedRows);
      setCleanedHeaders(results.cleanedHeaders);

      const cProfs = profileColumns(results.cleanedRows, results.cleanedHeaders);
      setCleanedProfiles(cProfs);

      const cStats: { [col: string]: StatisticalSummary } = {};
      cProfs.forEach(cp => {
        cStats[cp.name] = calculateStatistics(results.cleanedRows, cp, outlierMethod);
      });
      setCleanedStats(cStats);
      setCleaningLogs(results.logs);
      setIsCleaned(true);

      const newMiss = cProfs.reduce((a, b) => a + b.missingCount, 0);
      const newDups = countDuplicates(results.cleanedRows, results.cleanedHeaders);

      setSummaryMeta(prev =>
        prev
          ? {
              ...prev,
              rowCount: results.cleanedRows.length,
              columnCount: results.cleanedHeaders.length,
              totalMissingCount: newMiss,
              duplicateRowsCount: newDups,
              isCleaned: true,
            }
          : null
      );

      setChatHistory(prev => [
        ...prev,
        {
          id: `sys-cleaning-${Date.now()}`,
          sender: "system",
          text: `Auto-Preprocessed dataset on export request successfully! All records configured.`,
          timestamp: new Date().toLocaleTimeString(),
        },
      ]);
    }

    const csvStr = Papa.unparse(dataToDownload);
    const blob = new Blob([csvStr], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);

    let exportName = fileName || "data.csv";
    if (!exportName.toLowerCase().endsWith(".csv")) {
      const idx = exportName.lastIndexOf(".");
      if (idx !== -1) {
        exportName = exportName.substring(0, idx) + ".csv";
      } else {
        exportName = exportName + ".csv";
      }
    }
    const cleanPrefix = exportName.toLowerCase().startsWith("cleaned_") ? "" : "cleaned_";
    link.setAttribute("download", `${cleanPrefix}${exportName}`);

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // HTML Printable format report
  const downloadEDAReport = () => {
    if (!isDataLoaded) return;

    const activeRows = isCleaned ? cleanedData : rawData;
    const activeProfs = isCleaned ? cleanedProfiles : profiles;
    const activeStats = isCleaned ? cleanedStats : stats;

    let profileReportHtml = "";
    activeProfs.forEach(p => {
      const pStats = activeStats[p.name];
      const detailSection =
        p.role === "numerical"
          ? `
        <tr><td>Mean:</td><td class="num">${pStats?.mean?.toFixed(2)}</td></tr>
        <tr><td>Median:</td><td class="num">${pStats?.median?.toFixed(2)}</td></tr>
        <tr><td>Min:</td><td class="num">${pStats?.min}</td></tr>
        <tr><td>Max:</td><td class="num">${pStats?.max}</td></tr>
        <tr><td>Std Dev:</td><td class="num">${pStats?.std?.toFixed(2)}</td></tr>
        <tr><td>Outliers Detected:</td><td class="num text-red">${pStats?.outliersCount}</td></tr>
      `
          : `
        <tr><td>Unique Categories:</td><td class="num">${pStats?.uniqueValues}</td></tr>
        <tr><td>Top Class Category:</td><td>"${pStats?.topCategory}" (${pStats?.topCategoryCount} rows)</td></tr>
        <tr><td valign="top">Frequencies:</td><td>
          <ul class="freq-list">
            ${pStats?.frequencies
              ?.slice(0, 5)
              .map(f => `<li><strong>${f.value}:</strong> ${f.count} (${f.percentage.toFixed(1)}%)</li>`)
              .join("")}
          </ul>
        </td></tr>
      `;

      profileReportHtml += `
        <div class="card">
          <h3>Variable: ${p.name} <span class="badge ${p.role}">${p.role}</span></h3>
          <table>
            <tr><td width="40%">Missing Count:</td><td class="num">${p.missingCount} (${p.missingPercentage.toFixed(1)}%)</td></tr>
            <tr><td>Inferred DataType:</td><td>${p.detectedType}</td></tr>
            ${detailSection}
          </table>
        </div>
      `;
    });

    const reportStyles = `
      body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; color: #334155; line-height: 1.5; padding: 40px; background-color: #f8fafc; }
      h1 { color: #0f172a; margin-bottom: 5px; font-weight: 800; }
      h2 { color: #1e293b; margin-top: 30px; border-bottom: 2px solid #cbd5e1; padding-bottom: 8px; }
      .meta { font-size: 14px; color: #64748b; margin-bottom: 30px; }
      .grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 20px; margin-bottom: 30px; }
      .stats-card { background: white; padding: 15px 20px; border-radius: 8px; border: 1px solid #e2e8f0; }
      .stats-card h4 { margin: 0; font-size: 12px; text-transform: uppercase; color: #64748b; letter-spacing: 0.1em; }
      .stats-card .val { font-size: 24px; font-weight: 700; color: #0f172a; margin-top: 8px; }
      .card { background: white; padding: 20px; border-radius: 12px; border: 1px solid #e2e8f0; box-shadow: 0 1px 3px rgba(0,0,0,0.02); margin-bottom: 20px; }
      .card h3 { margin-top: 0; color: #1e293b; display: flex; justify-content: space-between; align-items: center; }
      .badge { font-size: 11px; padding: 3px 8px; border-radius: 12px; font-weight: 600; text-transform: uppercase; }
      .numerical { background: #ecfdf5; color: #065f46; }
      .categorical { background: #eff6ff; color: #1e40af; }
      .date { background: #fef3c7; color: #92400e; }
      table { width: 100%; border-collapse: collapse; font-size: 14px; }
      td { padding: 8px 12px; border-bottom: 1px solid #f1f5f9; }
      .num { font-family: monospace; font-weight: 600; }
      .text-red { color: #dc2626; }
      .freq-list { padding-left: 15px; margin: 0; font-size: 13px; }
      @media print {
        body { background: white; padding: 0; }
        .card { page-break-inside: avoid; }
      }
    `;

    const docStr = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>EDA Data Summary Report: ${fileName}</title>
        <style>${reportStyles}</style>
      </head>
      <body>
        ${logoUrl ? `<div style="text-align: right; margin-bottom: 25px;"><img src="${logoUrl}" style="max-height: 55px; max-width: 200px; object-fit: contain; border-radius: 4px;" alt="Custom Brand Logo"></div>` : ""}
        <h1>Exploratory Data Analysis Report</h1>
        <div class="meta">Generated automatically on ${new Date().toLocaleDateString()} | Dataset Name: ${fileName}</div>
        
        <h2>Dataset Summary Meta</h2>
        <div class="grid">
          <div class="stats-card">
            <h4>Total Records</h4>
            <div class="val">${activeRows.length}</div>
          </div>
          <div class="stats-card">
            <h4>Attributes/Columns</h4>
            <div class="val">${activeProfs.length}</div>
          </div>
          <div class="stats-card">
            <h4>Missing Values</h4>
            <div class="val">${activeProfs.reduce((a, b) => a + b.missingCount, 0)}</div>
          </div>
          <div class="stats-card">
            <h4>Clean Status</h4>
            <div class="val">${isCleaned ? "Fully Preprocessed" : "Raw Raw Data"}</div>
          </div>
        </div>

        <h2>Detailed Variables Profiling</h2>
        ${profileReportHtml}

        <script>
          window.onload = function() {
            // Optional instruction to trigger saving
            console.log("Interactive PDF printable compiled.");
          }
        </script>
      </body>
      </html>
    `;

    const blob = new Blob([docStr], { type: "text/html;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `EDA_Report_${fileName.split(".")[0]}.html`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Compile ZIP file containing CSV logs, profiles, aggregates using JSZip
  const compileInsightsZip = async () => {
    if (!isDataLoaded) return;
    const zip = new JSZip();

    const activeRows = isCleaned ? cleanedData : rawData;
    const activeHeaders = isCleaned ? cleanedHeaders : headers;
    const activeProfs = isCleaned ? cleanedProfiles : profiles;
    const activeStats = isCleaned ? cleanedStats : stats;

    // 1. Cleaned CSV file
    const csvContent = Papa.unparse(activeRows);
    zip.file("dataset_cleaned.csv", csvContent);

    // 2. Data profiles json
    zip.file("variables_profiles.json", JSON.stringify(activeProfs, null, 2));

    // 3. Complete statistics JSON summary
    zip.file("statistical_summaries.json", JSON.stringify(activeStats, null, 2));

    // 4. Cleaning executions Log
    if (isCleaned) {
      const logCsv = Papa.unparse(cleaningLogs);
      zip.file("cleaning_executions_log.csv", logCsv);
    }

    // 5. System Readme
    const readme = `Automated Data Analyst Pipeline Package
===============================================
Dataset Name: ${fileName}
Compiled On: ${new Date().toISOString()}
Dimensions: ${activeRows.length} rows, ${activeHeaders.length} columns.

Contents Checklist:
- dataset_cleaned.csv: Active cleaned data records.
- variables_profiles.json: Data type schemas and quality detections.
- statistical_summaries.json: Complete calculated aggregates, frequencies, and percentiles.
- cleaning_executions_log.csv: One-click pipelines log (if cleaning was triggered).`;
    zip.file("README_MANIFEST.txt", readme);

    try {
      const blob = await zip.generateAsync({ type: "blob" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.setAttribute("href", url);
      link.setAttribute("download", `DataAnalyst_Workspace_${fileName.split(".")[0]}.zip`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      alert("Error building Workspace ZIP bundle.");
    }
  };

  return (
    <div className="min-h-screen bg-[#F7F8FC] flex flex-col font-sans text-stone" id="automated_data_analyst_app">
      {/* Top Banner section */}
      <header className="bg-white border-b border-indigo-50 px-6 py-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 shrink-0">
        <div className="flex items-center gap-3">
          <div 
            onClick={triggerHeaderLogoUpload}
            className="h-10 w-10 bg-iris hover:bg-iris-dark rounded-xl flex items-center justify-center overflow-hidden shrink-0 cursor-pointer hover:ring-2 hover:ring-offset-2 hover:ring-iris/50 transition-all duration-200"
            title="Click to Upload Custom Brand Logo"
          >
            {logoUrl ? (
              <img src={logoUrl} className="h-full w-full object-contain p-1 bg-white" alt="Custom Logo" />
            ) : (
              <Database className="h-5 w-5 text-white" />
            )}
          </div>
          <input
            ref={headerLogoInputRef}
            type="file"
            accept=".png,.jpg,.jpeg,.svg"
            onChange={handleLogoUpload}
            className="sr-only"
          />
          <div>
            <h1 className="text-xl font-display font-bold tracking-tight text-slate-800 flex items-center gap-1.5">
              KiPrism <span className="text-iris">Pro</span>
            </h1>
            <p className="text-xxs text-stone mt-0.5 font-sans font-medium">Professional automated dataset diagnostics, interactive 1-click cleaning & intelligence console</p>
          </div>
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
          {isDataLoaded && (
            <div className="flex flex-wrap items-center gap-3 bg-iris-light p-2 rounded-xl border border-indigo-100">
              <div className="flex items-center gap-2 px-3 py-1 font-mono text-xs border-r border-indigo-100 text-stone-dark">
                <span className="text-stone">Rows:</span>
                <span className="font-bold text-iris">{summaryMeta?.rowCount}</span>
              </div>
              <div className="flex items-center gap-2 px-3 py-1 font-mono text-xs border-r border-indigo-100 text-stone-dark">
                <span className="text-stone">Cols:</span>
                <span className="font-bold text-iris">{summaryMeta?.columnCount}</span>
              </div>
              <button
                onClick={resetWorkspace}
                className="flex items-center gap-1 bg-white hover:bg-rose-light border border-indigo-50 hover:border-rose/20 text-stone-dark text-xs px-3 py-1 rounded-lg transition-all font-medium cursor-pointer shadow-xxs"
                id="reset_workspace_btn"
              >
                <Trash2 className="h-3 w-3 text-rose" />
                Reset Workspace
              </button>
            </div>
          )}

          <button
            type="button"
            onClick={() => setIsAdminModalOpen(true)}
            className="flex items-center gap-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-950 font-semibold text-xs px-3.5 py-2 rounded-xl transition-all shadow-xxs border border-indigo-100/80 cursor-pointer group"
            title="Click to view Administrative Portfolio"
          >
            <User className="h-4 w-4 text-indigo-600 group-hover:scale-110 transition-transform" />
            <span className="tracking-wide">ABOUT ADMIN</span>
          </button>
        </div>
      </header>

      {/* Main dynamic workspace */}
      {!isDataLoaded ? (
        <div className="flex-grow flex flex-col items-center justify-center p-6 bg-gradient-to-tr from-[#EEF3FF] via-[#F7F8FC] to-white">
          <div className="w-full max-w-xl bg-white p-8 rounded-2xl border border-indigo-50/50 shadow-sm space-y-6">
            <div className="text-center space-y-2">
              <span className="text-xxs bg-iris-light text-iris px-3 py-1 rounded-full font-bold uppercase tracking-wider font-mono">
                Module 1 · Dataset Upload
              </span>
              <h2 className="text-2xl font-display font-medium tracking-tight text-slate-800">Dataset Analysis Dashboard</h2>
              <p className="text-xs text-stone max-w-md mx-auto">
                Cleanly diagnose type signatures, treat duplicates, cap outliers, resolve missing entries, and query your database using our advanced AI-assisted workflow.
              </p>
            </div>

            {/* Drag Zone */}
            <div
              onDragOver={handleDragOver}
              onDrop={handleDrop}
              className="border-2 border-dashed border-indigo-100 bg-[#F7F8FC] hover:bg-iris-light/30 hover:border-iris rounded-xl p-8 text-center cursor-pointer transition-all flex flex-col items-center group relative"
            >
              <input
                type="file"
                accept=".csv,.xlsx,.xls,.json"
                onChange={handleFileUpload}
                className="absolute inset-0 opacity-0 cursor-pointer"
                id="file_upload_input"
              />
              <div className="p-4 bg-white rounded-full shadow-xxs group-hover:scale-110 transition-transform mb-3 border border-indigo-50">
                <Upload className="h-6 w-6 text-iris" />
              </div>
              <p className="text-xs font-semibold text-slate-700">
                Drag & drop spreadsheet files here, or click <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-bold bg-[#eff6ff] text-[#1d4ed8] border border-[#bfdbfe] hover:bg-[#dbeafe] transition-all">browse</span>
              </p>
              <p className="text-xxs text-stone mt-1.5 font-mono">Supports tabular structures: CSV, JSON, XLS or XLSX</p>
            </div>

            <div className="relative flex py-2 items-center">
              <div className="flex-grow border-t border-indigo-50"></div>
              <span className="flex-shrink mx-4 text-xxs text-stone uppercase font-semibold font-mono">Or Initiate Tabular Demo</span>
              <div className="flex-grow border-t border-indigo-50"></div>
            </div>

            {/* Try Demo dataset row */}
            <button
              onClick={loadDemoDataset}
              className="w-full bg-iris hover:bg-iris-dark text-white font-semibold py-3.5 px-4 text-xs rounded-xl transition-all shadow-xs flex items-center justify-center gap-2 group cursor-pointer"
              id="load_demo_dataset_btn"
            >
              <Flame className="h-4 w-4 text-[#FFDE4D] group-hover:scale-110 transition-transform" />
              <span>Load Interactive Sample Records</span>
              <ArrowRight className="h-4 w-4 text-white/80 group-hover:translate-x-1 transition-transform" />
            </button>
          </div>
        </div>
      ) : (
        <div className="flex-grow flex flex-col md:flex-row overflow-hidden relative">
          {/* Left Panel/Sidebar navigation */}
          <aside className="w-full md:w-64 bg-[#EEF3FF] border-r border-[#EEF3FF]/40 flex flex-col shrink-0 justify-between">
            <div>
              {/* Active file summary brief info */}
              <div className="p-4 border-b border-indigo-50/50 bg-white/40">
                <div className="flex items-center gap-2 text-xs truncate font-semibold text-slate-800 font-display">
                  <FileSpreadsheet className="h-4 w-4 text-iris shrink-0" />
                  <span className="truncate">{fileName}</span>
                </div>
                <div className="flex justify-between items-center text-[10px] text-stone mt-2 font-mono bg-white/80 p-2 rounded-lg border border-indigo-50/30">
                  <span>Size: {fileSizeStr}</span>
                  <span className={`px-1.5 py-0.5 rounded-full text-[9px] font-bold ${isCleaned ? "bg-sage-light text-sage" : "bg-amber-light text-amber"}`}>
                    {isCleaned ? "Cleaned" : "Raw"}
                  </span>
                </div>
              </div>

              {/* Nav List */}
              <nav className="p-4 space-y-1.5">
                <button
                  onClick={() => setActiveTab("overview")}
                  className={`w-full flex items-center gap-2.5 px-3.5 py-2.5 text-xs font-semibold rounded-xl transition-all cursor-pointer ${
                    activeTab === "overview" ? "bg-iris text-white shadow-sm" : "hover:bg-white/60 text-slate-600 hover:text-iris"
                  }`}
                  id="nav_overview_btn"
                >
                  <Grid className="h-4 w-4" />
                  <span>Dataset Explorer</span>
                </button>

                <button
                  onClick={() => setActiveTab("clean")}
                  className={`w-full flex items-center justify-between px-3.5 py-2.5 text-xs font-semibold rounded-xl transition-all cursor-pointer ${
                    activeTab === "clean" ? "bg-sage text-white shadow-sm" : "hover:bg-white/60 text-slate-600 hover:text-sage"
                  }`}
                  id="nav_clean_btn"
                >
                  <div className="flex items-center gap-2.5">
                    <Filter className="h-4 w-4" />
                    <span>Cleansing Pipeline</span>
                  </div>
                  {summaryMeta && (summaryMeta.totalMissingCount > 0 || summaryMeta.duplicateRowsCount > 0) && !isCleaned && (
                    <span className="bg-amber text-white px-2 py-0.5 rounded-full text-[9px] font-black font-mono">
                      !
                    </span>
                  )}
                </button>

                <button
                  onClick={() => setActiveTab("visuals")}
                  className={`w-full flex items-center gap-2.5 px-3.5 py-2.5 text-xs font-semibold rounded-xl transition-all cursor-pointer ${
                    activeTab === "visuals" ? "bg-iris text-white shadow-sm" : "hover:bg-white/60 text-slate-600 hover:text-iris"
                  }`}
                  id="nav_visuals_btn"
                >
                  <BarChart3 className="h-4 w-4" />
                  <span>Auto-EDA Visuals</span>
                </button>

                <button
                  onClick={() => setActiveTab("insights")}
                  className={`w-full flex items-center gap-2.5 px-3.5 py-2.5 text-xs font-semibold rounded-xl transition-all cursor-pointer ${
                    activeTab === "insights" ? "bg-lavender text-white shadow-sm" : "hover:bg-white/60 text-slate-600 hover:text-lavender"
                  }`}
                  id="nav_insights_btn"
                >
                  <Sparkles className="h-4 w-4" />
                  <span>AI Copilot Insights</span>
                </button>

                <button
                  onClick={() => setActiveTab("query")}
                  className={`w-full flex items-center gap-2.5 px-3.5 py-2.5 text-xs font-semibold rounded-xl transition-all cursor-pointer ${
                    activeTab === "query" ? "bg-lavender text-white shadow-sm" : "hover:bg-white/60 text-slate-600 hover:text-lavender"
                  }`}
                  id="nav_query_btn"
                >
                  <HelpCircle className="h-4 w-4" />
                  <span>Copilot Q&A Console</span>
                </button>

                <button
                  onClick={() => setActiveTab("export")}
                  className={`w-full flex items-center gap-2.5 px-3.5 py-2.5 text-xs font-semibold rounded-xl transition-all cursor-pointer ${
                    activeTab === "export" ? "bg-sage text-white shadow-sm" : "hover:bg-white/60 text-slate-600 hover:text-sage"
                  }`}
                  id="nav_export_btn"
                >
                  <Download className="h-4 w-4" />
                  <span>Export Center</span>
                </button>
              </nav>
            </div>

            {/* About Admin Profile Section */}
            <div className="p-4 border-t border-indigo-50/50 bg-indigo-50/5 space-y-3">
              <button
                type="button"
                onClick={() => setIsAdminModalOpen(true)}
                className="w-full flex items-center justify-between gap-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-950 font-semibold text-xs px-3 py-2.5 rounded-xl transition-all shadow-xxs border border-indigo-100/80 cursor-pointer group"
                title="Click to open full Administrative Portfolio"
              >
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4 text-indigo-600 group-hover:scale-110 transition-transform" />
                  <span className="tracking-wide">ABOUT ADMIN</span>
                </div>
                <ArrowRight className="h-3.5 w-3.5 text-indigo-500 group-hover:translate-x-0.5 transition-transform" />
              </button>

              <div className="bg-white/80 p-3 pb-3.5 rounded-xl border border-indigo-50/80 shadow-xxs space-y-3 text-left">
                <div className="flex items-center gap-3">
                  <div className="shrink-0">
                    {adminAvatarUrl ? (
                      <img 
                        src={adminAvatarUrl} 
                        className="h-11 w-11 rounded-lg object-cover border border-slate-200/80 bg-slate-50" 
                        alt="K. Kishore" 
                        referrerPolicy="no-referrer"
                      />
                    ) : (
                      <KishoreAvatarSVG className="h-11 w-11 rounded-lg" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <h4 className="text-xs font-bold text-slate-800 truncate">K. Kishore</h4>
                    <span className="text-[9.5px] font-mono font-bold text-indigo-700 bg-indigo-50 px-1 py-0.5 rounded inline-block mt-0.5 uppercase tracking-wide">Developer & Creator</span>
                  </div>
                </div>

                <div className="space-y-1.5 text-[10.5px] text-slate-600 font-medium pt-1 border-t border-slate-100">
                  <a 
                    href="mailto:kishorekumar04072004@gmail.com" 
                    className="flex items-center gap-2 hover:text-indigo-600 transition-colors py-0.5 truncate"
                    title="Send an email to Creator"
                  >
                    <Mail className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                    <span className="truncate font-mono">kishorekumar04072004@gmail.com</span>
                  </a>
                  <a 
                    href="https://www.linkedin.com/in/kishore-k-5b7666268" 
                    target="_blank" 
                    rel="noopener noreferrer" 
                    className="flex items-center gap-2 hover:text-[#0a66c2] transition-colors py-0.5 truncate"
                    title="Visit Linkedin Profile"
                  >
                    <Linkedin className="h-3.5 w-3.5 text-[#0a66c2] shrink-0" />
                    <span className="truncate text-[#0a66c2] font-semibold">Linkedin Profile</span>
                  </a>
                </div>
              </div>
            </div>

            {/* Bottom Credits of high layout craft */}
            <div className="p-4 border-t border-indigo-50/50 text-center bg-white/20">
              <span className="text-[9px] text-stone font-semibold uppercase tracking-wider font-mono block">Run Status</span>
              <div className="flex items-center justify-center gap-1.5 mt-1.5 text-[10px] font-mono text-sage">
                <span className="h-2.5 w-2.5 rounded-full bg-sage inline-block animate-pulse"></span>
                <span className="font-semibold">Local workspace ready</span>
              </div>
            </div>
          </aside>

          {/* Main Content Area */}
          <main className="flex-1 overflow-y-auto p-6 md:p-8 space-y-6">
            
            {/* Quick summary cards section on main dashboard */}
            <section className="grid grid-cols-2 lg:grid-cols-5 gap-4">
              <div className="bg-white p-5 rounded-xl border border-indigo-50/50 shadow-xs relative overflow-hidden">
                <div className="absolute top-0 left-0 right-0 h-1 bg-iris"></div>
                <span className="text-xxs text-stone font-semibold uppercase tracking-wider block font-mono">Total Records</span>
                <span className="text-2xl font-bold text-slate-800 font-mono mt-2 block">{summaryMeta?.rowCount}</span>
              </div>
              <div className="bg-white p-5 rounded-xl border border-indigo-50/50 shadow-xs relative overflow-hidden">
                <div className="absolute top-0 left-0 right-0 h-1 bg-iris"></div>
                <span className="text-xxs text-stone font-semibold uppercase tracking-wider block font-mono">Dimension Columns</span>
                <span className="text-2xl font-bold text-slate-800 font-mono mt-2 block">{summaryMeta?.columnCount}</span>
              </div>
              <div className="bg-white p-5 rounded-xl border border-indigo-50/50 shadow-xs relative overflow-hidden">
                <div className="absolute top-0 left-0 right-0 h-1 bg-amber"></div>
                <span className="text-xxs text-stone font-semibold uppercase tracking-wider block font-mono">Missing values</span>
                <span className={`text-2xl font-bold font-mono mt-2 block ${summaryMeta?.totalMissingCount && summaryMeta.totalMissingCount > 0 ? "text-amber" : "text-sage"}`}>
                  {summaryMeta?.totalMissingCount}
                </span>
              </div>
              <div className="bg-white p-5 rounded-xl border border-indigo-50/50 shadow-xs relative overflow-hidden">
                <div className="absolute top-0 left-0 right-0 h-1 bg-rose"></div>
                <span className="text-xxs text-stone font-semibold uppercase tracking-wider block font-mono">Duplicate rows</span>
                <span className={`text-2xl font-bold font-mono mt-2 block ${summaryMeta?.duplicateRowsCount && summaryMeta.duplicateRowsCount > 0 ? "text-rose" : "text-sage"}`}>
                  {summaryMeta?.duplicateRowsCount}
                </span>
              </div>
              <div className="bg-white p-5 rounded-xl border border-indigo-50/50 shadow-xs col-span-2 lg:col-span-1 relative overflow-hidden">
                <div className="absolute top-0 left-0 right-0 h-1 bg-stone"></div>
                <span className="text-xxs text-stone font-semibold uppercase tracking-wider block font-mono">Inferred Memory</span>
                <span className="text-2xl font-bold text-slate-800 font-mono mt-2 block truncate">
                  {estimateMemoryUsage(isCleaned ? cleanedData : rawData)}
                </span>
              </div>
            </section>

            {/* Active views matching state routing */}

            {/* View 0: Dataset Explorer */}
            {activeTab === "overview" && (
              <div className="space-y-6" id="explorer_tab_view">
                <div className="bg-white p-5 rounded-xl border border-indigo-50/50 shadow-xs">
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b border-indigo-50 pb-3 mb-4 gap-4">
                    <div>
                      <h2 className="text-sm font-display font-semibold text-slate-800 uppercase tracking-wider flex items-center gap-2">
                        <FileSpreadsheet className="h-4 w-4 text-iris" />
                        Spreadsheet Grid Preview
                      </h2>
                      <p className="text-xxs text-stone mt-0.5">Showing the initial 100 rows containing live parsed strings, currencies, and timestamps.</p>
                    </div>

                    <div className="flex items-center gap-3">
                      <label className="text-xxs text-stone font-semibold">Diagnosis Settings:</label>
                      <select
                        value={outlierMethod}
                        onChange={e => handleOutlierCriteriaChange(e.target.value as any)}
                        className="text-xs bg-iris-light border border-indigo-100 rounded-md px-2.5 py-1 text-iris font-semibold focus:outline-hidden"
                        id="outlier_diagnostic_selector"
                      >
                        <option value="IQR">IQR Outlier Formula (1.5x)</option>
                        <option value="Z-Score">Z-Score 3x Standard deviation</option>
                      </select>
                    </div>
                  </div>

                  {/* Table Viewer Grid layout */}
                  <div className="overflow-x-auto border border-indigo-50 rounded-lg max-h-[400px]">
                    <table className="w-full text-xs text-left border-collapse table-auto">
                      <thead>
                        <tr className="bg-[#F7F8FC] border-b border-indigo-50 font-mono text-[10px] text-stone-dark font-bold sticky top-0 z-10 shadow-xxs">
                          <th className="p-3 bg-[#F7F8FC]">Row</th>
                          {(isCleaned ? cleanedHeaders : headers).map((h, hIdx) => {
                            const prof = (isCleaned ? cleanedProfiles : profiles).find(p => p.name === h);
                            return (
                              <th key={hIdx} className="p-3 bg-[#F7F8FC] uppercase tracking-wider whitespace-nowrap min-w-[120px]">
                                {h}
                                <span className="block text-[8px] text-stone font-normal normal-case font-sans">
                                  {prof?.detectedType} ({prof?.role})
                                </span>
                              </th>
                            );
                          })}
                        </tr>
                      </thead>
                      <tbody>
                        {(isCleaned ? cleanedData : rawData).slice(0, 100).map((row, rowIdx) => (
                          <tr key={rowIdx} className="border-b border-indigo-50/30 hover:bg-[#F7F8FC]/40 font-mono">
                            <td className="p-3 text-stone text-center font-bold bg-[#F7F8FC]/60 sticky left-0 border-r border-[#EEF3FF]">
                              {rowIdx + 1}
                            </td>
                            {(isCleaned ? cleanedHeaders : headers).map((h, hIdx) => {
                              const cellValue = row[h];
                              const prof = (isCleaned ? cleanedProfiles : profiles).find(p => p.name === h);

                              // Cell diagnosis highlights
                              const isMissing = cellValue === null || cellValue === undefined || String(cellValue).trim() === "";
                              
                              let isOutlier = false;
                              if (prof && prof.role === "numerical" && !isMissing) {
                                const numV = Number(String(cellValue).replace(/[\$,%]/g, ""));
                                const colStats = (isCleaned ? cleanedStats : stats)[prof.name];
                                if (colStats && colStats.q1 !== undefined && colStats.q3 !== undefined && colStats.iqr !== undefined) {
                                  if (outlierMethod === "IQR") {
                                    isOutlier = numV < colStats.q1 - 1.5 * colStats.iqr || numV > colStats.q3 + 1.5 * colStats.iqr;
                                  } else if (colStats.mean !== undefined && colStats.std !== undefined && colStats.std > 0) {
                                    isOutlier = Math.abs((numV - colStats.mean) / colStats.std) > 3;
                                  }
                                }
                              }

                              let tdClass = "p-3 font-medium truncate max-w-[170px]";
                              if (isMissing) {
                                tdClass += " bg-rose-light text-rose border border-rose-light/50";
                              } else if (isOutlier) {
                                tdClass += " bg-amber-light text-amber border border-amber-light/50";
                              } else {
                                tdClass += " text-slate-700";
                              }

                              return (
                                <td key={hIdx} className={tdClass} title={String(cellValue)}>
                                  {isMissing ? "NaN" : String(cellValue)}
                                </td>
                              );
                            })}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  <div className="flex justify-between items-center mt-3 text-xxs text-stone font-mono">
                    <span>* Rose cells indicate missing values | Amber cells indicate calculated outliers.</span>
                    <span>Loaded {rawData.length} total rows.</span>
                  </div>
                </div>

                {/* Profiling breakdowns variables panel */}
                <div className="bg-white p-5 rounded-xl border border-indigo-50/50 shadow-xs">
                  <h3 className="text-sm font-display font-semibold text-slate-800 uppercase tracking-wider mb-4 flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-iris" />
                    Structured Quality Profiles
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {(isCleaned ? cleanedProfiles : profiles).map(prof => {
                      const colStats = (isCleaned ? cleanedStats : stats)[prof.name];
                      const hasIssues = prof.missingCount > 0 || (colStats?.outliersCount && colStats.outliersCount > 0);

                      return (
                        <div key={prof.name} className={`p-4 rounded-xl border transition-all ${hasIssues ? "border-amber/20 bg-amber-light/20" : "border-indigo-50 bg-[#F7F8FC]/30"}`}>
                          <div className="flex justify-between items-center">
                            <div>
                              <span className="font-mono text-xs font-bold text-slate-800 break-all">{prof.name}</span>
                              <span className="block text-[10px] text-stone mt-0.5 capitalize font-mono">{prof.detectedType} • {prof.role}</span>
                            </div>
                            <span className={`text-[9px] font-bold px-2.5 py-0.5 rounded-full ${hasIssues ? "bg-amber-light text-amber" : "bg-sage-light text-sage"}`}>
                              {hasIssues ? "Anomalous" : "Pristine"}
                            </span>
                          </div>

                          <div className="mt-4 grid grid-cols-2 gap-2 text-xxs pt-3 border-t border-indigo-50/50 font-mono">
                            <div>
                              <span className="text-stone">Missing rows:</span>
                              <span className={`block font-semibold mt-0.5 ${prof.missingCount > 0 ? "text-rose font-bold" : "text-[#4D4C46]"}`}>
                                {prof.missingCount} ({prof.missingPercentage.toFixed(1)}%)
                              </span>
                            </div>
                            <div>
                              <span className="text-stone">Unique values:</span>
                              <span className="block font-semibold mt-0.5 text-[#4D4C46]">{prof.distinctCount}</span>
                            </div>
                            {prof.role === "numerical" ? (
                              <div className="col-span-2">
                                <span className="text-stone">Outliers Count:</span>
                                <span className={`block font-semibold mt-0.5 ${colStats?.outliersCount && colStats.outliersCount > 0 ? "text-amber font-bold" : "text-[#4D4C46]"}`}>
                                  {colStats?.outliersCount ?? 0} found
                                </span>
                              </div>
                            ) : (
                              <div className="col-span-2">
                                <span className="text-stone">Dominant Mode:</span>
                                <span className="block font-semibold mt-[#4D4C46] mt-0.5 truncate">
                                  "{colStats?.topCategory || "N/A"}" ({colStats?.topCategoryCount ?? 0} rows)
                                </span>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            {/* View 1: Data Cleaning Pipeline Editor */}
            {activeTab === "clean" && (
              <div className="space-y-6" id="cleaning_tab_view">
                <div className="bg-white p-5 rounded-xl border border-indigo-50/50 shadow-xs">
                  <div className="border-b border-indigo-50 pb-3 mb-6">
                    <h2 className="text-sm font-display font-semibold text-slate-800 uppercase tracking-wider flex items-center gap-2">
                      <Settings className="h-4 w-4 text-sage" />
                      Configure One-Click Preprocessing Pipeline
                    </h2>
                    <p className="text-xxs text-stone mt-0.5">Deploy automatic strategies to handle missing values, cap outliers, correct target variable types, and remove duplicate entries.</p>
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                    {/* LHS configuration items */}
                    <div className="lg:col-span-3 space-y-6">
                      {/* Section A: Missing values treatment */}
                      <div>
                        <h3 className="text-xs font-bold text-stone uppercase tracking-wider mb-3 font-mono">
                          1 · Missing Values Replacement Strategy
                        </h3>
                        <div className="overflow-hidden border border-indigo-50 rounded-lg">
                          <table className="w-full text-xs text-left border-collapse">
                            <thead>
                              <tr className="bg-[#F7F8FC] border-b border-indigo-50 text-stone-dark font-bold font-mono text-[10px]">
                                <th className="p-3">Column variable</th>
                                <th className="p-3">Missing counts</th>
                                <th className="p-3">Fill-Imputation rule selection</th>
                              </tr>
                            </thead>
                            <tbody>
                              {profiles.map(p => (
                                <tr key={p.name} className="border-b border-indigo-50/20 hover:bg-[#F7F8FC]/40">
                                  <td className="p-3 font-mono font-medium text-slate-700">{p.name}</td>
                                  <td className={`p-3 font-mono font-semibold ${p.missingCount > 0 ? "text-rose" : "text-stone"}`}>
                                    {p.missingCount} ({p.missingPercentage.toFixed(1)}%)
                                  </td>
                                  <td className="p-3">
                                    <select
                                      disabled={p.missingCount === 0}
                                      value={cleaningConfig.missingValueAction[p.name] || "ignore"}
                                      onChange={e => {
                                        const action = e.target.value as any;
                                        setCleaningConfig(prev => ({
                                          ...prev,
                                          missingValueAction: { ...prev.missingValueAction, [p.name]: action },
                                        }));
                                      }}
                                      className={`text-xs rounded-md border border-indigo-50 px-2.5 py-1.5 focus:outline-hidden ${p.missingCount === 0 ? "bg-[#F7F8FC] text-stone-dark" : "bg-white text-slate-700"}`}
                                    >
                                      <option value="ignore">Ignore / Keep Null</option>
                                      {p.role === "numerical" ? (
                                        <>
                                          <option value="mean">Replace with Mean Average</option>
                                          <option value="median">Replace with Median</option>
                                          <option value="drop">Drop Entire Row</option>
                                        </>
                                      ) : (
                                        <>
                                          <option value="mode">Replace with Mode Category</option>
                                          <option value="drop">Drop Entire Row</option>
                                        </>
                                      )}
                                    </select>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>

                      {/* Section B: Outlier capping / trimming */}
                      <div>
                        <h3 className="text-xs font-bold text-stone uppercase tracking-wider mb-3 font-mono">
                          2 · Outlier Capping and Trimming Options (Numerical only)
                        </h3>
                        <div className="overflow-hidden border border-indigo-50 rounded-lg">
                          <table className="w-full text-xs text-left border-collapse">
                            <thead>
                              <tr className="bg-[#F7F8FC] border-b border-indigo-50 text-stone-dark font-bold font-mono text-[10px]">
                                <th className="p-3">Numeric continuous variables</th>
                                <th className="p-3">Identified outliers</th>
                                <th className="p-3">Treatment technique</th>
                              </tr>
                            </thead>
                            <tbody>
                              {profiles
                                .filter(p => p.role === "numerical")
                                .map(p => {
                                  const cStats = stats[p.name];
                                  return (
                                    <tr key={p.name} className="border-b border-indigo-50/20 hover:bg-[#F7F8FC]/40">
                                      <td className="p-3 font-mono font-medium text-slate-700">{p.name}</td>
                                      <td className={`p-3 font-mono font-semibold ${cStats?.outliersCount && cStats.outliersCount > 0 ? "text-amber font-bold" : "text-stone"}`}>
                                        {cStats?.outliersCount ?? 0} found
                                      </td>
                                      <td className="p-3">
                                        <select
                                          value={cleaningConfig.outlierAction[p.name] || "ignore"}
                                          onChange={e => {
                                            const action = e.target.value as any;
                                            setCleaningConfig(prev => ({
                                              ...prev,
                                              outlierAction: { ...prev.outlierAction, [p.name]: action },
                                            }));
                                          }}
                                          className="text-xs rounded-md border border-indigo-50 bg-white px-2.5 py-1.5 text-slate-700 focus:outline-hidden"
                                        >
                                          <option value="ignore">Ignore Outliers</option>
                                          <option value="cap">Cap Outliers to IQR boundaries</option>
                                          <option value="remove">Remove Row entries containing outliers</option>
                                        </select>
                                      </td>
                                    </tr>
                                  );
                                })}
                            </tbody>
                          </table>
                        </div>
                      </div>

                      {/* Section C: Target type casting */}
                      <div>
                        <h3 className="text-xs font-bold text-stone uppercase tracking-wider mb-3 font-mono">
                          3 · Schema & Data Type Recasting Suggestions
                        </h3>
                        <div className="overflow-hidden border border-indigo-50 rounded-lg">
                          <table className="w-full text-xs text-left border-collapse">
                            <thead>
                              <tr className="bg-[#F7F8FC] border-b border-indigo-50 text-stone-dark font-bold font-mono text-[10px]">
                                <th className="p-3">Variable column</th>
                                <th className="p-3">Detected type</th>
                                <th className="p-3">Suggested correction</th>
                                <th className="p-3">Override target mapping Type</th>
                              </tr>
                            </thead>
                            <tbody>
                              {profiles.map(p => (
                                <tr key={p.name} className="border-b border-indigo-50/20 hover:bg-[#F7F8FC]/40">
                                  <td className="p-3 font-mono font-medium text-slate-700">{p.name}</td>
                                  <td className="p-3 font-mono font-semibold text-stone-dark">{p.detectedType}</td>
                                  <td className="p-3">
                                    <span className={`text-[9px] font-bold font-mono px-2 py-0.5 rounded-full ${p.typeMatch ? "bg-stone-light text-stone" : "bg-iris-light text-iris"}`}>
                                      {p.typeMatch ? "Perfect" : `Recast to ${p.suggestedType}`}
                                    </span>
                                  </td>
                                  <td className="p-3">
                                    <select
                                      value={cleaningConfig.typeCorrections[p.name] || p.detectedType}
                                      onChange={e => {
                                        const typeVal = e.target.value as DataType;
                                        setCleaningConfig(prev => ({
                                          ...prev,
                                          typeCorrections: { ...prev.typeCorrections, [p.name]: typeVal },
                                        }));
                                      }}
                                      className="text-xs rounded-md border border-indigo-50 bg-white px-2.5 py-1.5 text-slate-700 focus:outline-hidden"
                                    >
                                      <option value="Integer">Integer Number</option>
                                      <option value="Float">Float Decimal</option>
                                      <option value="String">String Text</option>
                                      <option value="Boolean">Boolean Boolean</option>
                                      <option value="DateTime">DateTime Dates</option>
                                    </select>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    </div>

                    {/* RHS triggers sidebar */}
                    <div className="space-y-6">
                      <div className="bg-white text-slate-850 p-5 rounded-xl border border-indigo-100 space-y-4 shadow-sm sticky top-6 relative overflow-hidden">
                        <div className="absolute top-0 left-0 right-0 h-1 bg-sage"></div>
                        <Terminal className="h-5 w-5 text-sage" />
                        <h4 className="text-xs font-bold text-stone uppercase tracking-wider font-mono">Pipeline Controller</h4>

                        <div className="space-y-4 text-xs font-medium">
                          {/* Remove duplicates trigger layout */}
                          <div className="space-y-1.5">
                            <span className="font-semibold block text-slate-800">Deduplicate dataset?</span>
                            <span className="text-[10px] text-stone font-mono block">Found {duplicateCount} duplicate rows.</span>
                            <div className="grid grid-cols-2 gap-1.5 shrink-0 mt-2">
                              <button
                                onClick={() => setCleaningConfig(p => ({ ...p, removeDuplicates: true }))}
                                className={`px-2.5 py-1.5 rounded-lg font-bold transition-all text-xxs cursor-pointer border ${cleaningConfig.removeDuplicates ? "bg-sage-light text-sage border-sage/30 shadow-xxs" : "bg-white text-slate-600 border-indigo-50 hover:bg-slate-50"}`}
                              >
                                Deduplicate
                              </button>
                              <button
                                onClick={() => setCleaningConfig(p => ({ ...p, removeDuplicates: false }))}
                                className={`px-2.5 py-1.5 rounded-lg font-bold transition-all text-xxs cursor-pointer border ${!cleaningConfig.removeDuplicates ? "bg-sage border-sage text-white shadow-xxs" : "bg-white text-slate-600 border-indigo-50 hover:bg-slate-50"}`}
                              >
                                Keep Duplicates
                              </button>
                            </div>
                          </div>

                          {/* Standardise snake case */}
                          <div className="space-y-1.5 border-t border-indigo-50 pt-3">
                            <span className="font-semibold block text-slate-800">Standardize headers?</span>
                            <span className="text-[10px] text-stone font-mono block">Cast titles names to snake_case</span>
                            <div className="grid grid-cols-2 gap-1.5 shrink-0 mt-2">
                              <button
                                onClick={() => setCleaningConfig(p => ({ ...p, standardizeHeaders: true }))}
                                className={`px-2.5 py-1.5 rounded-lg font-bold transition-all text-xxs cursor-pointer border ${cleaningConfig.standardizeHeaders ? "bg-sage border-sage text-white shadow-xxs" : "bg-white text-slate-600 border-indigo-50 hover:bg-slate-50"}`}
                              >
                                snake_case
                              </button>
                              <button
                                onClick={() => setCleaningConfig(p => ({ ...p, standardizeHeaders: false }))}
                                className={`px-2.5 py-1.5 rounded-lg font-bold transition-all text-xxs cursor-pointer border ${!cleaningConfig.standardizeHeaders ? "bg-sage-light text-sage border-sage/30" : "bg-white text-slate-600 border-indigo-50 hover:bg-slate-50"}`}
                              >
                                Keep Original
                              </button>
                            </div>
                          </div>

                          <div className="border-t border-indigo-50 pt-4 space-y-2">
                            <span className="text-stone text-[9px] font-bold block uppercase tracking-wider font-mono">Preprocessing Auditing</span>
                            <button
                              onClick={executePreprocessingPipeline}
                              className="w-full bg-sage hover:bg-sage-dark text-white font-bold p-3.5 text-xs rounded-xl shadow-xs transition-all flex items-center justify-center gap-2 group cursor-pointer"
                              id="run_pipeline_trigger_btn"
                            >
                              <Play className="h-4 w-4 fill-white" />
                              <span>Run Cleaning Pipeline</span>
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Show Cleansing logs if triggered */}
                {cleaningLogs.length > 0 && (
                  <div className="bg-white p-5 rounded-xl border border-indigo-50/50 shadow-xs">
                    <h3 className="text-sm font-display font-semibold text-slate-800 uppercase tracking-wider mb-4 flex items-center gap-2">
                      <Terminal className="h-4 w-4 text-sage" />
                      Pipeline Transformation Audit Log
                    </h3>
                    <div className="border border-indigo-50 bg-[#F7F8FC] rounded-lg p-4 font-mono text-[11px] text-[#4D4C46] max-h-[300px] overflow-y-auto space-y-2.5">
                      {cleaningLogs.map((logItem, idx) => {
                        let statusColor = "text-iris";
                        if (logItem.status === "success") statusColor = "text-sage";
                        if (logItem.status === "warning") statusColor = "text-amber font-bold";

                        return (
                          <div key={idx} className="flex gap-3 leading-relaxed border-b border-indigo-50/20 pb-1.5 last:border-0 last:pb-0">
                            <span className="text-stone font-semibold shrink-0 select-none">[{logItem.timestamp}]</span>
                            <span className={`${statusColor} font-bold shrink-0`}>[{logItem.step}]</span>
                            <span>{logItem.message}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* View 2: Auto EDA Visualisations */}
            {activeTab === "visuals" && (
              <div id="visualization_tab_view">
                <VisualizationEngine
                  rows={isCleaned ? cleanedData : rawData}
                  profiles={isCleaned ? cleanedProfiles : profiles}
                  stats={isCleaned ? cleanedStats : stats}
                />
              </div>
            )}

            {/* View 3: AI Copilot Insights */}
            {activeTab === "insights" && (
              <div id="insights_tab_view" className="space-y-6">
                <div className="bg-white p-6 rounded-xl border border-indigo-50/50 shadow-xs space-y-4">
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-indigo-50 pb-4">
                    <div>
                      <h2 className="text-sm font-display font-semibold text-slate-800 uppercase tracking-wider flex items-center gap-2">
                        <Sparkles className="h-4 w-4 text-lavender" />
                        Senior Analyst AI Insight Generator
                      </h2>
                      <p className="text-xxs text-stone mt-0.5">Calculates dimensional parameters, variances, frequencies, and queries Gemini-3.5-flash for intelligent analytical insights.</p>
                    </div>

                    <button
                      onClick={fetchAIInsights}
                      disabled={isLoadingInsights}
                      className="px-4 py-2 bg-lavender hover:bg-lavender-dark text-white font-bold text-xs rounded-xl transition-all shadow-xs flex items-center gap-2 cursor-pointer disabled:opacity-50"
                      id="synthesize_ai_insights_btn"
                    >
                      <RefreshCw className={`h-3 w-3 ${isLoadingInsights ? "animate-spin" : ""}`} />
                      {isLoadingInsights ? "Synthesizing Insights..." : "Synthesize AI Report"}
                    </button>
                  </div>

                  {isLoadingInsights ? (
                    <div className="py-20 flex flex-col items-center justify-center text-center space-y-3">
                      <div className="h-8 w-8 rounded-full border-2 border-lavender border-t-transparent animate-spin"></div>
                      <span className="font-mono text-xs text-stone">Gemini deep analysis engine reading your statistical values...</span>
                    </div>
                  ) : aiInsights ? (
                    <div className="border border-indigo-50/65 bg-[#F7F8FC]/50 p-6 rounded-xl relative max-w-none shadow-xxs">
                      <div className="absolute right-4 top-4 flex gap-1.5">
                        <button
                          onClick={() => {
                            const blob = new Blob([aiInsights], { type: "text/markdown;charset=utf-8;" });
                            const url = URL.createObjectURL(blob);
                            const link = document.createElement("a");
                            link.setAttribute("href", url);
                            link.setAttribute("download", `AI_Report_${fileName.split(".")[0]}.md`);
                            document.body.appendChild(link);
                            link.click();
                            document.body.removeChild(link);
                          }}
                          className="flex items-center gap-1.5 bg-white border border-indigo-100 text-stone-dark hover:bg-slate-50 px-3 py-1.5 text-xxs font-bold rounded-lg transition-colors cursor-pointer"
                          id="export_insights_markdown_btn"
                        >
                          <Download className="h-3 w-3" />
                          Download Report
                        </button>
                      </div>

                      <div className="markdown-body prose max-w-none">
                        <Markdown content={aiInsights} />
                      </div>
                    </div>
                  ) : (
                    <div className="py-16 text-center text-stone flex flex-col items-center justify-center">
                      <HelpCircle className="h-10 w-10 text-indigo-150 mb-2" />
                      <p className="text-sm max-w-sm mx-auto leading-relaxed">
                        No insights calculated yet. Click the <strong className="text-slate-800">"Synthesize AI Report"</strong> button to have our model generate an expert dashboard report.
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* View 4: Copilot Q&A Console */}
            {activeTab === "query" && (
              <div id="query_tab_view" className="space-y-6">
                <div className="bg-white p-5 rounded-xl border border-indigo-50/50 shadow-xs flex flex-col min-h-[580px] justify-between">
                  {/* Q&A console header */}
                  <div className="border-b border-indigo-50 pb-4 mb-4">
                    <h2 className="text-sm font-display font-semibold text-slate-800 uppercase tracking-wider flex items-center gap-2">
                      <HelpCircle className="h-4 w-4 text-lavender" />
                      Interrogate Dataset in Natural Language
                    </h2>
                    <p className="text-xxs text-stone mt-0.5">Explore your data using queries like "What column generates highest value averages?" or "Summarize outliers".</p>
                  </div>

                  {/* Message stack container */}
                  <div className="flex-1 overflow-y-auto mb-4 border border-indigo-50 bg-[#F7F8FC]/35 rounded-xl p-4 min-h-[350px] max-h-[450px] space-y-4">
                    {chatHistory.length === 0 ? (
                      <div className="flex flex-col items-center justify-center text-center py-16 text-stone space-y-2.5">
                        <div className="p-3 bg-white rounded-full border border-indigo-50">
                          <Search className="h-5 w-5 text-lavender" />
                        </div>
                        <p className="text-xs font-semibold text-slate-800">Enter a normal question or click a prompt template below!</p>
                        <p className="text-xxs text-stone max-w-xs">Our search helper queries calculated frequency allocations and numerical pivot maps to generate exact feedback.</p>
                      </div>
                    ) : (
                      chatHistory.map(msg => {
                        const isUser = msg.sender === "user";
                        return (
                          <div key={msg.id} className={`flex gap-3 max-w-4xl ${isUser ? "ml-auto justify-end" : "mr-auto"}`}>
                            {!isUser && (
                              <div className="h-8 w-8 rounded-full bg-lavender-light border border-indigo-100 text-lavender flex items-center justify-center text-[10px] font-bold shrink-0 shadow-xxs">
                                AI
                              </div>
                            )}

                            <div className={`p-4 rounded-xl text-xs leading-relaxed leading-5 shadow-xxs border ${isUser ? "bg-sage text-white border-sage rounded-tr-none" : "bg-white text-slate-800 border-indigo-50/85 rounded-tl-none"}`}>
                              {!isUser ? <Markdown content={msg.text} /> : <p className="font-medium">{msg.text}</p>}
                              <span className={`block text-[9px] mt-2 text-right ${isUser ? "text-slate-100" : "text-stone"}`}>
                                {msg.timestamp}
                              </span>
                            </div>
                          </div>
                        );
                      })
                    )}
                    {isLoadingQuery && (
                      <div className="flex gap-3 max-w-3xl mr-auto">
                        <div className="h-8 w-8 rounded-full bg-lavender-light text-lavender border border-indigo-50 flex items-center justify-center text-[10px] font-bold animate-pulse shrink-0">
                          AI
                        </div>
                        <div className="bg-white p-4 rounded-xl text-xs text-stone border border-indigo-50/85 flex items-center gap-2 italic shadow-xxs">
                          <div className="h-4 w-4 rounded-full border border-lavender border-t-transparent animate-spin shrink-0"></div>
                          Processing statistics matching aggregation keys...
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Suggestion prompt quick builders */}
                  <div className="space-y-2 mb-4">
                    <span className="text-[10px] text-stone font-bold uppercase tracking-wider block font-mono">Suggested Questions matching this dataset:</span>
                    <div className="flex flex-wrap gap-2">
                      {[
                        `Give me a high-level summary overview of "${fileName.split(".")[0]}" dataset.`,
                        "Which column has the highest missing values count?",
                        "What is the average and range of numeric metrics in this table?",
                        "Identify the top categories and counts inside categories.",
                      ].map((item, idx) => (
                        <button
                          key={idx}
                          onClick={() => {
                            setChatInput(item);
                          }}
                          className="bg-stone-light/40 hover:bg-lavender-light/35 border border-indigo-50 hover:border-lavender px-3 py-1.5 rounded-lg text-left text-xs text-slate-700 hover:text-lavender transition-all cursor-pointer"
                        >
                          {item}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Submit console input form */}
                  <form onSubmit={handleCopilotQuery} className="flex gap-3">
                    <input
                      type="text"
                      placeholder="Ask any analytical statement (e.g. List out outlier satisfaction ids, summarize average sales)..."
                      value={chatInput}
                      onChange={e => setChatInput(e.target.value)}
                      className="flex-1 text-xs rounded-xl border border-indigo-50 bg-[#F7F8FC]/50 px-4 py-3 text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-lavender/10 focus:border-lavender"
                      id="query_console_input"
                    />
                    <button
                      type="submit"
                      disabled={isLoadingQuery || !chatInput.trim()}
                      className="px-6 py-3 bg-lavender hover:bg-lavender-dark text-white font-bold text-xs rounded-xl shadow-xs transition-colors disabled:opacity-50 cursor-pointer"
                      id="submit_query_btn"
                    >
                      Ask Copilot
                    </button>
                  </form>
                </div>
              </div>
            )}

            {/* View 5: Export center (Module 10 Downloads) */}
            {activeTab === "export" && (
              <div id="export_tab_view" className="space-y-6">
                <div className="bg-white p-5 rounded-xl border border-indigo-50/50 shadow-xs">
                  <div className="border-b border-indigo-50 pb-3 mb-6">
                    <h2 className="text-sm font-display font-semibold text-slate-800 uppercase tracking-wider flex items-center gap-2">
                      <Download className="h-4 w-4 text-sage" />
                      Dynamic Workspace Download Center
                    </h2>
                    <p className="text-xxs text-stone mt-0.5">Save all preprocessed spreadsheet datasets, structured visual summaries, and computed analytics directly to your machine.</p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {/* Item A: Dataset download */}
                    <div className="p-5 rounded-xl border border-indigo-50/70 bg-[#F7F8FC]/40 shadow-xxs hover:shadow-xs transition-all flex flex-col justify-between">
                      <div className="space-y-3">
                        <div className="p-3 bg-sage-light inline-block rounded-xl">
                          <FileSpreadsheet className="h-6 w-6 text-sage" />
                        </div>
                        <h3 className="text-sm font-bold text-slate-800 font-display">Cleaned Dataset CSV</h3>
                        <p className="text-xxs text-stone leading-relaxed leading-5">
                          Download the complete dataset as a standardized CSV file with all missing values resolved, duplicates purged, headers aligned, and datatypes fixed.
                        </p>
                      </div>

                      <button
                        onClick={downloadCleanedDataset}
                        className="w-full mt-6 bg-sage hover:bg-sage-dark text-white p-3 text-xs font-bold rounded-xl text-center shadow-xs transition-all flex items-center justify-center gap-2 cursor-pointer"
                        id="download_cleaned_csv_btn"
                      >
                        <Download className="h-4 w-4" />
                        <span>cleaned_data.csv</span>
                      </button>
                    </div>

                    {/* Item B: Detailed HTML report */}
                    <div className="p-5 rounded-xl border border-indigo-50/70 bg-[#F7F8FC]/40 shadow-xxs hover:shadow-xs transition-all flex flex-col justify-between">
                      <div className="space-y-3">
                        <div className="p-3 bg-iris-light inline-block rounded-xl">
                          <CheckCircle2 className="h-6 w-6 text-iris" />
                        </div>
                        <h3 className="text-sm font-bold text-slate-800 font-display">Exploratory EDA Report</h3>
                        <p className="text-xxs text-stone leading-relaxed leading-5">
                          Compile an interactive printable summary report detailing dimension variables, metrics, missing matrices, duplicate sets, and value frequency distributions.
                        </p>
                        {logoUrl && (
                          <div className="flex items-center gap-1.5 text-xxs text-sage font-semibold font-mono bg-sage/10 border border-sage/20 px-2.5 py-1 rounded-lg w-fit mt-1">
                            <span className="h-1.5 w-1.5 rounded-full bg-sage inline-block"></span>
                            Brand Logo Included in PDF
                          </div>
                        )}
                      </div>

                      <button
                        onClick={downloadEDAReport}
                        className="w-full mt-6 bg-stone-dark hover:bg-slate-800 text-white p-3 text-xs font-bold rounded-xl text-center shadow-xs transition-all flex items-center justify-center gap-2 cursor-pointer"
                        id="download_eda_html_btn"
                      >
                        <Download className="h-4 w-4 text-white" />
                        <span>report_summary.html</span>
                      </button>
                    </div>

                    {/* Item C: Zip package container */}
                    <div className="p-5 rounded-xl border border-indigo-50/70 bg-[#F7F8FC]/40 shadow-xxs hover:shadow-xs transition-all flex flex-col justify-between">
                      <div className="space-y-3">
                        <div className="p-3 bg-stone-light inline-block rounded-xl">
                          <Terminal className="h-6 w-6 text-stone-dark" />
                        </div>
                        <h3 className="text-sm font-bold text-slate-800 font-display">Workspace Package (ZIP)</h3>
                        <p className="text-xxs text-stone leading-relaxed leading-5">
                          Bundle all dataset statistics, variable profiles, logs, and preprocessed dimensions into a single structured ZIP file for offline local spreadsheets deployment.
                        </p>
                      </div>

                      <button
                        onClick={compileInsightsZip}
                        className="w-full mt-6 bg-[#F7F8FC] border border-indigo-100 text-slate-800 hover:bg-indigo-50 p-3 text-xs font-bold rounded-xl text-center shadow-xs transition-all flex items-center justify-center gap-2 cursor-pointer"
                        id="download_zip_archive_btn"
                      >
                        <Download className="h-4 w-4 text-stone-dark" />
                        <span>workspace_manifest.zip</span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </main>
        </div>
      )}

      {/* Administrative Profile Modal */}
      {isAdminModalOpen && (
        <div 
          className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4"
          onClick={() => setIsAdminModalOpen(false)}
        >
          <div 
            className="bg-white rounded-3xl max-w-2xl w-full border border-indigo-100 shadow-2xl overflow-hidden flex flex-col md:flex-row relative animate-scale-up"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Direct Close Button */}
            <button
              onClick={() => setIsAdminModalOpen(false)}
              className="absolute top-4 right-4 bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-800 p-2 rounded-full transition-all duration-200 z-10 cursor-pointer flex items-center justify-center"
              title="Close modal"
            >
              <Trash2 className="h-4 w-4 rotate-45 transform origin-center text-slate-500 hover:text-rose" />
            </button>

            {/* Left Box: Avatar Photo Display */}
            <div className="md:w-[40%] bg-[#F7F8FC] p-6 flex flex-col items-center justify-center border-b md:border-b-0 md:border-r border-indigo-50/70">
              <div className="relative mb-4">
                {adminAvatarUrl ? (
                  <div className="p-1.5 bg-white rounded-2xl border border-slate-200 shadow-sm">
                    <img 
                      src={adminAvatarUrl} 
                      className="h-40 w-40 rounded-xl object-cover" 
                      alt="K. Kishore" 
                      referrerPolicy="no-referrer"
                    />
                  </div>
                ) : (
                  <div className="p-1.5 bg-white rounded-2xl border border-slate-200 shadow-sm">
                    <KishoreAvatarSVG className="h-40 w-40 rounded-xl" />
                  </div>
                )}
              </div>

              <div className="mt-3 text-center">
                <span className="text-[9px] font-bold tracking-wider uppercase text-stone block font-mono">Administrative Badge</span>
                <div className="flex items-center gap-1.5 justify-center mt-1 text-indigo-900">
                  <Award className="h-4 w-4 text-amber animate-pulse" />
                  <span className="text-[11px] font-black font-sans tracking-wide uppercase">Verified Developer</span>
                </div>
              </div>
            </div>

            {/* Right Box: Full Details & Portfolios */}
            <div className="md:w-[60%] p-6 flex flex-col justify-between text-left space-y-5">
              <div className="space-y-4">
                {/* Developer Name */}
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-xl font-display font-black tracking-tight text-indigo-950">K. Kishore</h3>
                    <span className="bg-indigo-50 text-indigo-700 border border-indigo-100 text-[9.5px] uppercase tracking-wider font-extrabold px-2.5 py-0.5 rounded-full inline-block">
                      Lead Creator
                    </span>
                  </div>
                  <p className="text-xs text-stone mt-1 font-medium">Developer & Lead Administrator</p>
                </div>

                {/* Contacts & Coordinate Links */}
                <div className="bg-slate-50/80 p-3.5 rounded-xl border border-slate-100/80 space-y-2.5 shadow-xxs">
                  <span className="text-[9px] text-stone font-bold uppercase tracking-wider font-mono block">Contact & Coordinates</span>
                  <div className="grid grid-cols-1 gap-2 text-[11.5px] text-slate-600 font-medium">
                    <a 
                      href="mailto:kishorekumar04072004@gmail.com" 
                      className="flex items-center gap-2.5 hover:text-indigo-600 transition-colors"
                    >
                      <Mail className="h-4 w-4 text-slate-400 shrink-0" />
                      <span className="truncate font-mono">kishorekumar04072004@gmail.com</span>
                    </a>
                    <a 
                      href="https://www.linkedin.com/in/kishore-k-5b7666268" 
                      target="_blank" 
                      rel="noopener noreferrer" 
                      className="flex items-center gap-2.5 text-[#0a66c2] hover:underline"
                    >
                      <Linkedin className="h-4 w-4 text-[#0a66c2] shrink-0" />
                      <span className="truncate">linkedin.com/in/kishore-k-5b7666268</span>
                      <ExternalLink className="h-3 w-3 inline opacity-70 shrink-0" />
                    </a>
                    <a 
                      href="https://share.google/i6PrXqpyUK8WwmqM8" 
                      target="_blank" 
                      rel="noopener noreferrer" 
                      className="flex items-center gap-2.5 text-sage hover:underline"
                    >
                      <Globe className="h-4 w-4 text-sage shrink-0" />
                      <span className="truncate">Personal Portfolio Web</span>
                      <ExternalLink className="h-3 w-3 inline opacity-70 shrink-0" />
                    </a>
                  </div>
                </div>

                {/* Portfolios & Relevant Works */}
                <div className="space-y-2">
                  <span className="text-[9px] text-stone font-bold uppercase tracking-wider font-mono block">Relevant Works</span>
                  <div className="space-y-2 overflow-y-auto max-h-[140px] pr-1">
                    <a 
                      href="https://kode4-kishore-compiler.vercel.app/" 
                      target="_blank" 
                      rel="noopener noreferrer" 
                      className="block group bg-white hover:bg-indigo-50/20 p-2.5 rounded-xl border border-indigo-50/80 hover:border-indigo-200 transition-all shadow-xxs"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Code className="h-3.5 w-3.5 text-indigo-500" />
                          <span className="text-xs font-bold text-slate-800 group-hover:text-indigo-600 transition-colors">AI Powered Online Compiler</span>
                        </div>
                        <ExternalLink className="h-3 w-3 text-stone group-hover:text-indigo-500 transition-colors" />
                      </div>
                      <p className="text-[10px] text-stone mt-1.5 font-medium leading-normal">
                        Robust interactive sandboxed multi-language browser compiler environment.
                      </p>
                    </a>

                    <a 
                      href="https://ai-prompt-generator-07.vercel.app/" 
                      target="_blank" 
                      rel="noopener noreferrer" 
                      className="block group bg-white hover:bg-indigo-50/20 p-2.5 rounded-xl border border-indigo-50/80 hover:border-indigo-200 transition-all shadow-xxs"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Sparkles className="h-3.5 w-3.5 text-indigo-500" />
                          <span className="text-xs font-bold text-slate-800 group-hover:text-indigo-600 transition-colors">AI Powered Prompt Generator</span>
                        </div>
                        <ExternalLink className="h-3 w-3 text-stone group-hover:text-indigo-500 transition-colors" />
                      </div>
                      <p className="text-[10px] text-stone mt-1.5 font-medium leading-normal">
                        Intuitive system prompt builder with auto-formatting capability.
                      </p>
                    </a>
                  </div>
                </div>
              </div>

              {/* Close Button at bottom */}
              <button
                type="button"
                onClick={() => setIsAdminModalOpen(false)}
                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs py-2.5 rounded-xl transition-all shadow-xs cursor-pointer text-center mt-2 hover:scale-[1.01]"
              >
                Return to Dashboard
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
