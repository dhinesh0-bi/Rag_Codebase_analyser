import { getIdToken } from './firebase';

const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

const getAuthHeaders = async () => {
  const token = await getIdToken();
  const headers = {
    'Content-Type': 'application/json',
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
};

export const getHealth = async () => {
  try {
    const headers = await getAuthHeaders();
    const response = await fetch(`${BASE_URL}/health`, { headers });
    if (!response.ok) {
      throw new Error(`Health check failed: ${response.status}`);
    }
    return await response.json();
  } catch (error) {
    console.error('Health check error:', error);
    throw error;
  }
};

export const getRateLimit = async () => {
  try {
    const headers = await getAuthHeaders();
    const response = await fetch(`${BASE_URL}/rate-limit`, { headers });
    if (!response.ok) {
      if (response.status === 401) {
        return { used: 0, limit: 50, remaining: 50, reset_time: null };
      }
      throw new Error(`Rate limit check failed: ${response.status}`);
    }
    return await response.json();
  } catch (error) {
    console.error('Rate limit check error:', error);
    return { used: 0, limit: 50, remaining: 50, reset_time: null };
  }
};

export const sendChatRequest = async (
  repoUrl,
  question,
  onChunk,
  onComplete,
  onError
) => {
  try {
    const token = await getIdToken();
    const headers = {
      'Content-Type': 'application/json',
    };
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(`${BASE_URL}/stream`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        repo_url: repoUrl,
        question: question,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ detail: `HTTP ${response.status}` }));
      throw new Error(errorData.detail || `Request failed with status ${response.status}`);
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder('utf-8');
    let buffer = '';
    let sources = [];
    let fullAnswer = '';

    const processStream = async () => {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop();

        for (const line of lines) {
          if (!line.trim()) continue;

          if (line.startsWith('data: ')) {
            const dataStr = line.slice(6).trim();
            if (dataStr === '[DONE]') continue;

            let parsed = null;
            try {
              parsed = JSON.parse(dataStr);
            } catch (parseError) {
              // If it's raw text (not JSON), treat it as a token
              if (dataStr && !dataStr.startsWith('{')) {
                fullAnswer += dataStr;
                onChunk(dataStr, fullAnswer);
              }
            }

            if (parsed) {
              // Backend sends: {"type": "token", "data": "some text"}
              if (parsed.type === 'token') {
                const text = parsed.data || '';
                fullAnswer += text;
                onChunk(text, fullAnswer);

              // Backend sends: {"type": "source", "data": {...}}
              } else if (parsed.type === 'source') {
                sources.push(parsed.data);

              // Backend sends: {"type": "error", "data": "message"}
              } else if (parsed.type === 'error') {
                throw new Error(parsed.data || 'Stream error');
              }
            }
          }
        }
      }

      onComplete(fullAnswer, sources);
    };

    await processStream();
  } catch (error) {
    console.error('Chat request error:', error);
    onError(error.message || 'An unexpected error occurred');
  }
};

export const analyzeRepo = async (repoUrl) => {
  try {
    const headers = await getAuthHeaders();
    const response = await fetch(`${BASE_URL}/analyze`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ repo_url: repoUrl }),
    });
    if (!response.ok) {
      const err = await response.json().catch(() => ({ detail: `HTTP ${response.status}` }));
      throw new Error(err.detail || 'Analysis failed');
    }
    return await response.json();
  } catch (error) {
    console.error('Repo analysis error:', error);
    throw error;
  }
};
