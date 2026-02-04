import { toast } from "sonner";

const BASE_URL = import.meta.env.VITE_API_URL || "https://sendcash-api.ikibina.online";

export interface ApiResponse<T = any> {
  status: number;
  message: string;
  data?: T;
}

// Get auth token from localStorage
const getAuthToken = (): string | null => {
  return localStorage.getItem("auth_token");
};

// Set auth token
export const setAuthToken = (token: string): void => {
  localStorage.setItem("auth_token", token);
};

// Remove auth token
export const removeAuthToken = (): void => {
  localStorage.removeItem("auth_token");
};

/** User-friendly messages for common API errors (all toasts are dismissible via Sonner close button) */
function getFriendlyMessage(serverMessage: string, status: number): string {
  const lower = (serverMessage || "").toLowerCase();
  if (status === 401 || lower.includes("invalid access token") || lower.includes("unauthorized")) {
    return "Your session has expired. Please sign in again.";
  }
  if (lower.includes("account not found")) {
    return "No account found with that information. Check your details or sign up.";
  }
  return serverMessage;
}

// Generic API request function
const request = async <T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<ApiResponse<T>> => {
  const token = getAuthToken();
  const headers: HeadersInit = {
    "Content-Type": "application/json",
    ...(token && { Authorization: `Bearer ${token}` }),
    ...options.headers,
  };

  try {
    const response = await fetch(`${BASE_URL}${endpoint}`, {
      ...options,
      headers,
    });

    const data = await response.json().catch(() => ({}));
    const status = response.status || data.status || 500;
    const serverMessage = data.message || data.error || `Request failed (${status})`;

    // 401: clear token and redirect to login so user can sign in again
    if (status === 401) {
      removeAuthToken();
      toast.error(getFriendlyMessage(serverMessage, status), { duration: 8000 });
      window.location.href = "/login?reason=session_expired";
      throw new Error(serverMessage);
    }

    const isError = !response.ok || (status >= 400);
    if (isError) {
      const friendly = getFriendlyMessage(serverMessage, status);
      toast.error(friendly, { duration: 6000 });
      throw new Error(serverMessage);
    }

    return data;
  } catch (error: any) {
    if (error.message && (error.message.includes("session") || error.message.includes("401"))) throw error;
    if (error instanceof TypeError) {
      toast.error("Network error. Please check your connection.", { duration: 6000 });
      throw new Error("Network error");
    }
    throw error;
  }
};

// API utility object
export const api = {
  // GET request
  get: async <T = any>(endpoint: string): Promise<ApiResponse<T>> => {
    return request<T>(endpoint, {
      method: "GET",
    });
  },

  // POST request
  post: async <T = any>(body: any, endpoint: string): Promise<ApiResponse<T>> => {
    return request<T>(endpoint, {
      method: "POST",
      body: JSON.stringify(body),
    });
  },

  // PUT request
  put: async <T = any>(body: any, endpoint: string): Promise<ApiResponse<T>> => {
    return request<T>(endpoint, {
      method: "PUT",
      body: JSON.stringify(body),
    });
  },

  // DELETE request
  delete: async <T = any>(endpoint: string): Promise<ApiResponse<T>> => {
    return request<T>(endpoint, {
      method: "DELETE",
    });
  },
};

// Export token management
export { getAuthToken };
