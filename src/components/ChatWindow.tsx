import React, { useState, useEffect, useRef } from 'react';
import { 
  Send, Sparkles, Cpu, Bot, User, Copy, Check, 
  Terminal, ShieldCheck, ChevronDown, ChevronUp, Clock, FileText, ArrowDown
} from 'lucide-react';
import { ChatSession, Message, FAQItem } from '../types';
import { preprocessText } from '../lib/nlp';

interface ChatWindowProps {
  currentSession: ChatSession | null;
  faqs: FAQItem[];
  isTyping: boolean;
  onSendMessage: (text: string) => void;
  onClearSession: () => void;
  suggestedQuestions: FAQItem[];
}

export default function ChatWindow({
  currentSession,
  faqs,
  isTyping,
  onSendMessage,
  onClearSession,
  suggestedQuestions
}: ChatWindowProps) {
  const [inputText, setInputText] = useState('');
  const [copiedMessageId, setCopiedMessageId] = useState<string | null>(null);
  const [expandedStatsId, setExpandedStatsId] = useState<string | null>(null);
  
  const chatEndRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [showScrollButton, setShowScrollButton] = useState(false);

  // Auto scroll to bottom
  const scrollToBottom = () => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [currentSession?.messages, isTyping]);

  // Track viewport scroll to show "jump to bottom" button
  const handleScroll = () => {
    if (!scrollContainerRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = scrollContainerRef.current;
    if (scrollHeight - scrollTop - clientHeight > 300) {
      setShowScrollButton(true);
    } else {
      setShowScrollButton(false);
    }
  };

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() || isTyping) return;
    onSendMessage(inputText.trim());
    setInputText('');
  };

  const handleCopyText = (text: string, messageId: string) => {
    navigator.clipboard.writeText(text);
    setCopiedMessageId(messageId);
    setTimeout(() => {
      setCopiedMessageId(null);
    }, 2000);
  };

  const toggleStats = (messageId: string) => {
    setExpandedStatsId(expandedStatsId === messageId ? null : messageId);
  };

  const selectSuggested = (question: string) => {
    if (isTyping) return;
    onSendMessage(question);
  };

  // Generate formatting tags for timestamps
  const formatTime = (isoString?: string) => {
    if (!isoString) return '';
    try {
      const date = new Date(isoString);
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch {
      return '';
    }
  };

  // Group quick suggestions into distinct tabs or tags
  const welcomeFaqs = suggestedQuestions.slice(0, 4);

  return (
    <div className="flex-1 flex flex-col h-full bg-[#f8fafc] dark:bg-slate-950 text-slate-800 dark:text-slate-100 transition-colors duration-200 relative">
      
      {/* Thread Header */}
      <header className="h-16 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex items-center justify-between px-6 shadow-sm z-10 shrink-0">
        <div className="flex items-center gap-3">
          <div className="h-2.5 w-2.5 rounded-full bg-[#10b981] animate-pulse" />
          <div>
            <h2 className="font-display font-semibold text-slate-900 dark:text-slate-200 text-sm">
              {currentSession ? currentSession.title : "Active Conversational Session"}
            </h2>
            <p className="text-[10px] text-slate-400 dark:text-slate-500 font-mono uppercase tracking-wider">
              {currentSession?.messages?.length || 0} MESSAGES IN ACTIVE LOG
            </p>
          </div>
        </div>
        
        {currentSession && currentSession.messages.length > 0 ? (
          <button 
            id="btn-chat-clear-stream"
            onClick={onClearSession}
            className="text-xs font-bold px-4 py-1.5 rounded-lg text-slate-500 dark:text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/20 border border-slate-200 dark:border-slate-800 transition-colors cursor-pointer"
          >
            Clear Thread
          </button>
        ) : (
          <div className="px-4 py-1.5 bg-blue-50 dark:bg-blue-950/30 text-blue-600 dark:text-blue-400 text-xs font-bold rounded-full border border-blue-100 dark:border-blue-900/50 uppercase tracking-wider font-mono">
            Analysis Ready
          </div>
        )}
      </header>

      {/* Message Feed Display */}
      <div 
        ref={scrollContainerRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto px-6 py-4 space-y-6 scroll-smooth"
      >
        {currentSession && currentSession.messages.length > 0 ? (
          <div className="max-w-3xl mx-auto space-y-6">
            {currentSession.messages.map((msg) => {
              const IsUser = msg.sender === 'user';
              const tokens = msg.matchedQuestion ? preprocessText(msg.text) : [];
              const rawTokensUser = IsUser ? preprocessText(msg.text) : [];
              
              return (
                <div 
                  key={msg.id}
                  id={`message-${msg.id}`}
                  className={`flex gap-4 ${IsUser ? 'justify-end' : 'justify-start'}`}
                >
                  {/* Left Avatar (only for bot) */}
                  {!IsUser && (
                    <div className="h-9 w-9 rounded-xl bg-blue-100 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900/50 flex items-center justify-center shrink-0 shadow-sm text-blue-600 dark:text-blue-400">
                      <Bot className="h-5 w-5 animate-pulse-subtle" />
                    </div>
                  )}

                  {/* Body Bubble */}
                  <div className={`max-w-[82%] space-y-1.5 ${IsUser ? 'text-right' : 'text-left'}`}>
                    <div 
                      className={`relative px-4 py-3 rounded-2xl shadow-sm text-sm group transition-all duration-150 relative ${
                        IsUser 
                          ? 'bg-blue-600 text-white rounded-tr-none font-sans shadow-md shadow-blue-500/10' 
                          : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-100 rounded-tl-none font-sans'
                      }`}
                    >
                      {/* Copy Action button overlay */}
                      <button 
                        onClick={() => handleCopyText(msg.text, msg.id)}
                        className={`absolute top-2 right-2 p-1 rounded opacity-0 group-hover:opacity-100 transition-opacity duration-150 cursor-pointer ${
                          IsUser ? 'text-white/80 hover:bg-white/20' : 'text-slate-400 dark:text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 duration-155'
                        }`}
                        title="Copy message text"
                      >
                        {copiedMessageId === msg.id ? (
                          <Check className="h-3 w-3 text-emerald-500 dark:text-emerald-400" />
                        ) : (
                          <Copy className="h-3 w-3" />
                        )}
                      </button>

                      {/* Main Message Content */}
                      <p className="whitespace-pre-wrap leading-relaxed select-text pr-4">{msg.text}</p>
                      
                      {/* Token listing inside User item for visual audit */}
                      {IsUser && rawTokensUser.length > 0 && (
                        <div className="mt-2 flex flex-wrap gap-1 justify-end">
                          {rawTokensUser.map((tok, i) => (
                            <span key={i} className="text-[9px] font-mono font-medium px-1.5 py-0.2 rounded bg-blue-700/60 text-blue-100">
                              {tok}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Metadata Footer bar */}
                    <div className="flex items-center gap-2 justify-end px-2 text-[10px] text-slate-400 dark:text-slate-500 font-medium">
                      {!IsUser && msg.similarity !== undefined && msg.similarity > 0 && (
                        <span className="flex items-center gap-1">
                          <Cpu className="h-3 w-3 text-blue-500" />
                          Match: {Math.round(msg.similarity * 100)}%
                        </span>
                      )}
                      
                      <span className="flex items-center gap-0.5">
                        <Clock className="h-3 w-3" />
                        {formatTime(msg.timestamp)}
                      </span>

                      {!IsUser && msg.similarity !== undefined && (
                        <button 
                          onClick={() => toggleStats(msg.id)}
                          className="font-bold text-blue-500 hover:text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-0.5 cursor-pointer ml-1"
                        >
                          NLP Audit {expandedStatsId === msg.id ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                        </button>
                      )}
                    </div>

                    {/* NLP diagnostic panel drawer */}
                    {!IsUser && msg.similarity !== undefined && expandedStatsId === msg.id && (
                      <div className="w-full text-left p-3.5 rounded-xl border border-slate-205 dark:border-slate-800 bg-white dark:bg-slate-900 mt-2 font-mono text-[11px] text-slate-550 dark:text-slate-400 space-y-2.5 shadow-sm animate-fadeIn text-slate-500">
                        <div className="flex items-center gap-1.5 text-blue-600 dark:text-blue-400 font-bold mb-1 uppercase tracking-wider text-[10px]">
                          <Terminal className="h-3.5 w-3.5" />
                          <span>Similarity Search Diagnostics</span>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-2 text-xs">
                          <div className="bg-slate-50 dark:bg-slate-950 p-2 rounded">
                            <span className="text-[10px] block text-slate-400 mb-0.5 uppercase">Match Accuracy</span>
                            <span className={`font-bold font-mono text-xs ${msg.similarity > 0.4 ? 'text-emerald-500' : 'text-amber-500'}`}>
                              {msg.similarity.toFixed(4)}
                            </span>
                          </div>
                          <div className="bg-slate-50 dark:bg-slate-950 p-2 rounded">
                            <span className="text-[10px] block text-slate-400 mb-0.5 uppercase">Similarity Metric</span>
                            <span className="font-semibold font-mono text-slate-700 dark:text-slate-350 text-[11px]">Cosine Projection</span>
                          </div>
                        </div>

                        <div className="bg-slate-50 dark:bg-slate-950 p-2.5 rounded">
                          <span className="text-[10px] block text-slate-400 mb-1 uppercase">Matched Template</span>
                          <span className="text-slate-700 dark:text-slate-300 font-semibold font-sans text-xs">
                            {msg.matchedQuestion || "None (Rejected due to low confidence)"}
                          </span>
                        </div>

                        {/* Processed query tokens */}
                        <div>
                          <div className="text-[10px] text-slate-400 mb-1.5 uppercase">Processed Query Lexicon (Lemmas)</div>
                          <div className="flex flex-wrap gap-1">
                            {preprocessText(currentSession.messages.find((m, i) => i === currentSession.messages.indexOf(msg) - 1)?.text || '').map((tok, i) => (
                              <span key={i} className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 font-medium text-slate-600 dark:text-slate-300 border border-slate-200">
                                {tok}
                              </span>
                            ))}
                            {preprocessText(currentSession.messages.find((m, i) => i === currentSession.messages.indexOf(msg) - 1)?.text || '').length === 0 && (
                              <span className="text-slate-450 italic text-[10px]">Preprocessed index outputted empty stems.</span>
                            )}
                          </div>
                        </div>

                        <div className="pt-2 border-t border-dashed border-slate-205 dark:border-slate-800 text-[10px] flex items-center gap-1 text-slate-400">
                          <ShieldCheck className="h-3.5 w-3.5 text-emerald-500" />
                          TF-IDF Angle matching verified successfully.
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Right Avatar (only for user) */}
                  {IsUser && (
                    <div className="h-9 w-9 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-center shrink-0 shadow-sm text-white">
                      <User className="h-5 w-5" />
                    </div>
                  )}
                </div>
              );
            })}

            {/* Pulsing Typist item */}
            {isTyping && (
              <div className="flex gap-4 justify-start">
                <div className="h-9 w-9 rounded-xl bg-blue-105 bg-blue-100 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900 flex items-center justify-center shrink-0">
                  <Bot className="h-5 w-5 text-blue-600 dark:text-blue-400 animate-bounce" />
                </div>
                <div className="space-y-1">
                  <div className="px-4 py-3 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-sm flex items-center gap-1.5 shadow-sm">
                    <span className="h-2 w-2 rounded-full bg-blue-500 animate-bounce" style={{ animationDelay: '0ms' }} />
                    <span className="h-2 w-2 rounded-full bg-blue-500 animate-bounce" style={{ animationDelay: '150ms' }} />
                    <span className="h-2 w-2 rounded-full bg-blue-500 animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                  <span className="text-[9px] text-slate-400 uppercase tracking-widest pl-2 font-mono">TF-IDF Vector Indexing...</span>
                </div>
              </div>
            )}
            
            <div ref={chatEndRef} />
          </div>
        ) : (
          /* Empty/Dashboard state */
          <div className="max-w-2xl mx-auto py-10 space-y-8 flex flex-col justify-center h-full">
            <div className="text-center space-y-3">
              <div className="h-16 w-16 rounded-2xl bg-blue-50 dark:bg-blue-950/20 flex items-center justify-center mx-auto shadow-md border border-blue-100 dark:border-blue-900/40">
                <Cpu className="h-8 w-8 text-blue-600 dark:text-blue-400 animate-pulse-subtle" />
              </div>
              <h2 className="font-display font-extrabold text-3xl tracking-tight text-slate-900 dark:text-slate-100">
                Natural Language FAQ Analyzer
              </h2>
              <p className="text-slate-500 dark:text-slate-400 text-sm max-w-lg mx-auto leading-relaxed">
                Connect and query support catalogs automatically. Evaluates questions using client-side <strong className="text-slate-700 dark:text-slate-300">TF-IDF vectorizations</strong> &amp; <strong className="text-slate-700 dark:text-slate-300">Angle Cosine Matrix projections</strong>.
              </p>
            </div>

            {/* Quick-select grids */}
            <div className="space-y-4">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider text-center font-mono">
                Click a popular FAQ to test vector matching
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                {welcomeFaqs.map((faq) => (
                  <button
                    key={faq.id}
                    onClick={() => selectSuggested(faq.question)}
                    className="p-4 text-left rounded-xl border border-slate-200 dark:border-slate-800/80 hover:border-blue-500 dark:hover:border-blue-400 bg-white dark:bg-slate-900/60 hover:bg-blue-50/25 dark:hover:bg-blue-950/20 shadow-sm transition-all duration-155 relative group cursor-pointer hover:shadow-md hover:-translate-y-0.5"
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="px-2 py-0.5 bg-slate-105 bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 text-[9px] font-bold rounded uppercase tracking-wider">
                        {faq.category}
                      </span>
                      <Sparkles className="h-3 w-3 text-blue-500 opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                    <p className="text-sm font-semibold text-slate-850 text-slate-800 dark:text-slate-200 leading-snug">
                      {faq.question}
                    </p>
                    <p className="text-xs text-slate-400 dark:text-slate-500 italic mt-1.5 line-clamp-1">
                      {faq.answer}
                    </p>
                  </button>
                ))}
              </div>
            </div>

            {/* Model Architecture overview block */}
            <div className="p-4 rounded-xl border border-dashed border-slate-200 dark:border-slate-805 text-center text-xs text-slate-450 dark:text-slate-500 space-y-1.5 bg-white dark:bg-slate-900/30">
              <div className="font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider text-[10px] flex items-center justify-center gap-1.5">
                <Cpu className="h-3.5 w-3.5 text-blue-600" /> NLP PREPROCESSING MECHANICS
              </div>
              <p className="max-w-xl mx-auto leading-relaxed text-[11px]">
                Raw user keys are tokenized, case folded, stripped of punctuation, filtered against a 100-word premium stopwords index, stemmed via dictionary rules, weighted by inverted document frequency ratios, and mapped against the matrix space.
              </p>
            </div>
            
            <div ref={chatEndRef} />
          </div>
        )}
      </div>

      {/* Jump to bottom button */}
      {showScrollButton && (
        <button 
          onClick={scrollToBottom}
          className="slate-scroll-btn absolute bottom-24 right-8 p-3 rounded-full shadow-lg bg-blue-600 text-white hover:bg-blue-700 focus:outline-none transition-all animate-bounce cursor-pointer z-20"
          title="Scroll to bottom"
        >
          <ArrowDown className="h-5 w-5" />
        </button>
      )}

      {/* Footer Textbox Area */}
      <footer className="p-4 border-t border-slate-200 dark:border-slate-805 bg-white dark:bg-slate-900 relative z-10 select-none shadow-sm shadow-slate-100 dark:shadow-none">
        <form onSubmit={handleSend} className="max-w-3xl mx-auto flex gap-3 relative">
          <input 
            id="chat-input-box"
            type="text" 
            placeholder="Type a support, billing, or undergraduate admission question..."
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            disabled={isTyping}
            className="w-full pl-6 pr-24 py-4 bg-slate-50/50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-sm transition-all shadow-inner text-slate-800 dark:text-slate-100"
          />
          <button 
            id="btn-chat-send"
            type="submit"
            disabled={!inputText.trim() || isTyping}
            className="absolute right-2.5 top-2.5 p-2.5 bg-blue-600 text-white rounded-xl shadow-md hover:bg-blue-700 transition-transform active:scale-95 cursor-pointer disabled:opacity-40 disabled:pointer-events-none"
          >
            <Send className="h-4 w-4" />
          </button>
        </form>
        <p className="text-center text-[10px] text-slate-400 dark:text-slate-500 mt-2">
          FAQ Analyzer performs on-device or server-side vector calculations. Cutoff margin is 100% customizable from the Side Panel.
        </p>
      </footer>

    </div>
  );
}
