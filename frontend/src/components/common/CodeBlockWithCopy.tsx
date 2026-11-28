import React, { useEffect, useRef, useState } from 'react';
import { Check, Code2, Copy } from 'lucide-react';
import { az } from '@/i18n/az';

export interface CodeBlockWithCopyProps {
  code: string;
  language?: string;
  title?: string;
  className?: string;
  showLineNumbers?: boolean;
}

export const CodeBlockWithCopy: React.FC<CodeBlockWithCopyProps> = ({
  code,
  language,
  title,
  className = '',
  showLineNumbers = false,
}) => {
  const [copied, setCopied] = useState(false);
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (timerRef.current !== null) {
        window.clearTimeout(timerRef.current);
      }
    };
  }, []);

  const triggerCopiedFeedback = () => {
    setCopied(true);
    if (timerRef.current !== null) {
      window.clearTimeout(timerRef.current);
    }
    timerRef.current = window.setTimeout(() => {
      setCopied(false);
      timerRef.current = null;
    }, 2000);
  };

  const handleCopy = async () => {
    let success = false;

    if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
      try {
        await navigator.clipboard.writeText(code);
        success = true;
      } catch {
        success = false;
      }
    }

    if (!success && typeof document !== 'undefined') {
      let textarea: HTMLTextAreaElement | null = null;
      try {
        textarea = document.createElement('textarea');
        textarea.value = code;
        textarea.setAttribute('readonly', '');
        textarea.style.position = 'fixed';
        textarea.style.left = '-9999px';
        textarea.style.opacity = '0';
        document.body.appendChild(textarea);
        textarea.select();
        success = Boolean(document.execCommand?.('copy'));
      } catch {
        success = false;
      } finally {
        textarea?.remove();
      }
    }

    if (success) {
      triggerCopiedFeedback();
    }
  };

  const lines = showLineNumbers ? code.split('\n') : null;
  const headerLabel = title || language || 'Kod';

  return (
    <div
      className={`rounded-xl border border-slate-200 bg-white overflow-hidden shadow-sm ${className}`.trim()}
    >
      {/* Light Header Bar */}
      <div className="bg-slate-50 border-b border-slate-200 px-4 py-2.5 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 min-w-0">
          <Code2 className="w-4 h-4 text-[#147DF5] flex-shrink-0" />
          <span className="text-xs font-semibold text-slate-700 truncate">{headerLabel}</span>
          {title && language && (
            <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-slate-200/70 text-slate-600 flex-shrink-0">
              {language}
            </span>
          )}
        </div>

        <button
          type="button"
          onClick={handleCopy}
          aria-label={copied ? az.common.copied : az.common.copy}
          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors flex-shrink-0 ${
            copied
              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
              : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100 hover:border-slate-300'
          }`}
        >
          {copied ? (
            <>
              <Check className="w-3.5 h-3.5 text-emerald-600" />
              <span>{az.common.copied}</span>
            </>
          ) : (
            <>
              <Copy className="w-3.5 h-3.5 text-slate-500" />
              <span>{az.common.copy}</span>
            </>
          )}
        </button>
      </div>

      {/* Dark Code Body */}
      <pre className="p-4 bg-slate-900 text-slate-100 text-xs sm:text-sm font-mono overflow-x-auto leading-relaxed">
        {lines ? (
          <code className="block">
            {lines.map((line, idx) => (
              <div key={idx} className="flex gap-4">
                <span className="select-none text-slate-500 w-7 text-right flex-shrink-0">
                  {idx + 1}
                </span>
                <span className="flex-1">{line || ' '}</span>
              </div>
            ))}
          </code>
        ) : (
          <code>{code}</code>
        )}
      </pre>
    </div>
  );
};
