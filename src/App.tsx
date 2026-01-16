import { useState, useRef, useEffect, type FormEvent } from 'react';
import { fetchAuthSession } from 'aws-amplify/auth';
import ReactMarkdown from 'react-markdown';
import './App.css';

const AGENT_ARN = import.meta.env.VITE_AGENT_ARN;

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  isToolUsing?: boolean;
  toolCompleted?: boolean;
  toolName?: string;
}

function App() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!input.trim() || loading) return;

    const userMessage: Message = { id: crypto.randomUUID(), role: 'user', content: input.trim() };

    setMessages(prev => [...prev, userMessage, { id: crypto.randomUUID(), role: 'assistant', content: '' }]);
    setInput('');
    setLoading(true);

    const session = await fetchAuthSession();
    const accessToken = session.tokens?.accessToken?.toString();

    const url = `https://bedrock-agentcore.ap-northeast-1.amazonaws.com/runtimes/${encodeURIComponent(AGENT_ARN)}/invocations?qualifier=DEFAULT`;
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt: userMessage.content }),
    });

    const reader = res.body!.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    let isInToolUse = false;
    let toolIdx = -1;

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      for (const line of decoder.decode(value, { stream: true }).split('\n')) {
        if (!line.startsWith('data: ')) continue;
        const data = line.slice(6);
        if (data === '[DONE]') continue;
        const event = JSON.parse(data);

        if (event.type === 'tool_use') {
          isInToolUse = true;
          const savedBuffer = buffer;
          setMessages(prev => {
            const msgs = [...prev];
            if (savedBuffer) {
              msgs[msgs.length - 1] = { ...msgs[msgs.length - 1], content: savedBuffer };
              toolIdx = msgs.length;
              msgs.push({ id: crypto.randomUUID(), role: 'assistant', content: '', isToolUsing: true, toolName: event.tool_name });
            } else {
              toolIdx = msgs.length - 1;
              msgs[msgs.length - 1] = { ...msgs[msgs.length - 1], isToolUsing: true, toolName: event.tool_name };
            }
            return msgs;
          });
          buffer = '';
          continue;
        }

        if (event.type === 'text' && event.data) {
          if (isInToolUse && !buffer) {
            const savedIdx = toolIdx;
            setMessages(prev => {
              const msgs = [...prev];
              if (savedIdx >= 0 && savedIdx < msgs.length) msgs[savedIdx] = { ...msgs[savedIdx], toolCompleted: true };
              msgs.push({ id: crypto.randomUUID(), role: 'assistant', content: event.data });
              return msgs;
            });
            buffer = event.data;
            isInToolUse = false;
            toolIdx = -1;
          } else {
            buffer += event.data;
            setMessages(prev => {
              const msgs = [...prev];
              msgs[msgs.length - 1] = { ...msgs[msgs.length - 1], content: buffer, isToolUsing: false };
              return msgs;
            });
          }
        }
      }
    }
    setLoading(false);
  };

  return (
    <div className="container">
      <header className="header">
        <h1 className="title">AWS Knowledge Agent</h1>
        <p className="subtitle">AgentCoreとAWS Knowledge MCPで構築</p>
      </header>

      <div className="message-area">
        <div className="message-container">
          {messages.map(msg => (
            <div key={msg.id} className={`message-row ${msg.role}`}>
              <div className={`bubble ${msg.role}`}>
                {msg.role === 'assistant' && !msg.content && !msg.isToolUsing && (
                  <span className="thinking">考え中…</span>
                )}
                {msg.isToolUsing && (
                  <span className={`tool-status ${msg.toolCompleted ? 'completed' : 'active'}`}>
                    {msg.toolCompleted ? '✓' : '⏳'} {msg.toolName}
                    {msg.toolCompleted ? 'ツールを利用しました' : 'を利用中...'}
                  </span>
                )}
                {msg.content && !msg.isToolUsing && <ReactMarkdown>{msg.content}</ReactMarkdown>}
              </div>
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>
      </div>

      <div className="form-wrapper">
        <form onSubmit={handleSubmit} className="form">
          <input value={input} onChange={e => setInput(e.target.value)} placeholder="AWSについて質問する..." disabled={loading} className="input" />
          <button type="submit" disabled={loading || !input.trim()} className="button">
            {loading ? '⌛️' : '送信'}
          </button>
        </form>
      </div>
    </div>
  );
}

export default App;
