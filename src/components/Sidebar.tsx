import React, { useState, useMemo } from 'react';
import { 
  MessageSquare, Plus, Trash2, Database, BookOpen, 
  Sun, Moon, ChevronDown, ChevronRight, SlidersHorizontal, 
  Search, ExternalLink, RefreshCw
} from 'lucide-react';
import { ChatSession, FAQItem } from '../types';
import { preprocessText } from '../lib/nlp';

interface SidebarProps {
  sessions: ChatSession[];
  currentSessionId: string | null;
  faqs: FAQItem[];
  vocabSize: number;
  matchThreshold: number;
  darkMode: boolean;
  onSelectSession: (id: string) => void;
  onNewSession: () => void;
  onDeleteSession: (id: string) => void;
  onClearAllSessions: () => void;
  onSetThreshold: (val: number) => void;
  onToggleDarkMode: () => void;
  onSelectQuestionText: (question: string, autoSubmit?: boolean) => void;
}

export default function Sidebar({
  sessions,
  currentSessionId,
  faqs,
  vocabSize,
  matchThreshold,
  darkMode,
  onSelectSession,
  onNewSession,
  onDeleteSession,
  onClearAllSessions,
  onSetThreshold,
  onToggleDarkMode,
  onSelectQuestionText
}: SidebarProps) {
  const [dbSearchQuery, setDbSearchQuery] = useState('');
  const [isFaqExpanderOpen, setIsFaqExpanderOpen] = useState(true);
  const [isConfigOpen, setIsConfigOpen] = useState(true);
  const [activeFaqCategory, setActiveFaqCategory] = useState<string | null>(null);

  // Group FAQs by Category
  const groupedFaqs = useMemo(() => {
    const data: { [category: string]: FAQItem[] } = {};
    faqs.forEach(faq => {
      const matchSearch = 
        faq.question.toLowerCase().includes(dbSearchQuery.toLowerCase()) ||
        faq.answer.toLowerCase().includes(dbSearchQuery.toLowerCase()) ||
        faq.category.toLowerCase().includes(dbSearchQuery.toLowerCase());

      if (dbSearchQuery === '' || matchSearch) {
        if (!data[faq.category]) {
          data[faq.category] = [];
        }
        data[faq.category].push(faq);
      }
    });
    return data;
  }, [faqs, dbSearchQuery]);

  const categories = Object.keys(groupedFaqs);

  return (
    <aside id="app-sidebar" className="w-80 border-r shrink-0 flex flex-col h-full bg-[#0f172a] text-slate-300 border-slate-800 transition-colors duration-200">
      
      {/* Sidebar Header */}
      <div className="p-4 border-b border-slate-800 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="h-9 w-9 rounded-xl bg-blue-600 flex items-center justify-center shadow-md shadow-blue-600/10">
            <Database className="h-5 w-5 text-white animate-pulse-subtle" />
          </div>
          <div>
            <h1 className="font-display font-bold text-white text-[15px] leading-tight">FAQ NLP Analyzer</h1>
            <span className="text-[11px] font-medium font-mono text-blue-450 text-blue-400">TF-IDF MATCH ENGINE</span>
          </div>
        </div>
        <button 
          id="btn-sidebar-mode-toggle"
          onClick={onToggleDarkMode}
          className="p-2 rounded-lg hover:bg-[#1e293b] text-slate-400 hover:text-white transition-colors cursor-pointer"
          title={darkMode ? "Switch to light mode" : "Switch to dark mode"}
        >
          {darkMode ? <Sun className="h-4.5 w-4.5 text-amber-500" /> : <Moon className="h-4.5 w-4.5 text-slate-300" />}
        </button>
      </div>

      {/* New Chat Button */}
      <div className="p-3">
        <button 
          id="btn-sidebar-new-session"
          onClick={onNewSession}
          className="w-full py-2.5 px-4 bg-[#334155] hover:bg-[#475569] text-white rounded-lg border border-slate-600 transition-colors text-sm font-medium shadow-sm flex items-center justify-center gap-2 cursor-pointer group"
        >
          <Plus className="h-4 w-4 group-hover:rotate-90 transition-transform duration-200 text-white" />
          New Conversation
        </button>
      </div>

      {/* Content Area - Scrollable */}
      <div className="flex-1 overflow-y-auto px-3 pb-4 space-y-4">
        
        {/* Chat History Section */}
        <div>
          <h2 className="text-xs font-bold text-slate-500 uppercase tracking-widest px-2 mb-3">Recent Sessions</h2>
          <div className="space-y-1.5">
            {sessions.map(sess => {
              const isActive = currentSessionId === sess.id;
              return (
                <div 
                  key={sess.id}
                  id={`history-${sess.id}`}
                  className={`group relative flex items-center rounded-lg transition-all duration-150 ${
                    isActive 
                      ? 'bg-[#1e293b] text-white border-l-4 border-blue-500' 
                      : 'hover:bg-[#1e293b]/50 text-slate-300 hover:text-white'
                  }`}
                >
                  <button
                    onClick={() => onSelectSession(sess.id)}
                    className="flex-1 py-3 px-3 text-left text-sm font-medium pr-10 truncate cursor-pointer"
                  >
                    <div className="flex items-center gap-2 truncate">
                      <MessageSquare className={`h-4.5 w-4.5 shrink-0 ${isActive ? 'text-blue-450 text-blue-400' : 'text-slate-450 text-slate-500'}`} />
                      <span className="truncate">{sess.title}</span>
                    </div>
                  </button>
                  <button
                    id={`btn-delete-session-${sess.id}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      onDeleteSession(sess.id);
                    }}
                    className="absolute right-2 p-1.5 rounded-md text-slate-400 hover:text-rose-400 hover:bg-rose-950/20 opacity-0 group-hover:opacity-100 transition-opacity duration-150 cursor-pointer"
                    title="Delete Chat Session"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              );
            })}
            {sessions.length === 0 && (
              <p className="text-xs text-slate-500 italic text-center py-2 px-2">No past history recorded.</p>
            )}
          </div>
        </div>

        {/* NLP Model Configurations Accordion */}
        <div className="border border-slate-800 rounded-lg overflow-hidden bg-[#1e293b]/30 shadow-sm">
          <button 
            onClick={() => setIsConfigOpen(!isConfigOpen)}
            className="w-full py-2.5 px-3 flex items-center justify-between text-xs font-bold text-slate-300 uppercase tracking-wider bg-[#0f172a] border-b border-slate-800 cursor-pointer"
          >
            <span className="flex items-center gap-1.5 text-slate-400">
              <SlidersHorizontal className="h-3.5 w-3.5" />
              Similarity Settings
            </span>
            {isConfigOpen ? <ChevronDown className="h-3.5 w-3.5 text-slate-500" /> : <ChevronRight className="h-3.5 w-3.5 text-slate-500" />}
          </button>
          
          {isConfigOpen && (
            <div className="p-3.5 space-y-3.5">
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-[11px] font-bold text-slate-450 text-slate-400 uppercase">Cosine Cutoff Threshold</label>
                  <span className="text-[11px] font-mono font-bold px-1.5 py-0.5 rounded bg-blue-950 text-blue-400 border border-blue-900/40">{matchThreshold.toFixed(2)}</span>
                </div>
                <input 
                  id="threshold-slider"
                  type="range" 
                  min="0.05" 
                  max="0.75" 
                  step="0.05"
                  value={matchThreshold}
                  onChange={(e) => onSetThreshold(parseFloat(e.target.value))}
                  className="w-full accent-blue-500 cursor-pointer h-1.5 rounded-lg bg-slate-800"
                />
                <div className="flex justify-between text-[9px] text-slate-500 font-mono mt-1">
                  <span>0.05 (Aggressive)</span>
                  <span>0.75 (Precise)</span>
                </div>
              </div>

              {/* Corpora Quick Technical Stats */}
              <div className="pt-2 border-t border-slate-800">
                <span className="text-[10px] font-bold text-slate-500 uppercase block mb-1.5">NLP Corpus Info</span>
                <div className="grid grid-cols-2 gap-2 text-center">
                  <div className="bg-[#0f172a] border border-slate-800 p-2 rounded-lg">
                    <div className="text-[10px] text-slate-550 text-slate-400 font-medium">FAQ Dataset</div>
                    <div className="text-xs font-bold font-mono text-white">{faqs.length} docs</div>
                  </div>
                  <div className="bg-[#0f172a] border border-slate-800 p-2 rounded-lg">
                    <div className="text-[10px] text-slate-555 text-slate-400 font-medium">Vocab Roots</div>
                    <div className="text-xs font-bold font-mono text-white">{vocabSize} keys</div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* FAQ Database Explorer Accordion */}
        <div className="border border-slate-800 rounded-lg overflow-hidden bg-[#1e293b]/30 shadow-sm">
          <button 
            onClick={() => setIsFaqExpanderOpen(!isFaqExpanderOpen)}
            className="w-full py-2.5 px-3 flex items-center justify-between text-xs font-bold text-slate-300 uppercase tracking-wider bg-[#0f172a] border-b border-slate-800 cursor-pointer"
          >
            <span className="flex items-center gap-1.5 text-slate-400">
              <BookOpen className="h-3.5 w-3.5" />
              FAQ Database Explorer
            </span>
            {isFaqExpanderOpen ? <ChevronDown className="h-3.5 w-3.5 text-slate-500" /> : <ChevronRight className="h-3.5 w-3.5 text-slate-500" />}
          </button>

          {isFaqExpanderOpen && (
            <div className="p-2 space-y-2">
              {/* Database search bar */}
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-500" />
                <input 
                  type="text" 
                  placeholder="Filter FAQ records..."
                  value={dbSearchQuery}
                  onChange={(e) => setDbSearchQuery(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 rounded-md border text-xs bg-[#0f172a] border-slate-800 text-slate-300 focus:outline-none focus:ring-1 focus:ring-blue-500 placeholder-slate-500"
                />
              </div>

              {/* Category-based collapse */}
              <div className="space-y-1.5 max-h-72 overflow-y-auto pr-1">
                {categories.map(category => {
                  const isCurrent = activeFaqCategory === category;
                  return (
                    <div key={category} className="rounded border border-slate-800 bg-[#0f172a]/40 overflow-hidden">
                      <button 
                        onClick={() => setActiveFaqCategory(isCurrent ? null : category)}
                        className="w-full py-1.5 px-2.5 flex items-center justify-between text-left text-[11px] font-bold text-slate-300 hover:bg-[#1e293b] cursor-pointer"
                      >
                        <span className="truncate">{category}</span>
                        <span className="text-[9px] font-mono px-1 py-0.2 bg-[#1e293b] rounded font-normal text-slate-400">
                          {groupedFaqs[category].length}
                        </span>
                      </button>
                      
                      {isCurrent && (
                        <div className="p-1 px-1.5 space-y-1.5 border-t border-slate-800 bg-[#0f172a]">
                          {groupedFaqs[category].map(faq => (
                            <div 
                              key={faq.id} 
                              className="p-1.5 rounded bg-[#1e293b]/55 group/item border border-slate-800 text-[11px]"
                            >
                              <div className="font-medium text-slate-200 leading-tight">Q: {faq.question}</div>
                              <div className="text-slate-500 italic mt-0.5">A: {faq.answer.substring(0, 45)}...</div>
                              
                              <div className="flex items-center justify-between mt-2 pt-1.5 border-t border-dashed border-slate-800 opacity-0 group-hover/item:opacity-100 transition-opacity">
                                <button
                                  onClick={() => onSelectQuestionText(faq.question, false)}
                                  className="text-[9px] font-semibold text-slate-400 hover:text-white cursor-pointer"
                                >
                                  Use draft
                                </button>
                                <button
                                  onClick={() => onSelectQuestionText(faq.question, true)}
                                  className="text-[9px] font-bold text-blue-400 hover:text-blue-350 flex items-center gap-0.5 cursor-pointer"
                                >
                                  Ask bot <ExternalLink className="h-2 w-2" />
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}

                {categories.length === 0 && (
                  <p className="text-[10px] text-slate-500 italic text-center py-2">No matching FAQs found.</p>
                )}
              </div>
            </div>
          )}
        </div>

      </div>

      {/* Sidebar Footer Controls */}
      <div className="p-4 border-t border-slate-800 space-y-2">
        <button 
          id="btn-sidebar-clear-chat"
          onClick={onClearAllSessions}
          className="w-full flex items-center justify-center gap-1.5 py-2 rounded-md hover:bg-rose-950/20 text-slate-400 hover:text-rose-450 border border-transparent hover:border-rose-900/40 text-xs font-semibold cursor-pointer transition-colors"
        >
          <RefreshCw className="h-3.5 w-3.5" />
          Clear Chat History
        </button>
        <div className="text-center text-[10px] font-mono text-slate-500">
          STABLE VERSION: 1.0.0
        </div>
      </div>
    </aside>
  );
}
