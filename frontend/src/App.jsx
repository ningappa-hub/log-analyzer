import { useState, useEffect, useCallback } from 'react';
import { 
  Upload, 
  Search, 
  Trash2, 
  RefreshCw, 
  AlertCircle, 
  AlertTriangle, 
  Info, 
  Terminal, 
  ChevronDown, 
  ChevronRight,
  Database,
  FileText,
  CheckCircle2,
  XCircle,
  Sparkles
} from 'lucide-react';

const API_BASE_URL = 'http://localhost:8000/api';

function App() {
  const [logs, setLogs] = useState([]);
  const [total, setTotal] = useState(0);
  const [levelFilter, setLevelFilter] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [limit, setLimit] = useState(100);
  const [offset, setOffset] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState(null); // { success: boolean, message: string }
  const [expandedLogId, setExpandedLogId] = useState(null);
  const [aiAnalysis, setAiAnalysis] = useState({});

  // Statistics
  const [stats, setStats] = useState({
    total: 0,
    info: 0,
    warn: 0,
    error: 0,
    debug: 0
  });

  const fetchLogs = useCallback(async () => {
    setIsLoading(true);
    try {
      const queryParams = new URLSearchParams();
      if (levelFilter) queryParams.append('level', levelFilter);
      if (searchTerm) queryParams.append('search', searchTerm);
      queryParams.append('limit', limit.toString());
      queryParams.append('offset', offset.toString());

      const res = await fetch(`${API_BASE_URL}/logs?${queryParams.toString()}`);
      if (!res.ok) throw new Error('Failed to fetch logs');
      const data = await res.json();
      setLogs(data.logs);
      setTotal(data.total);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  }, [levelFilter, searchTerm, limit, offset]);

  // Fetch stats separately to keep overview counts updated
  const fetchStats = useCallback(async () => {
    try {
      // We will perform fast queries for each level to build counts
      const getCount = async (level = '') => {
        const queryParams = new URLSearchParams();
        if (level) queryParams.append('level', level);
        queryParams.append('limit', '1');
        const res = await fetch(`${API_BASE_URL}/logs?${queryParams.toString()}`);
        if (!res.ok) return 0;
        const data = await res.json();
        return data.total;
      };

      const [totalCount, infoCount, warnCount, errorCount, debugCount] = await Promise.all([
        getCount(),
        getCount('INFO'),
        getCount('WARN'),
        getCount('ERROR'),
        getCount('DEBUG')
      ]);

      setStats({
        total: totalCount,
        info: infoCount,
        warn: warnCount,
        error: errorCount,
        debug: debugCount
      });
    } catch (err) {
      console.error('Error fetching statistics:', err);
    }
  }, []);

  useEffect(() => {
    fetchLogs();
    fetchStats();
  }, [fetchLogs, fetchStats]);

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setIsUploading(true);
    setUploadStatus(null);
    
    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await fetch(`${API_BASE_URL}/upload`, {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.detail || 'Upload failed');
      }

      setUploadStatus({
        success: true,
        message: `Successfully uploaded ${file.name}. Parsed ${data.count} log entries.`
      });
      fetchLogs();
      fetchStats();
    } catch (err) {
      setUploadStatus({
        success: false,
        message: err.message || 'Error uploading file'
      });
    } finally {
      setIsUploading(false);
      // Clear file input
      e.target.value = '';
    }
  };

  const handleClearLogs = async () => {
    if (!confirm('Are you sure you want to delete all log entries from the database?')) {
      return;
    }

    try {
      const res = await fetch(`${API_BASE_URL}/logs`, {
        method: 'DELETE'
      });
      if (res.ok) {
        setUploadStatus({
          success: true,
          message: 'All logs successfully cleared from database.'
        });
        fetchLogs();
        fetchStats();
      }
    } catch (err) {
      console.error('Failed to clear logs:', err);
    }
  };

  const toggleExpandLog = (id) => {
    if (expandedLogId === id) {
      setExpandedLogId(null);
    } else {
      setExpandedLogId(id);
    }
  };

  const handleAnalyzeError = async (logId) => {
    if (aiAnalysis[logId]?.data) {
      setExpandedLogId(logId);
      return;
    }

    setAiAnalysis((prev) => ({
      ...prev,
      [logId]: { loading: true, data: null, error: null }
    }));
    
    setExpandedLogId(logId);

    try {
      const res = await fetch(`${API_BASE_URL}/analyze-error/${logId}`, {
        method: 'POST'
      });
      
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.detail || 'Failed to analyze error');
      }
      
      setAiAnalysis((prev) => ({
        ...prev,
        [logId]: { loading: false, data: data, error: null }
      }));
    } catch (err) {
      setAiAnalysis((prev) => ({
        ...prev,
        [logId]: { loading: false, data: null, error: err.message || 'Error occurred' }
      }));
    }
  };

  const getLevelBadge = (level) => {
    switch (level) {
      case 'ERROR':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold bg-red-950 text-red-400 border border-red-900/50">
            <AlertCircle className="w-3.5 h-3.5" /> ERROR
          </span>
        );
      case 'WARN':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold bg-amber-950 text-amber-400 border border-amber-900/50">
            <AlertTriangle className="w-3.5 h-3.5" /> WARN
          </span>
        );
      case 'INFO':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold bg-blue-950 text-blue-400 border border-blue-900/50">
            <Info className="w-3.5 h-3.5" /> INFO
          </span>
        );
      case 'DEBUG':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold bg-zinc-800 text-zinc-400 border border-zinc-700/50">
            <Terminal className="w-3.5 h-3.5" /> DEBUG
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold bg-zinc-950 text-zinc-300 border border-zinc-800">
            {level}
          </span>
        );
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans selection:bg-purple-900/50">
      {/* Top Banner Header */}
      <header className="border-b border-slate-900 bg-slate-950/80 backdrop-blur-md sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-gradient-to-tr from-purple-600 to-indigo-600 rounded-xl shadow-lg shadow-indigo-500/25">
              <Terminal className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight bg-gradient-to-r from-white via-slate-200 to-slate-400 bg-clip-text text-transparent">
                Log Analyzer
              </h1>
              <p className="text-xs text-slate-500 font-medium">FastAPI + React Dashboard</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => { fetchLogs(); fetchStats(); }}
              className="p-2 hover:bg-slate-900 rounded-lg text-slate-400 hover:text-white transition-colors"
              title="Refresh Logs"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            </button>
            <button
              onClick={handleClearLogs}
              className="flex items-center gap-2 px-3.5 py-2 text-sm font-semibold bg-red-950/40 border border-red-900/30 text-red-400 hover:bg-red-950/70 hover:border-red-900/60 rounded-xl transition-all"
            >
              <Trash2 className="w-4 h-4" /> Clear All
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        
        {/* Stats Grid */}
        <section className="grid grid-cols-2 md:grid-cols-5 gap-4">
          {[
            { label: 'Total Logs', count: stats.total, color: 'border-slate-800 bg-slate-900/40 text-slate-100', icon: Database },
            { label: 'Error Logs', count: stats.error, color: 'border-red-950/50 bg-red-950/10 text-red-400', icon: AlertCircle },
            { label: 'Warning Logs', count: stats.warn, color: 'border-amber-950/50 bg-amber-950/10 text-amber-400', icon: AlertTriangle },
            { label: 'Info Logs', count: stats.info, color: 'border-blue-950/50 bg-blue-950/10 text-blue-400', icon: Info },
            { label: 'Debug Logs', count: stats.debug, color: 'border-zinc-800/50 bg-zinc-900/20 text-zinc-400', icon: Terminal },
          ].map((item, idx) => (
            <div key={idx} className={`p-4 border rounded-2xl flex items-center justify-between ${item.color}`}>
              <div className="space-y-1">
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">{item.label}</span>
                <p className="text-2xl font-bold font-mono">{item.count.toLocaleString()}</p>
              </div>
              <item.icon className="w-8 h-8 opacity-25" />
            </div>
          ))}
        </section>

        {/* Upload Log file widget */}
        <section className="bg-slate-900/30 border border-slate-900 rounded-2xl p-6">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="space-y-1.5 text-center md:text-left">
              <h2 className="text-lg font-bold text-slate-100 flex items-center justify-center md:justify-start gap-2">
                <FileText className="w-5 h-5 text-indigo-400" /> Log Ingestion
              </h2>
              <p className="text-sm text-slate-400">
                Upload a `.log` or `.txt` log file to parse, index, and database the log entries.
              </p>
            </div>
            
            <div className="w-full md:w-auto">
              <label className="flex flex-col items-center justify-center px-6 py-4 bg-slate-950 border border-dashed border-slate-800 hover:border-slate-700 hover:bg-slate-900/50 rounded-xl cursor-pointer group transition-all">
                <div className="flex items-center gap-3">
                  {isUploading ? (
                    <RefreshCw className="w-5 h-5 text-indigo-400 animate-spin" />
                  ) : (
                    <Upload className="w-5 h-5 text-slate-400 group-hover:text-indigo-400 transition-colors" />
                  )}
                  <span className="text-sm font-semibold text-slate-300 group-hover:text-white transition-colors">
                    {isUploading ? 'Parsing log file...' : 'Choose Log File'}
                  </span>
                </div>
                <input 
                  type="file" 
                  className="hidden" 
                  accept=".log,.txt" 
                  onChange={handleFileUpload} 
                  disabled={isUploading}
                />
              </label>
            </div>
          </div>

          {/* Upload Status message banner */}
          {uploadStatus && (
            <div className={`mt-4 p-4 rounded-xl flex items-start gap-3 border ${
              uploadStatus.success 
                ? 'bg-emerald-950/20 border-emerald-950 text-emerald-400' 
                : 'bg-red-950/20 border-red-950 text-red-400'
            }`}>
              {uploadStatus.success ? (
                <CheckCircle2 className="w-5 h-5 flex-shrink-0 mt-0.5" />
              ) : (
                <XCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
              )}
              <span className="text-sm font-medium">{uploadStatus.message}</span>
            </div>
          )}
        </section>

        {/* Filter controls and Logs Viewer Table */}
        <section className="bg-slate-900/30 border border-slate-900 rounded-2xl overflow-hidden">
          {/* Query controller header bar */}
          <div className="p-4 border-b border-slate-900 bg-slate-900/10 flex flex-col md:flex-row gap-4 items-center justify-between">
            {/* Search inputs */}
            <div className="relative w-full md:w-80">
              <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
                <Search className="w-4 h-4" />
              </span>
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search log messages..."
                className="block w-full pl-10 pr-4 py-2 text-sm bg-slate-950 border border-slate-800 focus:border-purple-500/50 rounded-xl focus:ring-1 focus:ring-purple-500/50 outline-none text-slate-100 placeholder-slate-500 transition-all"
              />
            </div>

            {/* Filter selectors */}
            <div className="flex flex-wrap w-full md:w-auto items-center gap-3">
              <select
                value={levelFilter}
                onChange={(e) => setLevelFilter(e.target.value)}
                className="px-3.5 py-2 text-sm bg-slate-950 border border-slate-800 rounded-xl outline-none text-slate-300 focus:border-purple-500/50 transition-all cursor-pointer"
              >
                <option value="">All Log Levels</option>
                <option value="INFO">INFO</option>
                <option value="WARN">WARN</option>
                <option value="ERROR">ERROR</option>
                <option value="DEBUG">DEBUG</option>
              </select>

              <select
                value={limit}
                onChange={(e) => setLimit(Number(e.target.value))}
                className="px-3.5 py-2 text-sm bg-slate-950 border border-slate-800 rounded-xl outline-none text-slate-300 focus:border-purple-500/50 transition-all cursor-pointer"
              >
                <option value="50">Show 50</option>
                <option value="100">Show 100</option>
                <option value="250">Show 250</option>
                <option value="500">Show 500</option>
              </select>

              <span className="text-xs text-slate-500 font-semibold px-2 font-mono">
                Found {total.toLocaleString()}
              </span>
            </div>
          </div>

          {/* Logs viewer */}
          <div className="overflow-x-auto">
            {isLoading ? (
              <div className="py-24 flex flex-col items-center justify-center gap-3 text-slate-400">
                <RefreshCw className="w-8 h-8 animate-spin text-purple-500" />
                <span className="text-sm font-semibold tracking-wider uppercase">Loading database...</span>
              </div>
            ) : logs.length === 0 ? (
              <div className="py-24 text-center space-y-3">
                <div className="w-12 h-12 rounded-full bg-slate-950 flex items-center justify-center mx-auto border border-slate-800">
                  <Database className="w-6 h-6 text-slate-600" />
                </div>
                <div className="space-y-1">
                  <p className="text-sm font-bold text-slate-300">No log records found</p>
                  <p className="text-xs text-slate-500 max-w-sm mx-auto">
                    Try clearing filters, searching for something else, or uploading a log file.
                  </p>
                </div>
              </div>
            ) : (
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-900 bg-slate-950/20 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    <th className="w-8 py-3 pl-4"></th>
                    <th className="w-44 py-3 px-4">Timestamp</th>
                    <th className="w-28 py-3 px-4">Level</th>
                    <th className="py-3 px-4">Message</th>
                    <th className="w-44 py-3 px-4 text-right pr-6">AI Analysis</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-900/50 font-mono text-xs">
                  {logs.map((log) => {
                    const isExpanded = expandedLogId === log.id;
                    const hasMultiline = log.message.includes('\n');
                    const isExpandable = hasMultiline || log.level === 'ERROR';
                    
                    return (
                      <tr 
                        key={log.id} 
                        onClick={() => isExpandable && toggleExpandLog(log.id)}
                        className={`hover:bg-slate-900/20 group transition-colors ${
                          isExpandable ? 'cursor-pointer' : ''
                        } ${isExpanded ? 'bg-slate-900/40' : ''}`}
                      >
                        <td className="py-3 pl-4 text-center">
                          {isExpandable ? (
                            isExpanded ? (
                              <ChevronDown className="w-4 h-4 text-slate-500 group-hover:text-slate-300" />
                            ) : (
                              <ChevronRight className="w-4 h-4 text-slate-500 group-hover:text-slate-300" />
                            )
                          ) : null}
                        </td>
                        
                        {/* Timestamp columns */}
                        <td className="py-3 px-4 text-slate-400 whitespace-nowrap">
                          {log.timestamp ? (
                            <span>{new Date(log.timestamp).toLocaleString()}</span>
                          ) : (
                            <span className="text-slate-600 italic">{log.timestamp_raw || 'N/A'}</span>
                          )}
                        </td>
                        
                        {/* Level columns */}
                        <td className="py-3 px-4 select-none">
                          {getLevelBadge(log.level)}
                        </td>
                        
                        {/* Message column */}
                        <td className="py-3 px-4 text-slate-300 break-words pr-8">
                          {isExpanded ? (
                            <div className="space-y-3 mt-1">
                              <div className="space-y-1">
                                <p className="font-semibold text-slate-200">
                                  {log.message.split('\n')[0]}
                                </p>
                                {hasMultiline && (
                                  <pre className="p-3 bg-slate-950 border border-slate-900 rounded-lg text-slate-400 overflow-x-auto text-[11px] leading-relaxed whitespace-pre-wrap">
                                    {log.message}
                                  </pre>
                                )}
                              </div>
                              
                              {/* AI Analysis alert/output box */}
                              {aiAnalysis[log.id] && (
                                <div className="space-y-2 pt-3 border-t border-slate-900">
                                  <p className="font-semibold text-purple-400 text-[10px] uppercase tracking-wider flex items-center gap-1.5">
                                    <Sparkles className="w-3.5 h-3.5 text-purple-400" /> AI Support Diagnosis
                                  </p>
                                  
                                  {aiAnalysis[log.id].loading && (
                                    <div className="p-3.5 bg-purple-950/15 border border-purple-900/30 rounded-xl flex items-center gap-3 text-purple-400">
                                      <RefreshCw className="w-4 h-4 animate-spin flex-shrink-0" />
                                      <span className="text-xs font-semibold animate-pulse">Analyzing logs & formulating response...</span>
                                    </div>
                                  )}
                                  
                                  {aiAnalysis[log.id].error && (
                                    <div className="p-3.5 bg-red-950/20 border border-red-900/30 rounded-xl flex items-start gap-2.5 text-red-400">
                                      <XCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                                      <div className="space-y-0.5">
                                        <p className="text-xs font-bold">Analysis Failed</p>
                                        <p className="text-[11px] text-red-300/80">{aiAnalysis[log.id].error}</p>
                                      </div>
                                    </div>
                                  )}
                                  
                                  {aiAnalysis[log.id].data && (
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                      <div className="p-4 bg-slate-950 border border-slate-900 rounded-xl space-y-1.5">
                                        <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider flex items-center gap-1">
                                          <AlertCircle className="w-3.5 h-3.5 text-slate-400" /> Root Cause Hypothesis
                                        </span>
                                        <p className="text-xs text-slate-300 leading-relaxed font-sans font-medium whitespace-pre-wrap break-normal">
                                          {aiAnalysis[log.id].data.root_cause}
                                        </p>
                                      </div>
                                      
                                      <div className="p-4 bg-indigo-950/10 border border-indigo-900/20 rounded-xl space-y-1.5">
                                        <span className="text-[10px] font-semibold text-indigo-400 uppercase tracking-wider flex items-center gap-1">
                                          <CheckCircle2 className="w-3.5 h-3.5 text-indigo-400" /> Suggested Fix
                                        </span>
                                        <p className="text-xs text-indigo-200 leading-relaxed font-sans font-medium whitespace-pre-wrap break-normal">
                                          {aiAnalysis[log.id].data.suggested_fix}
                                        </p>
                                      </div>
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                          ) : (
                            <div className="flex items-center gap-1.5">
                              <span className="truncate max-w-2xl block text-slate-300">
                                {log.message.split('\n')[0]}
                              </span>
                              {hasMultiline && (
                                <span className="inline-block px-1.5 py-0.5 rounded bg-slate-800 text-[10px] text-slate-500 uppercase tracking-tight font-semibold scale-90">
                                  +{log.message.split('\n').length - 1} lines
                                </span>
                              )}
                            </div>
                          )}
                        </td>
                        
                        {/* Action column */}
                        <td className="py-3 px-4 text-right pr-6">
                          {log.level === 'ERROR' && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleAnalyzeError(log.id);
                              }}
                              disabled={aiAnalysis[log.id]?.loading}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-purple-950/40 hover:bg-purple-900/60 border border-purple-800/30 hover:border-purple-600/50 text-purple-300 disabled:opacity-50 rounded-lg cursor-pointer transition-all active:scale-95"
                            >
                              {aiAnalysis[log.id]?.loading ? (
                                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                              ) : (
                                <Sparkles className="w-3.5 h-3.5 text-purple-400 group-hover:text-purple-300" />
                              )}
                              {aiAnalysis[log.id]?.loading ? 'Analyzing...' : 'Analyze with AI'}
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </section>
      </main>
    </div>
  );
}

export default App;
