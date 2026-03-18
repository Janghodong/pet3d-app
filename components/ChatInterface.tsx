'use client';

import { useState, useRef, useEffect, KeyboardEvent } from 'react';
import { ChatMessage, AnimationState } from '@/lib/types';

interface ChatInterfaceProps {
  petName: string;
  onSendMessage: (msg: string) => void;
  messages: ChatMessage[];
  isLoading: boolean;
}

const animationEmoji: Record<AnimationState, string> = {
  happy: '😊',
  excited: '🎉',
  sad: '😢',
  wave: '👋',
  headbang: '🤘',
  idle: '🐾',
};

export default function ChatInterface({
  petName,
  onSendMessage,
  messages,
  isLoading,
}: ChatInterfaceProps) {
  const [inputValue, setInputValue] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  const handleSend = () => {
    const trimmed = inputValue.trim();
    if (!trimmed || isLoading) return;
    onSendMessage(trimmed);
    setInputValue('');
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center gap-2 pb-3 border-b border-orange-100 mb-3 flex-shrink-0">
        <div className="w-8 h-8 rounded-full bg-orange-100 flex items-center justify-center text-lg">
          🐾
        </div>
        <div>
          <p className="font-semibold text-gray-800 text-sm leading-none">{petName}</p>
          <p className="text-xs text-green-500 mt-0.5">在线</p>
        </div>
      </div>

      {/* Messages list */}
      <div className="flex-1 overflow-y-auto space-y-3 pr-1 min-h-0">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center text-gray-400 py-6">
            <span className="text-4xl mb-2">💬</span>
            <p className="text-sm">跟 {petName} 打个招呼吧！</p>
          </div>
        )}

        {messages.map((msg, index) => {
          const isUser = msg.role === 'user';
          const emoji =
            !isUser && msg.animationState
              ? animationEmoji[msg.animationState]
              : null;

          return (
            <div
              key={index}
              className={`flex ${isUser ? 'justify-end' : 'justify-start'} items-end gap-2`}
            >
              {/* Pet avatar */}
              {!isUser && (
                <div className="w-7 h-7 rounded-full bg-orange-100 flex items-center justify-center text-sm flex-shrink-0 mb-0.5">
                  🐾
                </div>
              )}

              <div className={`max-w-[75%] ${isUser ? 'items-end' : 'items-start'} flex flex-col gap-0.5`}>
                {/* Pet name label */}
                {!isUser && (
                  <span className="text-xs text-gray-400 ml-1">{petName}</span>
                )}

                {/* Bubble */}
                <div
                  className={`
                    px-3 py-2 rounded-2xl text-sm leading-relaxed break-words
                    ${isUser
                      ? 'bg-orange-500 text-white rounded-br-sm'
                      : 'bg-white text-gray-800 shadow-sm border border-gray-100 rounded-bl-sm'
                    }
                  `}
                >
                  {emoji && (
                    <span className="mr-1.5">{emoji}</span>
                  )}
                  {msg.content}
                </div>
              </div>
            </div>
          );
        })}

        {/* Loading indicator */}
        {isLoading && (
          <div className="flex justify-start items-end gap-2">
            <div className="w-7 h-7 rounded-full bg-orange-100 flex items-center justify-center text-sm flex-shrink-0">
              🐾
            </div>
            <div className="bg-white shadow-sm border border-gray-100 rounded-2xl rounded-bl-sm px-4 py-3">
              <div className="flex gap-1 items-center">
                <span className="w-1.5 h-1.5 rounded-full bg-orange-400 animate-bounce" style={{ animationDelay: '0ms' }} />
                <span className="w-1.5 h-1.5 rounded-full bg-orange-400 animate-bounce" style={{ animationDelay: '150ms' }} />
                <span className="w-1.5 h-1.5 rounded-full bg-orange-400 animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input area */}
      <div className="flex items-center gap-2 pt-3 border-t border-orange-100 mt-3 flex-shrink-0">
        <input
          ref={inputRef}
          type="text"
          value={inputValue}
          onChange={e => setInputValue(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={`和 ${petName} 说点什么...`}
          disabled={isLoading}
          className={`
            flex-1 px-3 py-2 rounded-xl border border-orange-200 bg-white
            text-sm text-gray-800 placeholder-gray-400
            focus:outline-none focus:ring-2 focus:ring-orange-300 focus:border-orange-400
            disabled:opacity-50 disabled:cursor-not-allowed
            transition-all duration-150
          `}
        />
        <button
          onClick={handleSend}
          disabled={!inputValue.trim() || isLoading}
          className={`
            w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0
            transition-all duration-200
            ${inputValue.trim() && !isLoading
              ? 'bg-orange-500 hover:bg-orange-600 text-white active:scale-95 shadow-sm'
              : 'bg-orange-200 text-white cursor-not-allowed'
            }
          `}
          aria-label="发送"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="currentColor"
            className="w-4 h-4"
          >
            <path d="M3.478 2.405a.75.75 0 00-.926.94l2.432 7.905H13.5a.75.75 0 010 1.5H4.984l-2.432 7.905a.75.75 0 00.926.94 60.519 60.519 0 0018.445-8.986.75.75 0 000-1.218A60.517 60.517 0 003.478 2.405z" />
          </svg>
        </button>
      </div>
    </div>
  );
}
