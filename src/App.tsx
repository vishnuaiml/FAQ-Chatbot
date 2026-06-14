import React, { useState, useEffect, useMemo, useRef } from 'react';
import Sidebar from './components/Sidebar';
import ChatWindow from './components/ChatWindow';
import { FAQItem, ChatSession, Message } from './types';
import { FAQEngine, preprocessText } from './lib/nlp';
import { INITIAL_SESSIONS } from './data/initialHistory';
import rawFaqs from './data/faqs.json';

// Typecast import
const faqsList = rawFaqs as FAQItem[];

export default function App() {
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [matchThreshold, setMatchThreshold] = useState<number>(0.15);
  const [darkMode, setDarkMode] = useState<boolean>(false);
  const [isTyping, setIsTyping] = useState<boolean>(false);

  // Reference to manage active typing timers and avoid state leaks/race conditions
  const typingIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Initialize NLP Engine as backup/fallback inside client
  const nlpEngine = useMemo(() => {
    return new FAQEngine(faqsList);
  }, []);

  // Compute unique vocabulary vocabulary terms count
  const vocabSize = useMemo(() => {
    const vocabSet = new Set<string>();
    faqsList.forEach(item => {
      preprocessText(item.question).forEach(token => vocabSet.add(token));
    });
    return vocabSet.size;
  }, []);

  // 1. Initial State Hydration (Local Storage + Seed Conversation)
  useEffect(() => {
    const storedSessions = localStorage.getItem('faq_chat_sessions');
    const storedThreshold = localStorage.getItem('faq_threshold');
    const storedDarkMode = localStorage.getItem('faq_dark_mode');

    if (storedSessions) {
      try {
        const loaded = JSON.parse(storedSessions) as ChatSession[];
        setSessions(loaded);
        if (loaded.length > 0) {
          setCurrentSessionId(loaded[0].id);
        }
      } catch {
        setSessions(INITIAL_SESSIONS);
        setCurrentSessionId(INITIAL_SESSIONS[0].id);
      }
    } else {
      setSessions(INITIAL_SESSIONS);
      setCurrentSessionId(INITIAL_SESSIONS[0].id);
    }

    if (storedThreshold) {
      setMatchThreshold(parseFloat(storedThreshold));
    }

    if (storedDarkMode) {
      setDarkMode(storedDarkMode === 'true');
    } else {
      // System preference fallback
      const systemPreference = window.matchMedia('(prefers-color-scheme: dark)').matches;
      setDarkMode(systemPreference);
    }
  }, []);

  // 2. Persist state changes to localStorage
  useEffect(() => {
    if (sessions.length > 0) {
      localStorage.setItem('faq_chat_sessions', JSON.stringify(sessions));
    } else {
      localStorage.removeItem('faq_chat_sessions');
    }
  }, [sessions]);

  useEffect(() => {
    localStorage.setItem('faq_threshold', matchThreshold.toString());
  }, [matchThreshold]);

  useEffect(() => {
    localStorage.setItem('faq_dark_mode', darkMode.toString());
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [darkMode]);

  // Clean typing ticks on unmount
  useEffect(() => {
    return () => {
      if (typingIntervalRef.current) clearInterval(typingIntervalRef.current);
    };
  }, []);

  const currentSession = useMemo(() => {
    return sessions.find(s => s.id === currentSessionId) || null;
  }, [sessions, currentSessionId]);

  // Helper: Create unique visual titles for conversations based on question query
  const truncateTitle = (text: string, maxLen: number = 24) => {
    if (text.length <= maxLen) return text;
    return text.substring(0, maxLen).trim() + '...';
  };

  // Actions
  const handleSelectSession = (id: string) => {
    if (typingIntervalRef.current) {
      clearInterval(typingIntervalRef.current);
      setIsTyping(false);
    }
    setCurrentSessionId(id);
  };

  const handleNewSession = () => {
    const newId = `session_${Date.now()}`;
    const newSess: ChatSession = {
      id: newId,
      title: "💬 New Dialogue Log",
      messages: [],
      createdAt: new Date().toISOString()
    };
    
    setSessions(prev => [newSess, ...prev]);
    setCurrentSessionId(newId);
  };

  const handleDeleteSession = (id: string) => {
    if (typingIntervalRef.current) {
      clearInterval(typingIntervalRef.current);
      setIsTyping(false);
    }

    const remaining = sessions.filter(s => s.id !== id);
    setSessions(remaining);
    
    if (currentSessionId === id) {
      if (remaining.length > 0) {
        setCurrentSessionId(remaining[0].id);
      } else {
        setCurrentSessionId(null);
      }
    }
  };

  const handleClearAllSessions = () => {
    if (typingIntervalRef.current) {
      clearInterval(typingIntervalRef.current);
      setIsTyping(false);
    }
    setSessions([]);
    setCurrentSessionId(null);
    localStorage.removeItem('faq_chat_sessions');
  };

  const handleClearCurrentSession = () => {
    if (typingIntervalRef.current) {
      clearInterval(typingIntervalRef.current);
      setIsTyping(false);
    }
    if (!currentSessionId) return;

    setSessions(prev => prev.map(s => {
      if (s.id === currentSessionId) {
        return { ...s, messages: [], title: "💬 Cleared stream" };
      }
      return s;
    }));
  };

  // Main chat sending execution pipeline
  const handleSendMessage = async (userText: string) => {
    let activeId = currentSessionId;
    let fallbackSession: ChatSession | null = null;

    // Auto bootstrap session if list is empty
    if (!activeId) {
      const newId = `session_${Date.now()}`;
      fallbackSession = {
        id: newId,
        title: truncateTitle(userText),
        messages: [],
        createdAt: new Date().toISOString()
      };
      activeId = newId;
    }

    const userMessage: Message = {
      id: `u_${Date.now()}`,
      sender: 'user',
      text: userText,
      timestamp: new Date().toISOString()
    };

    // Append user message immediately
    let initialSessionsState: ChatSession[];
    if (fallbackSession) {
      initialSessionsState = [
        { ...fallbackSession, messages: [userMessage] },
        ...sessions
      ];
      setSessions(initialSessionsState);
      setCurrentSessionId(activeId);
    } else {
      initialSessionsState = sessions.map(s => {
        if (s.id === activeId) {
          const updatedTitle = s.messages.length === 0 ? truncateTitle(userText) : s.title;
          return {
            ...s,
            title: updatedTitle,
            messages: [...s.messages, userMessage]
          };
        }
        return s;
      });
      setSessions(initialSessionsState);
    }

    setIsTyping(true);

    // Call backend API /chat with fallback in case of connection failure or offline preview
    let botReplyText = "Sorry, I could not understand your question.";
    let matchedQuestion = "";
    let similarityScore = 0;

    try {
      const response = await fetch('/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: userText, threshold: matchThreshold })
      });

      if (response.ok) {
        const payload = await response.json();
        if (payload.success) {
          botReplyText = payload.answer;
          matchedQuestion = payload.matched_question;
          similarityScore = payload.similarity;
        }
      } else {
        throw new Error('Express API not responding correctly');
      }
    } catch (apiError) {
      console.warn("Express backend offline or experiencing latency. Falling back to local Client NLP Engine.", apiError);
      const offlineResult = nlpEngine.query(userText, matchThreshold);
      botReplyText = offlineResult.answer;
      matchedQuestion = offlineResult.matchedQuestion;
      similarityScore = offlineResult.similarity;
    }

    // Dynamic Word-by-word streaming/typing effect simulating ChatGPT
    const botMsgId = `b_${Date.now()}`;
    const words = botReplyText.split(' ');
    let currentWordIdx = 0;

    const partialMessage: Message = {
      id: botMsgId,
      sender: 'bot',
      text: '',
      timestamp: new Date().toISOString(),
      matchedQuestion,
      similarity: similarityScore,
      isStreaming: true
    };

    // Insert empty streaming placeholder
    setSessions(prev => prev.map(s => {
      if (s.id === activeId) {
        return {
          ...s,
          messages: [...s.messages, partialMessage]
        };
      }
      return s;
    }));

    setIsTyping(false);

    // Stream word output ticks 
    typingIntervalRef.current = setInterval(() => {
      if (currentWordIdx < words.length) {
        const typedText = words.slice(0, currentWordIdx + 1).join(' ');
        setSessions(prev => prev.map(s => {
          if (s.id === activeId) {
            return {
              ...s,
              messages: s.messages.map(m => {
                if (m.id === botMsgId) {
                  return { ...m, text: typedText };
                }
                return m;
              })
            };
          }
          return s;
        }));
        currentWordIdx++;
      } else {
        // Finalize streaming state
        if (typingIntervalRef.current) clearInterval(typingIntervalRef.current);
        setSessions(prev => prev.map(s => {
          if (s.id === activeId) {
            return {
              ...s,
              messages: s.messages.map(m => {
                if (m.id === botMsgId) {
                  return { ...m, isStreaming: false };
                }
                return m;
              })
            };
          }
          return s;
        }));
      }
    }, 45); // Speed multiplier gives a rapid but elegant humanized feel
  };

  const handleSelectQuestionText = (text: string, autoSubmit: boolean = false) => {
    // Inserts text into the text box, or instantly executes query
    const inputElement = document.getElementById('chat-input-box') as HTMLInputElement | null;
    if (inputElement) {
      inputElement.value = text;
      // Focus element
      inputElement.focus();
    }
    
    if (autoSubmit) {
      handleSendMessage(text);
    }
  };

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-white dark:bg-slate-950 font-sans transition-colors duration-200">
      <Sidebar 
        sessions={sessions}
        currentSessionId={currentSessionId}
        faqs={faqsList}
        vocabSize={vocabSize}
        matchThreshold={matchThreshold}
        darkMode={darkMode}
        onSelectSession={handleSelectSession}
        onNewSession={handleNewSession}
        onDeleteSession={handleDeleteSession}
        onClearAllSessions={handleClearAllSessions}
        onSetThreshold={setMatchThreshold}
        onToggleDarkMode={() => setDarkMode(!darkMode)}
        onSelectQuestionText={handleSelectQuestionText}
      />
      
      <ChatWindow 
        currentSession={currentSession}
        faqs={faqsList}
        isTyping={isTyping}
        onSendMessage={handleSendMessage}
        onClearSession={handleClearCurrentSession}
        suggestedQuestions={faqsList}
      />
    </div>
  );
}
