// MiniMax (MiniMax) chat completions 래퍼.
// stockcom 에서 사용 중인 동일 패턴을 따름.
//
// [2026-08-16] BASE_URL 기본값 수정
//  - sk-cp- 로 시작하는 글로벌 Token Plan 키 → https://api.minimax.io
//  - sk-api- 로 시작하는 CN/구 키       → https://api.minimaxi.com
//  Vercel 환경변수에 MINIMAX_BASE_URL 안 박으면 글로벌 엔드포인트로 가도록.

const API_KEY = process.env.MINIMAX_API_KEY;
const MODEL = process.env.MINIMAX_MODEL || 'MiniMax-M3';
const BASE_URL = process.env.MINIMAX_BASE_URL || 'https://api.minimax.io';

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface GenerateOptions {
  temperature?: number;
  maxTokens?: number;
  jsonMode?: boolean;
}

export async function chat(messages: ChatMessage[], opts: GenerateOptions = {}): Promise<string> {
  if (!API_KEY) throw new Error('MINIMAX_API_KEY not set');

  const res = await fetch(`${BASE_URL}/v1/text/chatcompletion_v2`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${API_KEY}`,
    },
    body: JSON.stringify({
      model: MODEL,
      messages,
      temperature: opts.temperature ?? 0.85,
      max_tokens: opts.maxTokens ?? 1024,
      stream: false,
      ...(opts.jsonMode ? { response_format: { type: 'json_object' } } : {}),
    }),
  });

  if (!res.ok) {
    const err = await res.text().catch(() => '');
    throw new Error(`MiniMax ${res.status}: ${err.slice(0, 300)}`);
  }

  const data = await res.json();
  const content = data?.choices?.[0]?.message?.content ?? '';
  if (process.env.DEBUG_MINIMAX) {
    console.log('[minimax DEBUG] raw keys:', Object.keys(data));
    console.log('[minimax DEBUG] choices[0] keys:', data?.choices?.[0] ? Object.keys(data.choices[0]) : 'none');
    console.log('[minimax DEBUG] message keys:', data?.choices?.[0]?.message ? Object.keys(data.choices[0].message) : 'none');
    console.log('[minimax DEBUG] content length:', content.length);
    if (content.length === 0) {
      console.log('[minimax DEBUG] full response (truncated):', JSON.stringify(data).slice(0, 800));
    }
  }
  return content;
}
