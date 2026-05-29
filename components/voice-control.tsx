'use client';

import * as React from 'react';
import { Button } from '@/components/ui/button';
import { Mic, MicOff, Volume2 } from 'lucide-react';
import { cn } from '@/lib/utils';

// ============================================================
// 语音控制组件
// 支持语音命令："今天吃什么"、"换一个"
// 用合成语音读出推荐结果
// ============================================================

interface VoiceControlProps {
  onCommand: (command: 'generate' | 'refresh') => void;
  speakText?: string;
  disabled?: boolean;
  className?: string;
}

// 检查浏览器是否支持语音 API
function isSpeechRecognitionSupported(): boolean {
  return typeof window !== 'undefined' && ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window);
}

function isSpeechSynthesisSupported(): boolean {
  return typeof window !== 'undefined' && 'speechSynthesis' in window;
}

export function VoiceControl({ onCommand, speakText, disabled, className }: VoiceControlProps) {
  const [isListening, setIsListening] = React.useState(false);
  const [isSpeaking, setIsSpeaking] = React.useState(false);
  const [supported, setSupported] = React.useState(false);
  const [lastCommand, setLastCommand] = React.useState('');
  const recognitionRef = React.useRef<any>(null);

  // 检查支持
  React.useEffect(() => {
    setSupported(isSpeechRecognitionSupported());
  }, []);

  // 语音合成
  const speak = React.useCallback((text: string) => {
    if (!isSpeechSynthesisSupported()) return;

    // 取消之前的语音
    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'zh-CN';
    utterance.rate = 1;
    utterance.pitch = 1;

    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);

    window.speechSynthesis.speak(utterance);
  }, []);

  // 当 speakText 变化时朗读
  React.useEffect(() => {
    if (speakText) {
      speak(speakText);
    }
  }, [speakText, speak]);

  // 开始/停止语音识别
  const toggleListening = React.useCallback(() => {
    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
      return;
    }

    if (!supported) {
      alert('您的浏览器不支持语音识别');
      return;
    }

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    const recognition = new SpeechRecognition();

    recognition.lang = 'zh-CN';
    recognition.continuous = false;
    recognition.interimResults = false;

    recognition.onstart = () => {
      setIsListening(true);
      setLastCommand('');
    };

    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript.toLowerCase();
      setLastCommand(transcript);

      // 解析命令
      if (transcript.includes('今天吃什么') || transcript.includes('推荐') || transcript.includes('吃什么')) {
        onCommand('generate');
        speak('好的，正在为您推荐');
      } else if (transcript.includes('换一个') || transcript.includes('换一个') || transcript.includes('再来一个')) {
        onCommand('refresh');
        speak('好的，换一个推荐');
      } else {
        speak('没有听清，请说"今天吃什么"或"换一个"');
      }
    };

    recognition.onerror = (event: any) => {
      console.error('Speech recognition error:', event.error);
      setIsListening(false);
      if (event.error === 'no-speech') {
        speak('没有听到您的声音，请再试一次');
      }
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    recognitionRef.current = recognition;
    recognition.start();
  }, [isListening, supported, onCommand, speak]);

  // 停止语音
  const stopSpeaking = React.useCallback(() => {
    window.speechSynthesis.cancel();
    setIsSpeaking(false);
  }, []);

  if (!supported) {
    return null;
  }

  return (
    <div className={cn('flex items-center gap-2', className)}>
      <Button
        variant={isListening ? 'default' : 'outline'}
        size="icon"
        onClick={toggleListening}
        disabled={disabled}
        className={cn(
          'h-10 w-10 shrink-0 transition-all',
          isListening && 'bg-red-500 hover:bg-red-600 animate-pulse',
        )}
        title={isListening ? '停止录音' : '语音命令'}
      >
        {isListening ? (
          <MicOff className="h-4 w-4" />
        ) : (
          <Mic className="h-4 w-4" />
        )}
      </Button>

      {isSpeaking && (
        <Button
          variant="outline"
          size="icon"
          onClick={stopSpeaking}
          className="h-10 w-10 shrink-0"
          title="停止朗读"
        >
          <Volume2 className="h-4 w-4 animate-pulse" />
        </Button>
      )}

      {lastCommand && (
        <span className="text-xs text-muted-foreground truncate max-w-[120px]">
          &ldquo;{lastCommand}&rdquo;
        </span>
      )}
    </div>
  );
}
