import { ChatSession } from '../types';

export const INITIAL_SESSIONS: ChatSession[] = [
  {
    id: "session_welcome",
    title: "🎯 Getting Started Guide",
    createdAt: new Date(Date.now() - 3600000 * 2).toISOString(), // 2 hours ago
    messages: [
      {
        id: "m1",
        sender: "user",
        text: "What is this app and how does similarity matching work?",
        timestamp: new Date(Date.now() - 3600000 * 2 + 10000).toISOString()
      },
      {
        id: "m2",
        sender: "bot",
        text: "Welcome to the FAQ Chatbot! This is an intelligent system that uses TF-IDF standard vectorization and Cosine Similarity to find the closest match to your queries from our curated FAQ database. It tokenizes your words, filters out unimportant words (stopwords), stems them to their dictionary roots, and computes a vector match in real-time. Feel free to ask questions like: 'How do I reset my password?' or 'What payments are allowed?'",
        timestamp: new Date(Date.now() - 3600000 * 2 + 30000).toISOString(),
        matchedQuestion: "How do I reset my password?",
        similarity: 0.8354
      }
    ]
  },
  {
    id: "session_shipping_test",
    title: "📦 Shipping & Return Queries",
    createdAt: new Date(Date.now() - 3600000 * 24).toISOString(), // 1 day ago
    messages: [
      {
        id: "s1",
        sender: "user",
        text: "can you ship items overseas?",
        timestamp: new Date(Date.now() - 3600000 * 24 + 10000).toISOString()
      },
      {
        id: "s2",
        sender: "bot",
        text: "Yes, we ship to over 100 countries worldwide. International shipping options, custom duties, and shipping rates are computed at checkout based on your delivery address.",
        timestamp: new Date(Date.now() - 3600000 * 24 + 30000).toISOString(),
        matchedQuestion: "Do you offer international shipping?",
        similarity: 0.6924
      }
    ]
  }
];
