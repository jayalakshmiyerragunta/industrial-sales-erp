const TOKEN_KEY = 'erp_token';

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string) {
  localStorage.setItem(TOKEN_KEY, token);
}

export function clearToken() {
  localStorage.removeItem(TOKEN_KEY);
}

export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

interface ApiEnvelope<T> {
  success: boolean;
  message?: string;
  data: T;
}

async function request<T>(method: string, path: string, body?: unknown): Promise<T> {
  const token = getToken();
  const res = await fetch(`/api/v1${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });

  let payload: ApiEnvelope<T> | null = null;
  try {
    payload = (await res.json()) as ApiEnvelope<T>;
  } catch {
    /* non-JSON body */
  }

  if (!res.ok || !payload?.success) {
    const detail =
      (payload as { errors?: { message: string }[] })?.errors?.[0]?.message ??
      payload?.message ??
      `Request failed (${res.status})`;
    throw new ApiError(res.status, detail);
  }
  return payload.data;
}

export const api = {
  get: <T>(path: string) => request<T>('GET', path),
  post: <T>(path: string, body?: unknown) => request<T>('POST', path, body),
  patch: <T>(path: string, body?: unknown) => request<T>('PATCH', path, body),
};

export const getDrivers = () => api.get<Driver[]>('/drivers');

export interface Driver {
  id: string;
  name: string;
  vehicleNumber: string;
  allocated: boolean;
  dispatchNo: string | null;
}