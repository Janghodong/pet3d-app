'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import dynamic from 'next/dynamic';
import {
  AnimationState,
  AnimationVariant,
  ChatMessage,
  PetModelHistoryItem,
  RigPreparationStatus,
  TripoRigType,
} from '@/lib/types';
import { normalizeAndValidateApiKey } from '@/lib/apiKeys';
import {
  getHistoryRigStatus,
  hasRiggedAsset,
  MODEL_HISTORY_STORAGE_KEY,
  parseHistoryItems,
  removeHistoryItem,
  upsertHistoryItem,
} from '@/lib/history';
import { getAnimationPresetsForState } from '@/lib/tripoAnimation';
import PhotoUpload from '@/components/PhotoUpload';
import ChatInterface from '@/components/ChatInterface';
import ApiKeySetup from '@/components/ApiKeySetup';
import HistoryPanel from '@/components/HistoryPanel';

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
  const [activeTaskId, setActiveTaskId] = useState('');
  const [petName, setPetName] = useState('');
  const [baseModelUrl, setBaseModelUrl] = useState('');
  const [modelUrl, setModelUrl] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [animationState, setAnimationState] = useState<AnimationState>('idle');
  const [rigStatus, setRigStatus] = useState<RigPreparationStatus>('idle');
  const [rigType, setRigType] = useState<TripoRigType | undefined>();
  const [rigCheckTaskId, setRigCheckTaskId] = useState('');
  const [rigTaskId, setRigTaskId] = useState('');
  const [riggedTaskId, setRiggedTaskId] = useState('');
  const [riggedModelUrl, setRiggedModelUrl] = useState('');
  const [animationVariants, setAnimationVariants] = useState<Partial<Record<AnimationState, AnimationVariant>>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [isRestoringHistory, setIsRestoringHistory] = useState(false);
  const [apiKeys, setApiKeys] = useState<{ tripo: string; anthropic: string } | null>(null);
  const [historyItems, setHistoryItems] = useState<PetModelHistoryItem[]>([]);
  const rigStatusRef = useRef(rigStatus);
  const rigTypeRef = useRef(rigType);
  const rigTaskIdRef = useRef(rigTaskId);

  const handleKeysSaved = (tripoKey: string, anthropicKey: string) => {
    setApiKeys({ tripo: tripoKey, anthropic: anthropicKey });
  };

  useEffect(() => {
    rigStatusRef.current = rigStatus;
  }, [rigStatus]);

  useEffect(() => {
    rigTypeRef.current = rigType;
  }, [rigType]);

  useEffect(() => {
    rigTaskIdRef.current = rigTaskId;
  }, [rigTaskId]);

  const resetAnimationPipeline = () => {
    setRigStatus('idle');
    setRigType(undefined);
    setRigCheckTaskId('');
    setRigTaskId('');
    setRiggedTaskId('');
    setRiggedModelUrl('');
    setAnimationVariants({});
  };

  const resolveLatestTaskModelUrl = useCallback(async (taskId: string, fallbackUrl = '') => {
    if (!apiKeys) {
      return fallbackUrl;
    }

    const res = await fetch('/api/model-session', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ taskId, apiKey: apiKeys.tripo }),
    });

    if (!res.ok) {
      throw new Error(await parseApiError(res));
    }

    const data = await res.json();
    return data.modelUrl || fallbackUrl;
  }, [apiKeys]);

  const startAnimationVariantTask = useCallback(async (state: AnimationState, presetIndex = 0) => {
    if (!apiKeys || !riggedTaskId) return;

    const presets = getAnimationPresetsForState(state, rigType);
    const preset = presets[presetIndex];

    if (!preset) {
      setAnimationVariants((prev) => ({
        ...prev,
        [state]: {
          ...(prev[state] || { updatedAt: new Date().toISOString() }),
          status: 'failed',
          presetIndex,
          updatedAt: new Date().toISOString(),
        },
      }));
      return;
    }

    const res = await fetch('/api/retarget-animation', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ taskId: riggedTaskId, apiKey: apiKeys.tripo, preset }),
    });

    if (!res.ok) {
      throw new Error(await parseApiError(res));
    }

    const data = await res.json();
    setAnimationVariants((prev) => ({
      ...prev,
      [state]: {
        taskId: data.taskId,
        status: 'queued',
        preset,
        presetIndex,
        updatedAt: new Date().toISOString(),
      },
    }));
  }, [apiKeys, rigType, riggedTaskId]);

  useEffect(() => {
    setHistoryItems(parseHistoryItems(localStorage.getItem(MODEL_HISTORY_STORAGE_KEY)));

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

  useEffect(() => {
    localStorage.setItem(MODEL_HISTORY_STORAGE_KEY, JSON.stringify(historyItems));
  }, [historyItems]);

  useEffect(() => {
    if (stage !== 'interactive' || !activeTaskId || !petName || !modelUrl) {
      return;
    }

    setHistoryItems((prev) => upsertHistoryItem(prev, {
      taskId: activeTaskId,
      petName,
      modelUrl: riggedModelUrl || baseModelUrl || modelUrl,
      messages,
      animationState,
      rigStatus,
      rigType,
      rigCheckTaskId,
      rigTaskId,
      riggedTaskId,
      riggedModelUrl,
      animationVariants,
    }));
  }, [
    activeTaskId,
    animationState,
    animationVariants,
    baseModelUrl,
    messages,
    modelUrl,
    petName,
    rigCheckTaskId,
    rigStatus,
    rigTaskId,
    rigType,
    riggedModelUrl,
    riggedTaskId,
    stage,
  ]);

  useEffect(() => {
    if (stage !== 'generating' || !activeTaskId || !apiKeys) {
      return;
    }

    let cancelled = false;
    let timeoutId: ReturnType<typeof setTimeout> | undefined;

    const pollTaskStatus = async () => {
      try {
        const res = await fetch('/api/model-status', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ taskId: activeTaskId, apiKey: apiKeys.tripo }),
        });

        if (!res.ok) {
          throw new Error(await parseApiError(res));
        }

        const data = await res.json();
        if (cancelled) return;

        if (data.status === 'success' && data.modelUrl) {
          setBaseModelUrl(data.modelUrl);
          setModelUrl(data.modelUrl);
          setAnimationState('idle');
          setMessages([]);
          resetAnimationPipeline();
          setStage('interactive');
          return;
        }

        if (data.status === 'failed' || data.status === 'cancelled') {
          setStage('upload');
          setActiveTaskId('');
          alert(`生成失败：任务状态为 ${data.status}`);
          return;
        }

        timeoutId = setTimeout(pollTaskStatus, 5000);
      } catch (error) {
        if (cancelled) return;
        timeoutId = setTimeout(pollTaskStatus, 5000);
        console.error('Error polling model status:', error);
      }
    };

    pollTaskStatus();

    return () => {
      cancelled = true;
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    };
  }, [activeTaskId, apiKeys, stage]);

  useEffect(() => {
    if (
      stage !== 'interactive' ||
      !activeTaskId ||
      !apiKeys ||
      riggedTaskId ||
      rigStatusRef.current === 'failed' ||
      rigStatusRef.current === 'unsupported'
    ) {
      return;
    }

    let cancelled = false;

    const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

    const fetchTaskStatus = async (taskId: string) => {
      const res = await fetch('/api/model-status', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ taskId, apiKey: apiKeys.tripo }),
      });

      if (!res.ok) {
        throw new Error(await parseApiError(res));
      }

      return res.json();
    };

    const pollUntilFinished = async (taskId: string, intervalMs: number) => {
      while (!cancelled) {
        const data = await fetchTaskStatus(taskId);

        if (data.status === 'success' || data.status === 'failed' || data.status === 'cancelled') {
          return data;
        }

        await sleep(intervalMs);
      }

      return null;
    };

    const prepareRiggedModel = async () => {
      try {
        const nextRigType = rigTypeRef.current || 'quadruped';
        let nextRigTaskId = rigTaskIdRef.current;

        setRigStatus('rigging');
        setRigType(nextRigType);

        if (!nextRigTaskId) {
          const rigRes = await fetch('/api/rig-model', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ taskId: activeTaskId, apiKey: apiKeys.tripo, rigType: nextRigType }),
          });

          if (!rigRes.ok) {
            throw new Error(await parseApiError(rigRes));
          }

          const rigData = await rigRes.json();
          if (cancelled) return;

          nextRigTaskId = rigData.taskId;
          setRigCheckTaskId('');
          setRigTaskId(rigData.taskId);
        }

        const rigResult = await pollUntilFinished(nextRigTaskId, 4000);
        if (cancelled || !rigResult) return;

        if (rigResult.status === 'failed' || rigResult.status === 'cancelled' || !rigResult.modelUrl) {
          setRigStatus('failed');
          return;
        }

        setRigTaskId(nextRigTaskId);
        setRiggedTaskId(nextRigTaskId);
        setRiggedModelUrl(rigResult.modelUrl);
        setModelUrl(rigResult.modelUrl);
        setRigStatus('ready');
      } catch (error) {
        if (!cancelled) {
          console.error('Error preparing rigged model:', error);
          setRigStatus('failed');
        }
      }
    };

    prepareRiggedModel();

    return () => {
      cancelled = true;
    };
  }, [activeTaskId, apiKeys, riggedTaskId, stage]);

  useEffect(() => {
    const hasPetReply = messages.some((message) => message.role === 'pet');
    if (!hasPetReply || rigStatus !== 'ready') {
      return;
    }

    const currentVariant = animationVariants[animationState];
    let cancelled = false;

    const syncDisplayModel = async () => {
      if (currentVariant?.status === 'ready') {
        if (!currentVariant.taskId) {
          if (currentVariant.modelUrl) {
            setModelUrl(currentVariant.modelUrl);
          }
          return;
        }

        try {
          const freshVariantUrl = await resolveLatestTaskModelUrl(
            currentVariant.taskId,
            currentVariant.modelUrl || ''
          );
          if (cancelled || !freshVariantUrl) return;

          setAnimationVariants((prev) => ({
            ...prev,
            [animationState]: {
              ...prev[animationState],
              modelUrl: freshVariantUrl,
              updatedAt: new Date().toISOString(),
            },
          }));
          setModelUrl(freshVariantUrl);
          return;
        } catch (error) {
          if (!cancelled) {
            console.error('Error refreshing animation variant URL:', error);
          }
        }
      }

      if (riggedTaskId) {
        try {
          const freshRiggedUrl = await resolveLatestTaskModelUrl(riggedTaskId, riggedModelUrl || baseModelUrl);
          if (cancelled || !freshRiggedUrl) return;

          setRiggedModelUrl(freshRiggedUrl);
          setModelUrl(freshRiggedUrl);
          return;
        } catch (error) {
          if (!cancelled) {
            console.error('Error refreshing rigged model URL:', error);
          }
        }
      }

      if (!cancelled) {
        setModelUrl(riggedModelUrl || baseModelUrl);
      }
    };

    void syncDisplayModel();

    if (!currentVariant || currentVariant.status === 'idle' || currentVariant.status === 'failed') {
      startAnimationVariantTask(animationState, currentVariant?.presetIndex ?? 0).catch((error) => {
        console.error('Error starting animation variant:', error);
      });
    }

    return () => {
      cancelled = true;
    };
  }, [
    animationState,
    animationVariants,
    baseModelUrl,
    messages,
    rigStatus,
    riggedModelUrl,
    riggedTaskId,
    resolveLatestTaskModelUrl,
    startAnimationVariantTask,
  ]);

  useEffect(() => {
    const pendingStates = Object.entries(animationVariants).filter(([, variant]) => (
      variant?.taskId && (variant.status === 'queued' || variant.status === 'running')
    )) as Array<[AnimationState, AnimationVariant]>;

    if (pendingStates.length === 0 || !apiKeys) {
      return;
    }

    let cancelled = false;
    const timeoutId = setTimeout(async () => {
      for (const [state, variant] of pendingStates) {
        try {
          const res = await fetch('/api/model-status', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ taskId: variant.taskId, apiKey: apiKeys.tripo }),
          });

          if (!res.ok) {
            throw new Error(await parseApiError(res));
          }

          const data = await res.json();
          if (cancelled) return;

          if (data.status === 'success' && data.modelUrl) {
            setAnimationVariants((prev) => ({
              ...prev,
              [state]: {
                ...prev[state],
                status: 'ready',
                modelUrl: data.modelUrl,
                updatedAt: new Date().toISOString(),
              },
            }));

            if (state === animationState) {
              setModelUrl(data.modelUrl);
            }

            continue;
          }

          if (data.status === 'failed' || data.status === 'cancelled') {
            const nextPresetIndex = (variant.presetIndex ?? 0) + 1;
            const presets = getAnimationPresetsForState(state, rigType);

            if (nextPresetIndex < presets.length) {
              await startAnimationVariantTask(state, nextPresetIndex);
              continue;
            }

            setAnimationVariants((prev) => ({
              ...prev,
              [state]: {
                ...prev[state],
                status: 'failed',
                updatedAt: new Date().toISOString(),
              },
            }));
          } else {
            setAnimationVariants((prev) => ({
              ...prev,
              [state]: {
                ...prev[state],
                status: data.status === 'running' ? 'running' : 'queued',
                updatedAt: new Date().toISOString(),
              },
            }));
          }
        } catch (error) {
          if (!cancelled) {
            console.error('Error polling animation variant:', error);
          }
        }
      }
    }, 4000);

    return () => {
      cancelled = true;
      clearTimeout(timeoutId);
    };
  }, [animationState, animationVariants, apiKeys, rigType, startAnimationVariantTask]);

  const handleUpload = async (file: File, name: string) => {
    if (!apiKeys) return;
    setActiveTaskId('');
    setPetName(name);
    setBaseModelUrl('');
    setModelUrl('');
    resetAnimationPipeline();
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
      setActiveTaskId(data.taskId);
      setMessages([]);
      setAnimationState('idle');
      setStage('generating');
    } catch (err) {
      setActiveTaskId('');
      setStage('upload');
      alert(`生成失败：${toUserFacingError(err, '请重试')}`);
    }
  };

  const handleResumeHistory = async (item: PetModelHistoryItem) => {
    if (!apiKeys) return;

    setIsRestoringHistory(true);
    try {
      const baseSessionRes = await fetch('/api/model-session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ taskId: item.taskId, apiKey: apiKeys.tripo }),
      });

      if (!baseSessionRes.ok) {
        throw new Error(await parseApiError(baseSessionRes));
      }

      const baseSessionData = await baseSessionRes.json();
      let nextRigTaskId = item.rigTaskId || '';
      let nextRiggedTaskId = '';
      let nextRiggedModelUrl = '';
      let nextRigStatus = getHistoryRigStatus(item);
      let nextRigType = item.rigType;

      if (hasRiggedAsset(item)) {
        const riggedSessionRes = await fetch('/api/model-session', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ taskId: item.riggedTaskId, apiKey: apiKeys.tripo }),
        });

        if (riggedSessionRes.ok) {
          const riggedSessionData = await riggedSessionRes.json();
          nextRiggedTaskId = item.riggedTaskId || '';
          nextRiggedModelUrl = riggedSessionData.modelUrl || '';
          nextRigTaskId = item.rigTaskId || item.riggedTaskId || '';
          nextRigStatus = nextRiggedModelUrl ? 'ready' : 'idle';
        } else {
          nextRigStatus = 'idle';
        }
      } else if (item.rigTaskId) {
        const rigStatusRes = await fetch('/api/model-status', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ taskId: item.rigTaskId, apiKey: apiKeys.tripo }),
        });

        if (rigStatusRes.ok) {
          const rigStatusData = await rigStatusRes.json();

          if (rigStatusData.status === 'success' && rigStatusData.modelUrl) {
            nextRiggedTaskId = item.rigTaskId;
            nextRiggedModelUrl = rigStatusData.modelUrl;
            nextRigStatus = 'ready';
            nextRigTaskId = item.rigTaskId;
            nextRigType = item.rigType;
          } else if (rigStatusData.status === 'failed' || rigStatusData.status === 'cancelled') {
            nextRigTaskId = '';
            nextRigStatus = 'failed';
          } else {
            nextRigStatus = 'rigging';
          }
        } else {
          nextRigTaskId = '';
          nextRigStatus = 'idle';
        }
      } else {
        nextRigStatus = 'idle';
      }

      setActiveTaskId(item.taskId);
      setPetName(item.petName);
      setBaseModelUrl(baseSessionData.modelUrl || item.modelUrl);
      setModelUrl(nextRiggedModelUrl || baseSessionData.modelUrl || item.modelUrl);
      setMessages(item.messages);
      setAnimationState(item.animationState || 'idle');
      setRigStatus(nextRigStatus);
      setRigType(nextRigType);
      setRigCheckTaskId('');
      setRigTaskId(nextRigTaskId);
      setRiggedTaskId(nextRiggedTaskId);
      setRiggedModelUrl(nextRiggedModelUrl);
      setAnimationVariants(nextRigStatus === 'ready' ? (item.animationVariants || {}) : {});
      setStage('interactive');
      setHistoryItems((prev) => upsertHistoryItem(prev, {
        taskId: item.taskId,
        petName: item.petName,
        modelUrl: nextRiggedModelUrl || baseSessionData.modelUrl || item.modelUrl,
        messages: item.messages,
        animationState: item.animationState,
        rigStatus: nextRigStatus,
        rigType: nextRigType,
        rigCheckTaskId: '',
        rigTaskId: nextRigTaskId,
        riggedTaskId: nextRiggedTaskId || undefined,
        riggedModelUrl: nextRiggedModelUrl || undefined,
        animationVariants: nextRigStatus === 'ready' ? item.animationVariants : {},
      }));
    } catch (error) {
      alert(`恢复失败：${toUserFacingError(error, '请重试')}`);
    } finally {
      setIsRestoringHistory(false);
    }
  };

  const handleDeleteHistory = (taskId: string) => {
    setHistoryItems((prev) => removeHistoryItem(prev, taskId));

    if (taskId === activeTaskId) {
      setActiveTaskId('');
      setPetName('');
      setBaseModelUrl('');
      setModelUrl('');
      setMessages([]);
      setAnimationState('idle');
      resetAnimationPipeline();
      setStage('upload');
    }
  };

  const handleSendMessage = async (message: string) => {
    if (!apiKeys) return;
    const nextUserMessage = { role: 'user' as const, content: message };
    setMessages(prev => [...prev, nextUserMessage]);
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
          <div className="flex items-center gap-3">
            {stage === 'interactive' && (
              <button
                onClick={() => setStage('upload')}
                className="text-xs text-orange-500 hover:text-orange-600"
              >
                返回模型库
              </button>
            )}
            {apiKeys && (
              <button
                onClick={() => { localStorage.removeItem('tripo_api_key'); localStorage.removeItem('anthropic_api_key'); setApiKeys(null); }}
                className="text-xs text-gray-400 hover:text-gray-600"
              >
                重置 API Key
              </button>
            )}
          </div>
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
              <>
                <div className="flex justify-center">
                  <PhotoUpload onUpload={handleUpload} isLoading={isLoading || isRestoringHistory} />
                </div>
                <div className="flex justify-center">
                  <HistoryPanel
                    items={historyItems}
                    onResume={handleResumeHistory}
                    onDelete={handleDeleteHistory}
                    isBusy={isLoading || isRestoringHistory}
                  />
                </div>
              </>
            )}

            {stage === 'generating' && (
              <div className="text-center py-20">
                <div className="text-6xl mb-4 animate-bounce">🐾</div>
                <p className="text-xl text-orange-600 font-medium">正在为 {petName} 生成3D模型...</p>
                <p className="text-gray-400 mt-2">模型任务已经提交，我们会自动轮询进度并在完成后进入互动</p>
              </div>
            )}

            {stage === 'interactive' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-white rounded-2xl shadow-lg p-4 h-96 flex flex-col gap-3">
                  <div className="text-xs text-gray-500">
                    {rigStatus === 'checking' && '正在准备骨骼绑定任务...'}
                    {rigStatus === 'rigging' && '正在绑定骨骼，完成后会开始缓存真实动作...'}
                    {rigStatus === 'ready' && '骨骼动画已启用，会按回复内容匹配真实动作。'}
                    {rigStatus === 'unsupported' && '这个模型暂时无法自动绑定骨骼，只能静态展示。'}
                    {rigStatus === 'failed' && '骨骼绑定失败，当前模型将以静态方式展示。'}
                  </div>
                  <div className="flex-1 min-h-0">
                    <ModelViewer modelUrl={modelUrl} animationState={animationState} />
                  </div>
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
