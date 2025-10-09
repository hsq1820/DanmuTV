'use client';

import { useEffect, useState } from 'react';
import { X, CheckCircle, AlertCircle, Info } from 'lucide-react';

interface ToastMessage {
  id: number;
  message: string;
  type: 'success' | 'info' | 'warning' | 'error';
  duration?: number;
}

let toastQueue: ToastMessage[] = [];
let toastListeners: Array<(messages: ToastMessage[]) => void> = [];
let toastIdCounter = 0;

// 全局方法：显示 Toast
export function showToast(
  message: string,
  type: 'success' | 'info' | 'warning' | 'error' = 'info',
  duration: number = 5000
) {
  const toast: ToastMessage = {
    id: toastIdCounter++,
    message,
    type,
    duration,
  };

  toastQueue = [...toastQueue, toast];
  toastListeners.forEach((listener) => listener(toastQueue));

  // 自动移除
  if (duration > 0) {
    setTimeout(() => {
      removeToast(toast.id);
    }, duration);
  }
}

function removeToast(id: number) {
  toastQueue = toastQueue.filter((t) => t.id !== id);
  toastListeners.forEach((listener) => listener(toastQueue));
}

export default function GlobalToast() {
  const [messages, setMessages] = useState<ToastMessage[]>([]);

  useEffect(() => {
    const listener = (newMessages: ToastMessage[]) => {
      setMessages(newMessages);
    };

    toastListeners.push(listener);

    return () => {
      toastListeners = toastListeners.filter((l) => l !== listener);
    };
  }, []);

  const getIcon = (type: ToastMessage['type']) => {
    switch (type) {
      case 'success':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'error':
        return <AlertCircle className="w-5 h-5 text-red-500" />;
      case 'warning':
        return <AlertCircle className="w-5 h-5 text-yellow-500" />;
      default:
        return <Info className="w-5 h-5 text-blue-500" />;
    }
  };

  const getBgColor = (type: ToastMessage['type']) => {
    switch (type) {
      case 'success':
        return 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800';
      case 'error':
        return 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800';
      case 'warning':
        return 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800';
      default:
        return 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800';
    }
  };

  if (messages.length === 0) return null;

  return (
    <div className="fixed top-4 right-4 z-[9999] flex flex-col gap-2 max-w-md pointer-events-none">
      {messages.map((toast) => (
        <div
          key={toast.id}
          className={`
            flex items-start gap-3 p-4 rounded-lg border shadow-lg
            ${getBgColor(toast.type)}
            transition-all duration-300 ease-in-out
            animate-[slideIn_0.3s_ease-out]
            pointer-events-auto
          `}
          style={{
            animation: 'slideIn 0.3s ease-out'
          }}
        >
          <div className="flex-shrink-0 mt-0.5">
            {getIcon(toast.type)}
          </div>
          <div className="flex-1 text-sm text-gray-800 dark:text-gray-200 leading-relaxed">
            {toast.message}
          </div>
          <button
            onClick={() => removeToast(toast.id)}
            className="flex-shrink-0 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
            aria-label="关闭"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      ))}
      <style jsx>{`
        @keyframes slideIn {
          from {
            transform: translateX(100%);
            opacity: 0;
          }
          to {
            transform: translateX(0);
            opacity: 1;
          }
        }
      `}</style>
    </div>
  );
}
