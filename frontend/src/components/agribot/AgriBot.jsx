import React, { useState, useEffect, useRef } from 'react';
import { MessageSquare, X, Send, Bot, FileText, Activity, ShieldAlert, Sparkles, Loader2 } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { useAuth } from '../../store/AuthContext';
import { useWorkspace } from '../../store/WorkspaceContext';
import api from '../../services/api';

const AgriBot = () => {
  const { user } = useAuth();
  const { activePlot } = useWorkspace();
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([
    { role: 'assistant', content: "Hello! I'm AgriBot, your personal farm advisor. How can I help you today?" }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
    }
  }, [messages, isOpen]);

  const handleSend = async (text, action = 'chat') => {
    if ((!text.trim() && action === 'chat') || isLoading) return;

    const userMessage = { role: 'user', content: text };
    
    // Only add to UI if it's a normal chat or if we want to show the action text
    if (action === 'chat') {
      setMessages(prev => [...prev, userMessage]);
      setInput('');
    } else {
      setMessages(prev => [...prev, { role: 'user', content: `*Requested: ${text}*` }]);
    }
    
    setIsLoading(true);

    try {
      // Do not send the initial greeting to the API as Llama 3 expects the first message to be from a user
      const history = messages.filter(m => 
        m.role !== 'system' && 
        m.content !== "Hello! I'm AgriBot, your personal farm advisor. How can I help you today?"
      );
      const response = await api.agribot.chat(
        user.uid,
        action === 'chat' ? text : '',
        activePlot ? activePlot.id : '',
        history,
        action
      );
      
      setMessages(prev => [...prev, { role: 'assistant', content: response.answer }]);
    } catch (error) {
      console.error("AgriBot Error:", error);
      setMessages(prev => [...prev, { role: 'assistant', content: "I'm sorry, I encountered an error connecting to the intelligence layer." }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      {/* Floating Button */}
      <button
        onClick={() => setIsOpen(true)}
        className={`fixed bottom-6 right-6 bg-emerald-600 hover:bg-emerald-700 text-white rounded-full p-4 shadow-xl hover:shadow-2xl transition-all duration-300 z-40 flex items-center gap-2 ${isOpen ? 'scale-0 opacity-0 pointer-events-none' : 'scale-100 opacity-100'}`}
      >
        <Bot size={24} />
        <span className="font-semibold hidden sm:inline pr-1">Ask AgriBot</span>
      </button>

      {/* Chat Drawer/Modal */}
      <div 
        className={`fixed inset-y-0 right-0 w-full sm:w-[400px] md:w-[450px] bg-white shadow-2xl z-50 flex flex-col border-l border-gray-200 transform transition-transform duration-300 ease-in-out ${isOpen ? 'translate-x-0' : 'translate-x-full'}`}
      >
        
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-emerald-700 bg-emerald-600 text-white">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-500 rounded-full shadow-inner">
              <Bot size={22} />
            </div>
            <div>
              <h3 className="font-bold text-lg leading-tight">AgriBot</h3>
              <p className="text-emerald-100 text-xs font-medium">Context-Aware AI Assistant</p>
            </div>
          </div>
          <button onClick={() => setIsOpen(false)} className="p-2 hover:bg-emerald-500 rounded-full transition-colors">
            <X size={20} />
          </button>
        </div>

        {/* Quick Actions */}
        <div className="p-3 border-b border-gray-200 bg-gray-50 flex gap-2 overflow-x-auto no-scrollbar">
          <button onClick={() => handleSend('Generate Farm Briefing', 'briefing')} className="flex items-center gap-1.5 whitespace-nowrap px-3 py-1.5 bg-white border border-gray-200 rounded-full text-xs font-medium text-gray-700 hover:bg-emerald-50 hover:text-emerald-700 hover:border-emerald-300 transition-colors shadow-sm">
            <Sparkles size={14} className="text-amber-500" /> Briefing
          </button>
          <button onClick={() => handleSend('Generate Farm Audit', 'audit')} className="flex items-center gap-1.5 whitespace-nowrap px-3 py-1.5 bg-white border border-gray-200 rounded-full text-xs font-medium text-gray-700 hover:bg-emerald-50 hover:text-emerald-700 hover:border-emerald-300 transition-colors shadow-sm">
            <FileText size={14} className="text-blue-500" /> Audit
          </button>
          {activePlot && activePlot.crop && (
             <button onClick={() => handleSend('Explain Recommendation', 'explain_recommendation')} className="flex items-center gap-1.5 whitespace-nowrap px-3 py-1.5 bg-white border border-gray-200 rounded-full text-xs font-medium text-gray-700 hover:bg-emerald-50 hover:text-emerald-700 hover:border-emerald-300 transition-colors shadow-sm">
               <Activity size={14} className="text-emerald-500" /> Why {activePlot.crop}?
             </button>
          )}
          <button onClick={() => handleSend('Analyze Risks', 'analyze_risks')} className="flex items-center gap-1.5 whitespace-nowrap px-3 py-1.5 bg-white border border-gray-200 rounded-full text-xs font-medium text-gray-700 hover:bg-emerald-50 hover:text-emerald-700 hover:border-emerald-300 transition-colors shadow-sm">
            <ShieldAlert size={14} className="text-red-500" /> Risks
          </button>
        </div>

        {/* Chat Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-5 bg-gray-50/50">
          {messages.map((msg, idx) => (
            <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[85%] rounded-2xl px-4 py-3 shadow-sm ${msg.role === 'user' ? 'bg-emerald-600 text-white rounded-tr-none' : 'bg-white border border-gray-200 text-gray-800 rounded-tl-none'}`}>
                <div className={`prose prose-sm max-w-none ${msg.role === 'user' ? 'prose-invert text-white' : 'text-gray-800'} prose-p:leading-snug prose-headings:font-semibold prose-a:text-emerald-600`}>
                  <ReactMarkdown>{msg.content}</ReactMarkdown>
                </div>
              </div>
            </div>
          ))}
          {isLoading && (
            <div className="flex justify-start animate-pulse">
              <div className="bg-white border border-gray-200 rounded-2xl rounded-tl-none px-4 py-3 shadow-sm flex items-center gap-3 text-gray-500">
                <Loader2 size={16} className="animate-spin text-emerald-600" />
                <span className="text-sm font-medium">Analyzing farm data...</span>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} className="h-1" />
        </div>

        {/* Input Area */}
        <div className="p-4 bg-white border-t border-gray-200">
          {activePlot ? (
            <div className="mb-2.5 text-xs text-gray-500 flex items-center gap-1.5 font-medium px-1">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              Context: {activePlot.name} <span className="text-gray-400 font-normal">({activePlot.crop || 'No crop'})</span>
            </div>
          ) : (
            <div className="mb-2.5 text-xs text-gray-400 flex items-center gap-1.5 font-medium px-1">
              <span className="inline-block w-2 h-2 rounded-full bg-gray-300"></span>
              Global Context
            </div>
          )}
          <form onSubmit={(e) => { e.preventDefault(); handleSend(input); }} className="flex gap-2">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask about weather, markets, or plots..."
              className="flex-1 bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-xl focus:ring-emerald-500 focus:border-emerald-500 block p-3 outline-none transition-all placeholder:text-gray-400"
              disabled={isLoading}
            />
            <button
              type="submit"
              disabled={!input.trim() || isLoading}
              className="bg-emerald-600 hover:bg-emerald-700 text-white p-3 rounded-xl disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center shadow-sm"
            >
              <Send size={18} />
            </button>
          </form>
        </div>
        
      </div>
      
      {/* Backdrop for mobile */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-gray-900/40 backdrop-blur-sm z-40 sm:hidden transition-opacity"
          onClick={() => setIsOpen(false)}
        />
      )}
    </>
  );
};

export default AgriBot;
