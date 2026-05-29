'use client';

import * as React from 'react';
import { Button } from '@/components/ui/button';
import { Mic, MicOff, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

// ============================================================
// 浮动麦克风按钮 - 长按说话
// 录音后发送到 Whisper API 转文字并分析
// ============================================================

interface VoiceFeedbackButtonProps {
  currentRecommendation?: string;
  userId?: string;
  onFeedback: (feedback: {
    transcript: string;
    sentiment: 'positive' | 'negative' | 'neutral';
    suggestions: {
      spicyLevel?: number;
      preferredIngredients?: string[];
      dislikedIngredients?: string[];
      preferredDishes?: string[];
    };
    response: string;
  }) => void;
  disabled?: boolean;
}

export function VoiceFeedbackButton({
  currentRecommendation,
  userId,
  onFeedback,
  disabled,
}: VoiceFeedbackButtonProps) {
  const [isRecording, setIsRecording] = React.useState(false);
  const [isProcessing, setIsProcessing] = React.useState(false);
  const [lastResponse, setLastResponse] = React.useState<string | null>(null);
  const mediaRecorderRef = React.useRef<MediaRecorder | null>(null);
  const chunksRef = React.useRef<Blob[]>([]);
  const responseTimeoutRef = React.useRef<NodeJS.Timeout>();

  // 开始录音
  const startRecording = React.useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'audio/webm;codecs=opus',
      });

      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunksRef.current.push(e.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
        stream.getTracks().forEach(track => track.stop());
        await processAudio(blob);
      };

      mediaRecorder.start();
      setIsRecording(true);
      setLastResponse(null);
    } catch (err) {
      console.error('Failed to start recording:', err);
      alert('无法访问麦克风，请检查权限设置');
    }
  }, []);

  // 停止录音
  const stopRecording = React.useCallback(() => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  }, [isRecording]);

  // 处理音频
  const processAudio = React.useCallback(async (audioBlob: Blob) => {
    setIsProcessing(true);

    try {
      const formData = new FormData();
      formData.append('audio', audioBlob, 'recording.webm');
      formData.append('recommendation', currentRecommendation || '');
      formData.append('userId', userId || '');

      const res = await fetch('/api/voice-feedback', {
        method: 'POST',
        body: formData,
      });

      if (!res.ok) {
        throw new Error('Voice feedback failed');
      }

      const data = await res.json();

      if (data.success) {
        setLastResponse(data.analysis.response);
        onFeedback({
          transcript: data.transcript,
          sentiment: data.analysis.sentiment,
          suggestions: data.analysis.suggestions,
          response: data.analysis.response,
        });

        // 3秒后清除回复
        if (responseTimeoutRef.current) {
          clearTimeout(responseTimeoutRef.current);
        }
        responseTimeoutRef.current = setTimeout(() => {
          setLastResponse(null);
        }, 3000);
      }
    } catch (err) {
      console.error('Voice feedback error:', err);
      setLastResponse('处理失败，请重试');
    } finally {
      setIsProcessing(false);
    }
  }, [currentRecommendation, userId, onFeedback]);

  // 清理定时器
  React.useEffect(() => {
    return () => {
      if (responseTimeoutRef.current) {
        clearTimeout(responseTimeoutRef.current);
      }
    };
  }, []);

  // 鼠标/触摸事件处理
  const handleMouseDown = React.useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    if (!disabled && !isProcessing) {
      startRecording();
    }
  }, [disabled, isProcessing, startRecording, processAudio]);

  const handleMouseUp = React.useCallback(() => {
    if (isRecording) {
      stopRecording();
    }
  }, [isRecording, stopRecording]);

  // 触摸事件
  const handleTouchStart = React.useCallback((e: React.TouchEvent) => {
    e.preventDefault();
    if (!disabled && !isProcessing) {
      startRecording();
    }
  }, [disabled, isProcessing, startRecording]);

  const handleTouchEnd = React.useCallback(() => {
    if (isRecording) {
      stopRecording();
    }
  }, [isRecording, stopRecording]);

  return (
    <div className="fixed bottom-24 right-4 z-50 flex flex-col items-end gap-2">
      {/* 回复气泡 */}
      {lastResponse && (
        <div className="bg-white rounded-lg shadow-lg p-3 max-w-[200px] animate-in fade-in slide-in-from-bottom-2">
          <p className="text-sm text-gray-700">{lastResponse}</p>
        </div>
      )}

      {/* 录音状态提示 */}
      {isRecording && (
        <div className="bg-red-50 text-red-600 text-xs px-2 py-1 rounded-full animate-pulse">
          录音中...松开结束
        </div>
      )}

      {/* 浮动按钮 */}
      <Button
        onMouseDown={handleMouseDown}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        disabled={disabled}
        className={cn(
          'h-14 w-14 rounded-full shadow-lg transition-all',
          isRecording
            ? 'bg-red-500 hover:bg-red-600 scale-110'
            : 'bg-gradient-to-br from-purple-500 to-indigo-600 hover:from-purple-600 hover:to-indigo-700',
          isProcessing && 'opacity-75 cursor-wait',
        )}
      >
        {isProcessing ? (
          <Loader2 className="h-6 w-6 animate-spin text-white" />
        ) : isRecording ? (
          <MicOff className="h-6 w-6 text-white" />
        ) : (
          <Mic className="h-6 w-6 text-white" />
        )}
      </Button>

      {/* 使用提示 */}
      {!isRecording && !isProcessing && !lastResponse && (
        <p className="text-[10px] text-muted-foreground text-right max-w-[100px]">
          长按说话
        </p>
      )}
    </div>
  );
}
