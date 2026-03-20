'use client';

import { getHistoryRigStatus } from '@/lib/history';
import { PetModelHistoryItem } from '@/lib/types';

interface HistoryPanelProps {
  items: PetModelHistoryItem[];
  onResume: (item: PetModelHistoryItem) => void;
  onDelete: (taskId: string) => void;
  isBusy: boolean;
}

function formatTime(value: string) {
  return new Intl.DateTimeFormat('zh-CN', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value));
}

function getRigStatusLabel(item: PetModelHistoryItem) {
  const status = getHistoryRigStatus(item);

  if (status === 'ready') {
    return '已绑骨可驱动';
  }

  if (status === 'rigging') {
    return '绑定进行中';
  }

  if (status === 'failed') {
    return '绑定失败';
  }

  if (status === 'unsupported') {
    return '暂不支持绑骨';
  }

  return '未绑骨';
}

function getRigStatusClassName(item: PetModelHistoryItem) {
  const status = getHistoryRigStatus(item);

  if (status === 'ready') {
    return 'bg-emerald-50 text-emerald-600';
  }

  if (status === 'rigging') {
    return 'bg-sky-50 text-sky-600';
  }

  if (status === 'failed' || status === 'unsupported') {
    return 'bg-rose-50 text-rose-600';
  }

  return 'bg-gray-50 text-gray-500';
}

export default function HistoryPanel({
  items,
  onResume,
  onDelete,
  isBusy,
}: HistoryPanelProps) {
  if (items.length === 0) {
    return null;
  }

  return (
    <section className="w-full max-w-4xl mt-10">
      <div className="flex items-end justify-between gap-4 mb-4">
        <div>
          <h2 className="text-lg font-semibold text-gray-800">历史模型</h2>
          <p className="text-sm text-gray-500 mt-1">之前生成过的宠物可以直接继续互动，不用重新生成。</p>
        </div>
        <span className="text-xs text-orange-500 bg-orange-50 px-3 py-1 rounded-full">
          共 {items.length} 只宠物
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {items.map((item) => (
          <div
            key={item.taskId}
            className="bg-white rounded-2xl shadow-sm border border-orange-100 p-4 flex flex-col gap-3"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-orange-100 to-pink-100 flex items-center justify-center text-xl flex-shrink-0">
                  🐾
                </div>
                <div className="min-w-0">
                  <p className="font-semibold text-gray-800 truncate">{item.petName}</p>
                  <p className="text-xs text-gray-400 mt-0.5">最近互动：{formatTime(item.updatedAt)}</p>
                </div>
              </div>
              <button
                onClick={() => onDelete(item.taskId)}
                disabled={isBusy}
                className="text-xs text-gray-400 hover:text-red-500 transition-colors disabled:opacity-50"
              >
                删除
              </button>
            </div>

            <div className="flex items-center gap-2 flex-wrap text-xs text-gray-500">
              <span className="bg-orange-50 text-orange-600 px-2.5 py-1 rounded-full">
                {item.messages.length} 条对话
              </span>
              <span className={`px-2.5 py-1 rounded-full ${getRigStatusClassName(item)}`}>
                {getRigStatusLabel(item)}
              </span>
              <span className="bg-gray-50 px-2.5 py-1 rounded-full">
                创建于 {formatTime(item.createdAt)}
              </span>
            </div>

            <button
              onClick={() => onResume(item)}
              disabled={isBusy}
              className="w-full rounded-xl bg-orange-500 hover:bg-orange-600 text-white font-medium py-2.5 transition-colors disabled:bg-orange-300"
            >
              {isBusy ? '恢复中...' : '继续互动'}
            </button>
          </div>
        ))}
      </div>
    </section>
  );
}
