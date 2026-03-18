'use client';

import { useState, useRef, DragEvent, ChangeEvent } from 'react';

interface PhotoUploadProps {
  onUpload: (file: File, petName: string) => void;
  isLoading: boolean;
}

export default function PhotoUpload({ onUpload, isLoading }: PhotoUploadProps) {
  const [preview, setPreview] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [petName, setPetName] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const ACCEPTED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
  const MAX_SIZE = 10 * 1024 * 1024; // 10MB

  const validateAndSetFile = (file: File) => {
    setError(null);
    if (!ACCEPTED_TYPES.includes(file.type)) {
      setError('仅支持 JPG、PNG、WebP 格式的图片');
      return;
    }
    if (file.size > MAX_SIZE) {
      setError('图片大小不能超过 10MB');
      return;
    }
    setSelectedFile(file);
    const reader = new FileReader();
    reader.onloadend = () => setPreview(reader.result as string);
    reader.readAsDataURL(file);
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) validateAndSetFile(file);
  };

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => setIsDragging(false);

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) validateAndSetFile(file);
  };

  const handleSubmit = () => {
    if (!selectedFile || !petName.trim()) return;
    onUpload(selectedFile, petName.trim());
  };

  const canSubmit = selectedFile && petName.trim() && !isLoading;

  return (
    <div className="w-full max-w-md space-y-5">
      {/* Drop Zone */}
      <div
        onClick={() => !isLoading && inputRef.current?.click()}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        className={`
          relative cursor-pointer rounded-2xl border-2 border-dashed transition-all duration-200
          flex flex-col items-center justify-center p-8 min-h-[220px]
          ${isDragging
            ? 'border-orange-400 bg-orange-50 scale-[1.01]'
            : 'border-orange-300 bg-orange-50/50 hover:border-orange-400 hover:bg-orange-50'
          }
          ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}
        `}
      >
        <input
          ref={inputRef}
          type="file"
          accept=".jpg,.jpeg,.png,.webp"
          className="hidden"
          onChange={handleFileChange}
          disabled={isLoading}
        />

        {preview ? (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={preview}
              alt="预览"
              className="max-h-40 max-w-full rounded-xl object-contain shadow-md"
            />
            <p className="mt-3 text-sm text-orange-500 font-medium">
              {selectedFile?.name}
            </p>
            <p className="text-xs text-gray-400 mt-1">点击或拖拽以更换图片</p>
          </>
        ) : (
          <>
            <div className="text-5xl mb-3">📷</div>
            <p className="text-orange-600 font-semibold text-base">
              拖拽照片到这里，或点击上传
            </p>
            <p className="text-gray-400 text-sm mt-1">支持 JPG、PNG、WebP，最大 10MB</p>
          </>
        )}
      </div>

      {/* Error message */}
      {error && (
        <p className="text-red-500 text-sm text-center bg-red-50 rounded-lg py-2 px-3">
          {error}
        </p>
      )}

      {/* Pet Name Input */}
      <div className="space-y-1">
        <label className="block text-sm font-medium text-gray-700">
          宠物名字 <span className="text-orange-500">*</span>
        </label>
        <input
          type="text"
          value={petName}
          onChange={e => setPetName(e.target.value)}
          placeholder="给你的宠物起个名字吧"
          disabled={isLoading}
          className={`
            w-full px-4 py-2.5 rounded-xl border border-orange-200 bg-white
            text-gray-800 placeholder-gray-400
            focus:outline-none focus:ring-2 focus:ring-orange-300 focus:border-orange-400
            disabled:opacity-50 disabled:cursor-not-allowed
            transition-all duration-150
          `}
        />
      </div>

      {/* Submit Button */}
      <button
        onClick={handleSubmit}
        disabled={!canSubmit}
        className={`
          w-full py-3 rounded-xl font-semibold text-white text-base
          flex items-center justify-center gap-2
          transition-all duration-200
          ${canSubmit
            ? 'bg-orange-500 hover:bg-orange-600 active:scale-[0.98] shadow-md hover:shadow-orange-200'
            : 'bg-orange-300 cursor-not-allowed'
          }
        `}
      >
        {isLoading ? (
          <>
            <svg
              className="animate-spin h-5 w-5 text-white"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
            </svg>
            正在生成中...
          </>
        ) : (
          <>
            <span>✨</span>
            生成3D模型
          </>
        )}
      </button>
    </div>
  );
}
