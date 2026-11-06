import React, { useState, useRef, useEffect } from 'react';
import { Bot, Send, ShieldAlert, Sparkles, User, AlertTriangle, ArrowRight } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { processAIChatMessage, type AIMessage } from '../../services/ai/assistantEngine';
import { Button } from '../common/Button';
import { useI18n } from '../../i18n';

interface CarePathAIChatProps {
  onNavigatePage: (page: string) => void;
}

const CHAT_SESSION_KEY = 'carepath_ai_chat_session';

export const CarePathAIChat: React.FC<CarePathAIChatProps> = ({ onNavigatePage }) => {
  const { user } = useAuth();
  const { t } = useI18n();

  const [messages, setMessages] = useState<AIMessage[]>(() => {
    try {
      if (typeof sessionStorage !== 'undefined') {
        const saved = sessionStorage.getItem(CHAT_SESSION_KEY);
        if (saved) {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed) && parsed.length > 0) return parsed;
        }
      }
    } catch {
      // ignore
    }
    return [
      {
        id: 'welcome-msg',
        sender: 'assistant',
        content:
          'Hello! I am your **CarePath AI administrative navigator**. I can explain why facilities were matched, clarify conflicting hospital records, check your document readiness, and outline your next administrative steps.\n\n*Please note: I cannot diagnose medical conditions or give clinical treatment advice.*',
        timestamp: new Date().toISOString(),
      },
    ];
  });

  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    try {
      if (typeof sessionStorage !== 'undefined') {
        sessionStorage.setItem(CHAT_SESSION_KEY, JSON.stringify(messages));
      }
    } catch {
      // ignore
    }
    scrollToBottom();
  }, [messages, isTyping]);

  const handleSend = async (textToSend?: string) => {
    const query = (textToSend || input).trim();
    if (!query || !user) return;

    const userMsg: AIMessage = {
      id: 'user-' + Date.now(),
      sender: 'user',
      content: query,
      timestamp: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setIsTyping(true);

    // Grounded AI processing
    const response = await processAIChatMessage(user.id, query);
    setIsTyping(false);
    setMessages((prev) => [...prev, response]);
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col h-[700px]">
      {/* Header with Safety Disclaimer */}
      <div className="p-4 bg-slate-900 text-white flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-teal-500/20 text-teal-400 border border-teal-500/30 flex items-center justify-center">
            <Bot className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold">{t.ai.title}</h3>
              <span className="text-[10px] font-mono font-semibold px-1.5 py-0.2 rounded bg-teal-900/80 text-teal-300 border border-teal-700">
                Grounded Engine
              </span>
            </div>
            <p className="text-[11px] text-slate-400">{t.ai.subtitle}</p>
          </div>
        </div>
      </div>

      {/* Persistent Clinical Disclaimer & Emergency Banner */}
      <div className="px-4 py-2.5 bg-amber-50/90 border-b border-amber-200 text-amber-950 text-xs space-y-1">
        <div className="flex items-center gap-2 font-bold text-amber-900">
          <ShieldAlert className="w-4 h-4 text-amber-700 flex-shrink-0" />
          <span>{t.ai.clinicalRefusalTitle}</span>
        </div>
        <p className="text-[11px] text-amber-900 leading-relaxed">
          {t.ai.disclaimer}
          <strong className="block text-rose-800 font-semibold mt-0.5">
            🚨 {t.ai.emergencyNotice}
          </strong>
        </p>
      </div>

      {/* Conversation Messages */}
      <div className="flex-1 p-4 overflow-y-auto space-y-4 bg-slate-50/50">
        {messages.map((m) => {
          const isUser = m.sender === 'user';

          return (
            <div
              key={m.id}
              className={`flex items-start gap-3 ${isUser ? 'flex-row-reverse' : ''}`}
            >
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold ${
                  isUser
                    ? 'bg-brand-600 text-white'
                    : m.isClinicalRefusal
                    ? 'bg-rose-100 text-rose-700 border border-rose-300'
                    : 'bg-teal-600 text-white'
                }`}
              >
                {isUser ? <User className="w-4 h-4" /> : m.isClinicalRefusal ? <AlertTriangle className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
              </div>

              <div
                className={`max-w-[85%] rounded-2xl p-4 text-xs leading-relaxed ${
                  isUser
                    ? 'bg-brand-600 text-white rounded-tr-none'
                    : m.isClinicalRefusal
                    ? 'bg-rose-50 border border-rose-200 text-rose-950 rounded-tl-none shadow-xs'
                    : 'bg-white border border-slate-200 text-slate-800 rounded-tl-none shadow-xs'
                }`}
              >
                {/* Formatted Content */}
                <div className="whitespace-pre-wrap">{m.content}</div>

                {/* Grounded Action Pills */}
                {m.groundedReferences && m.groundedReferences.length > 0 && (
                  <div className="mt-3 pt-2.5 border-t border-slate-100 flex flex-wrap gap-1.5">
                    {m.groundedReferences.map((ref, i) => (
                      <button
                        key={i}
                        onClick={() => {
                          if (ref.link?.startsWith('/')) {
                            onNavigatePage(ref.link.replace('/', ''));
                          }
                        }}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-slate-100 hover:bg-slate-200 text-slate-800 font-semibold text-[11px] transition-colors"
                      >
                        <span>{ref.title}</span>
                        <ArrowRight className="w-3 h-3 text-brand-600" />
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          );
        })}

        {isTyping && (
          <div className="flex items-center gap-2 text-xs text-slate-400 pl-11">
            <Sparkles className="w-3.5 h-3.5 animate-spin text-teal-500" />
            <span>Analyzing application records and verifying constraints...</span>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Suggested Prompt Chips */}
      <div className="p-3 bg-white border-t border-slate-200 space-y-2">
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
          {t.ai.suggestedQueries.map((q, i) => (
            <button
              key={i}
              onClick={() => handleSend(q)}
              className="whitespace-nowrap px-2.5 py-1 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-700 text-[11px] font-medium transition-colors"
            >
              {q}
            </button>
          ))}
        </div>

        {/* Input Bar */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSend();
          }}
          className="flex items-center gap-2"
        >
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={t.ai.inputPlaceholder}
            className="flex-1 text-xs rounded-xl border-slate-300 py-2.5 px-3 focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
          />
          <Button
            type="submit"
            variant="primary"
            size="md"
            disabled={!input.trim()}
            leftIcon={<Send className="w-3.5 h-3.5" />}
          >
            {t.ai.send}
          </Button>
        </form>
      </div>
    </div>
  );
};
