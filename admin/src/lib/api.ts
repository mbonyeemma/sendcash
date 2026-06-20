import { toast } from "sonner";

export const BASE_URL = import.meta.env.VITE_API_URL || "https://api.sendicash.com";
const TOKEN_KEY = "admin_token";

export interface ApiResponse<T = any> {
  status: number;
  message: string;
  data?: T;
}

export const getToken = (): string | null => localStorage.getItem(TOKEN_KEY);
export const setToken = (token: string): void => localStorage.setItem(TOKEN_KEY, token);
export const clearToken = (): void => localStorage.removeItem(TOKEN_KEY);

function buildQuery(params?: Record<string, any>): string {
  if (!params) return "";
  const sp = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== "") sp.append(k, String(v));
  });
  const s = sp.toString();
  return s ? `?${s}` : "";
}

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<ApiResponse<T>> {
  const token = getToken();
  const headers: HeadersInit = {
    "Content-Type": "application/json",
    ...(token && { Authorization: `Bearer ${token}` }),
    ...options.headers,
  };

  let response: Response;
  try {
    response = await fetch(`${BASE_URL}${endpoint}`, { ...options, headers });
  } catch (e) {
    toast.error("Network error. Check your connection and the API URL.");
    throw e;
  }

  const data = await response.json().catch(() => ({} as any));
  const status =
    typeof data.status === "number" && data.status >= 400 ? data.status : response.status || data.status || 500;

  if (status === 401) {
    clearToken();
    if (!location.pathname.startsWith("/login")) {
      toast.error("Session expired. Please sign in again.");
      location.href = "/login";
    }
    throw new Error(data.message || "Unauthorized");
  }

  if (!response.ok || status >= 400) {
    const message = data.message || data.error || `Request failed (${status})`;
    toast.error(message);
    throw new Error(message);
  }

  return data as ApiResponse<T>;
}

export const api = {
  get: <T>(endpoint: string, params?: Record<string, any>) =>
    request<T>(`${endpoint}${buildQuery(params)}`, { method: "GET" }),
  post: <T>(endpoint: string, body?: any) =>
    request<T>(endpoint, { method: "POST", body: JSON.stringify(body ?? {}) }),
  put: <T>(endpoint: string, body?: any) =>
    request<T>(endpoint, { method: "PUT", body: JSON.stringify(body ?? {}) }),
  del: <T>(endpoint: string) => request<T>(endpoint, { method: "DELETE" }),
};
