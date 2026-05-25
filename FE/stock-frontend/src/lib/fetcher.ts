const API_BASE_URL = typeof window !== 'undefined'
  ? ''
  : (process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8080');

export { API_BASE_URL };

export function getAuthHeader(): Record<string, string> {
  if (typeof window === 'undefined') return {};
  const token = localStorage.getItem('stockai_token');
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

export function num(s: string | undefined | null): number {
  if (!s) return 0;
  const v = parseFloat(s.replace(/,/g, ''));
  return Number.isNaN(v) ? 0 : v;
}

export function parseSign(sign: string) {
  const s = sign?.trim() ?? '';
  const isUp = s === '1' || s === '2';
  const isDown = s === '4' || s === '5';
  const isLimitUp = s === '1';
  const isLimitDown = s === '5';
  return { isUp, isDown, isLimitUp, isLimitDown };
}

function delayWithJitter(ms: number): Promise<void> {
  const jittered = ms * (0.5 + Math.random() * 0.5);
  return new Promise((r) => setTimeout(r, jittered));
}

function getRetryAfterMs(res: Response): number | null {
  const header = res.headers.get('Retry-After');
  if (!header) return null;
  const seconds = Number(header);
  if (!Number.isNaN(seconds) && seconds > 0) return seconds * 1000;
  const date = new Date(header);
  const diff = date.getTime() - Date.now();
  return diff > 0 ? diff : null;
}

export async function fetcher<T>(url: string, init?: RequestInit, retries = 1): Promise<T> {
  let lastErr: Error;

  for (let attempt = 0; attempt <= retries; attempt++) {
    if (attempt > 0) {
      const baseDelay = 1000 * Math.pow(2, attempt - 1);
      await delayWithJitter(baseDelay);
    }

    let res: Response;
    try {
      res = await fetch(url, {
        ...init,
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeader(),
          ...(init?.headers || {}),
        },
      });
    } catch (networkErr) {
      lastErr = networkErr instanceof Error
        ? networkErr
        : new Error(String(networkErr));

      if (attempt < retries) continue;

      throw new Error(
        `Network Error: BE 서버(${API_BASE_URL || '/api'})에 연결할 수 없습니다.\n` +
        '1) BE 서버가 실행 중인지 확인하세요.\n' +
        '2) NEXT_PUBLIC_API_BASE_URL 환경변수가 올바른지 확인하세요.'
      );
    }

    if (!res.ok) {
      let text = '';
      try {
        text = await res.text();
      } catch {
        text = '';
      }

      if (res.status === 401) {
        if (typeof window !== 'undefined') {
          localStorage.removeItem('stockai_token');
          localStorage.removeItem('stockai_user');
          window.location.href = '/login';
        }
        throw new ApiError(401, text || '인증이 만료되었습니다. 다시 로그인해주세요.');
      }

      const retryable = [429, 502, 503];
      if (retryable.includes(res.status) && attempt < retries) {
        lastErr = new ApiError(res.status, `API Error ${res.status}: ${text || res.statusText}`);

        if (res.status === 429) {
          const retryAfterMs = getRetryAfterMs(res);
          if (retryAfterMs) {
            await new Promise((r) => setTimeout(r, retryAfterMs));
          }
        }
        continue;
      }

      let msg = text || res.statusText;
      try {
        const parsed = JSON.parse(text);
        if (parsed.message) msg = parsed.message;
      } catch { /* keep original */ }

      let hint = '';
      if (res.status === 403) hint = ' → 인증/권한 문제입니다. API 키, CORS 설정, 또는 방화벽을 확인하세요.';
      if (res.status === 404) hint = ' → 요청한 API 엔드포인트가 BE에 없습니다. 경로와 HTTP 메소드를 확인하세요.';
      if (res.status === 500) hint = ' → BE 서버 내부 에러입니다. BE 로그를 확인하세요.';
      if (res.status === 502 || res.status === 503) hint = ' → BE 서버가 응답하지 않거나, Next.js rewrite 대상이 잘못되었습니다.';

      throw new ApiError(res.status, `${msg}${hint}`);
    }

    const text = await res.text();
    if (!text) {
      return {} as T;
    }
    return JSON.parse(text) as T;
  }

  throw lastErr!;
}