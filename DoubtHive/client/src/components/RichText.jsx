import { useState } from 'react';
import { Copy, Check } from 'lucide-react';

// Tiny, dependency-free formatter for the two things people actually need
// when asking/answering doubts: ```fenced code blocks``` and `inline code`.
// Everything is rendered as React elements (never innerHTML), so user input
// can't inject markup.

const FENCE = /```([\w+-]*)[ \t]*\n?([\s\S]*?)```/g;

function splitBlocks(text) {
  const parts = [];
  let last = 0;
  let m;
  FENCE.lastIndex = 0;
  while ((m = FENCE.exec(text)) !== null) {
    if (m.index > last) parts.push({ type: 'text', value: text.slice(last, m.index) });
    parts.push({ type: 'code', lang: m[1], value: m[2].replace(/\n$/, '') });
    last = FENCE.lastIndex;
  }
  if (last < text.length) parts.push({ type: 'text', value: text.slice(last) });
  return parts;
}

function Inline({ text }) {
  return text.split(/(`[^`\n]+`)/g).map((chunk, i) =>
    chunk.length > 2 && chunk.startsWith('`') && chunk.endsWith('`')
      ? <code key={i} className="inline-code">{chunk.slice(1, -1)}</code>
      : <span key={i}>{chunk}</span>
  );
}

function CodeBlock({ lang, value }) {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch { /* clipboard unavailable (e.g. insecure context) */ }
  };

  return (
    <div className="code-block">
      <div className="code-block__bar">
        <span>{lang || 'code'}</span>
        <button type="button" className="code-block__copy" onClick={copy}>
          {copied ? <Check size={12} /> : <Copy size={12} />} {copied ? 'Copied' : 'Copy'}
        </button>
      </div>
      <pre><code>{value}</code></pre>
    </div>
  );
}

function RichText({ text = '', className = '' }) {
  return (
    <div className={`rich-text ${className}`.trim()}>
      {splitBlocks(text).map((part, i) => {
        if (part.type === 'code') return <CodeBlock key={i} lang={part.lang} value={part.value} />;
        const trimmed = part.value.replace(/^\n+|\n+$/g, '');
        if (!trimmed) return null;
        return trimmed.split(/\n{2,}/).map((para, j) => (
          <p key={`${i}-${j}`}><Inline text={para} /></p>
        ));
      })}
    </div>
  );
}

export default RichText;
