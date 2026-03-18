'use client';

import { useState } from 'react';

interface ApiKeySetupProps {
  onSave: (tripoKey: string, anthropicKey: string) => void;
}

export default function ApiKeySetup({ onSave }: ApiKeySetupProps) {
  const [tripoKey, setTripoKey] = useState('');
  const [anthropicKey, setAnthropicKey] = useState('');
  const [showTripo, setShowTripo] = useState(false);
  const [showAnthropic, setShowAnthropic] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!tripoKey.trim() || !anthropicKey.trim()) return;
    localStorage.setItem('tripo_api_key', tripoKey.trim());
    localStorage.setItem('anthropic_api_key', anthropicKey.trim());
    onSave(tripoKey.trim(), anthropicKey.trim());
  };

  return (
    <div className="flex justify-center items-center min-h-[60vh]">
      <div className="bg-white rounded-2xl shadow-lg p-8 w-full max-w-md">
        <div className="text-center mb-6">
          <div className="text-4xl mb-2">🔑</div>
          <h2 className="text-xl font-bold text-gray-800">配置 API Key</h2>
          <p className="text-sm text-gray-500 mt-1">Key 仅保存在你的浏览器本地，不会上传到服务器</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Tripo3D API Key
              <a href="https://platform.tripo3d.ai" target="_blank" rel="noopener noreferrer" className="ml-2 text-orange-500 text-xs hover:underline">获取 →</a>
            </label>
            <div className="relative">
              <input
                type={showTripo ? 'text' : 'password'}
                value={tripoKey}
                onChange={e => setTripoKey(e.target.value)}
                placeholder="tcli_..."
                className="w-full border border-gray-300 rounded-lg px-3 py-2 pr-10 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
              />
              <button type="button" onClick={() => setShowTripo(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 text-xs">
                {showTripo ? '隐藏' : '显示'}
              </button>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Anthropic API Key
              <a href="https://console.anthropic.com" target="_blank" rel="noopener noreferrer" className="ml-2 text-orange-500 text-xs hover:underline">获取 →</a>
            </label>
            <div className="relative">
              <input
                type={showAnthropic ? 'text' : 'password'}
                value={anthropicKey}
                onChange={e => setAnthropicKey(e.target.value)}
                placeholder="sk-ant-..."
                className="w-full border border-gray-300 rounded-lg px-3 py-2 pr-10 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
              />
              <button type="button" onClick={() => setShowAnthropic(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 text-xs">
                {showAnthropic ? '隐藏' : '显示'}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={!tripoKey.trim() || !anthropicKey.trim()}
            className="w-full bg-orange-500 hover:bg-orange-600 disabled:bg-gray-300 text-white font-medium py-2 rounded-lg transition-colors"
          >
            开始使用
          </button>
        </form>
      </div>
    </div>
  );
}
