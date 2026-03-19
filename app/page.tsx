'use client';

import { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { ChatMessage, AnimationState } from '@/lib/types';
import { normalizeAndValidateApiKey } from '@/lib/apiKeys';
import PhotoUpload from '@/components/PhotoUpload';
import ChatInterface from '@/components/ChatInterface';
import ApiKeySetup from '@/components/ApiKeySetup';

const ModelViewer = dynamic(() => import('@/components/ModelViewer'), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center h-full">
      <svg className="animate-spin h-8 w-8 text-orange-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
      </svg>
    </div>
  ),
});

type AppStage = 'upload' | 'generating' | 'interactive';

async function parseApiError(response: Response) {
  const contentType = response.headers.get('content-type') || '';

  if (contentType.includes('application/json')) {
    const data = await response.json();
    return data?.error || '请求失败';
  }

  const text = await response.text();
  return text || '请求失败';
}

function toUserFacingError(error: unknown, fallback: string) {
  if (error instanceof TypeError && /failed to fetch/i.test(error.message)) {
    return `${fallback}：无法连接本地服务，请确认开发服务器正在运行并刷新页面后重试。`;
  }

  return error instanceof Error ? error.message : fallback;
}

export default function Home() {
  const [stage, setStage] = useState<AppStage>('upload');
  const [petName, setPetName] = useState('');
  const [modelUrl, setModelUrl] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [animationState, setAnimationState] = useState<AnimationState>('idle');
  const [isLoading, setIsLoading] = useState(false);
  const [apiKeys, setApiKeys] = useState<{ tripo: string; anthropic: string } | null>(null);

  useEffect(() => {
    const tripo = localStorage.getItem('tripo_api_key');
    const anthropic = localStorage.getItem('anthropic_api_key');
    if (!tripo || !anthropic) return;

    const normalizedTripo = normalizeAndValidateApiKey(tripo);
    const normalizedAnthropic = normalizeAndValidateApiKey(anthropic);

    if (normalizedTripo.ok && normalizedAnthropic.ok) {
      setApiKeys({ tripo: normalizedTripo.value, anthropic: normalizedAnthropic.value });
      localStorage.setItem('tripo_api_key', normalizedTripo.value);
      localStorage.setItem('anthropic_api_key', normalizedAnthropic.value);
      return;
    }

    localStorage.removeItem('tripo_api_key');
    localStorage.removeItem('anthropic_api_key');
  }, []);

  const handleKeysSaved = (tripoKey: string, anthropicKey: string) => {
    setApiKeys({ tripo: tripoKey, anthropic: anthropicKey });
  };

  const handleUpload = async (file: File, name: string) => {
    if (!apiKeys) return;
    setPetName(name);
    setStage('generating');
    const formData = new FormData();
    formData.append('image', file);
    formData.append('petName', name);
    try {
      const formApiKey = normalizeAndValidateApiKey(apiKeys.tripo);
      if (!formApiKey.ok) throw new Error(`Tripo3D ${formApiKey.error}`);
      formData.append('apiKey', formApiKey.value);

      const res = await fetch('/api/generate-model', {
        method: 'POST',
        body: formData,
      });
      if (!res.ok) {
        throw new Error(await parseApiError(res));
      }
      const data = await res.json();
      if (data.error) throw new Error(data.error || '请求失败');
      setModelUrl(data.modelUrl);
      setStage('interactive');
    } catch (err) {
      setStage('upload');
      alert(`生成失败：${toUserFacingError(err, '请重试')}`);
    }
  };

  const handleSendMessage = async (message: string) => {
    if (!apiKeys) return;
    setMessages(prev => [...prev, { role: 'user', content: message }]);
    setIsLoading(true);
    try {
      const chatApiKey = normalizeAndValidateApiKey(apiKeys.anthropic);
      if (!chatApiKey.ok) throw new Error(`Anthropic ${chatApiKey.error}`);

      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ message, petName, apiKey: chatApiKey.value }),
      });
      if (!res.ok) {
        throw new Error(await parseApiError(res));
      }
      const data = await res.json();
      if (data.error) throw new Error(data.error || '请求失败');
      setAnimationState(data.animationState);
      setMessages(prev => [...prev, { role: 'pet', content: data.reply, animationState: data.animationState }]);
    } catch (err) {
      alert(toUserFacingError(err, '发送消息失败，请重试'));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-gradient-to-b from-orange-50 to-pink-50">
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-2">
          <h1 className="text-3xl font-bold text-orange-600">🐾 我的宠物伙伴</h1>
          {apiKeys && (
            <button
              onClick={() => { localStorage.removeItem('tripo_api_key'); localStorage.removeItem('anthropic_api_key'); setApiKeys(null); }}
              className="text-xs text-gray-400 hover:text-gray-600"
            >
              重置 API Key
            </button>
          )}
        </div>
        <p className="text-center text-gray-500 mb-8">上传宠物照片，生成专属3D模型，与你的宠物互动</p>

        {!apiKeys ? (
          <ApiKeySetup onSave={handleKeysSaved} />
        ) : (
          <>
            {/* 步骤指示器 */}
            <div className="flex justify-center items-center gap-2 mb-10">
              {['上传照片', '生成3D模型', '开始互动'].map((step, i) => {
                const stageMap: AppStage[] = ['upload', 'generating', 'interactive'];
                const active = stageMap.indexOf(stage) >= i;
                return (
                  <div key={step} className="flex items-center gap-2">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${active ? 'bg-orange-500 text-white' : 'bg-gray-200 text-gray-400'}`}>{i + 1}</div>
                    <span className={`text-sm ${active ? 'text-orange-600 font-medium' : 'text-gray-400'}`}>{step}</span>
                    {i < 2 && <div className={`w-8 h-0.5 ${active ? 'bg-orange-300' : 'bg-gray-200'}`} />}
                  </div>
                );
              })}
            </div>

            {stage === 'upload' && (
              <div className="flex justify-center">
                <PhotoUpload onUpload={handleUpload} isLoading={isLoading} />
              </div>
            )}

            {stage === 'generating' && (
              <div className="text-center py-20">
                <div className="text-6xl mb-4 animate-bounce">🐾</div>
                <p className="text-xl text-orange-600 font-medium">正在为 {petName} 生成3D模型...</p>
                <p className="text-gray-400 mt-2">这可能需要1-2分钟，请耐心等待</p>
              </div>
            )}

            {stage === 'interactive' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-white rounded-2xl shadow-lg p-4 h-96">
                  <ModelViewer modelUrl={modelUrl} animationState={animationState} />
                </div>
                <div className="bg-white rounded-2xl shadow-lg p-4 h-96">
                  <ChatInterface
                    petName={petName}
                    onSendMessage={handleSendMessage}
                    messages={messages}
                    isLoading={isLoading}
                  />
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </main>
  );
}
