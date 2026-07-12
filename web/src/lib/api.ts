import { toast } from "sonner";

const BASE_URL = import.meta.env.VITE_API_URL || "https://api.sendicash.com";

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
  if (lower.includes("invalid password") || lower.includes("user not found")) {
    return "Invalid email or password.";
  }
  if (status === 401 || lower.includes("invalid access token") || lower.includes("unauthorized")) {
    return "Your session has expired. Please sign in again.";
  }
  if (status === 409 || lower.includes("username already exists") || lower.includes("already exists")) {
    return "An account with this email already exists. Sign in to continue or request a new verification code.";
  }
  if (lower.includes("account not found")) {
    return "Account not found. Try disconnecting and reconnecting your wallet, or refresh the page. If the issue persists, your XRPL account may not be activated yet (it needs a minimum reserve).";
  }
  if (lower.includes("wallet") && lower.includes("not found")) {
    return "Wallet not found. Please ensure your wallet is connected and your XRPL account is activated with the minimum reserve balance.";
  }
  if (lower.includes("insufficient") || lower.includes("balance")) {
    return "Insufficient balance for this transaction. Please check your wallet balance and try again.";
  }
  if (lower.includes("network") || lower.includes("timeout")) {
    return "Network issue detected. Please check your connection and try again.";
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
    // Prefer body.status when it indicates an error (e.g. 200 + { status: 409 })
    const status =
      typeof data.status === "number" && data.status >= 400
        ? data.status
        : response.status || data.status || 500;
    const serverMessage = data.message || data.error || `Request failed (${status})`;

    // 401: session expired → redirect to login. Auth attempts (login/pin) stay on the page.
    if (status === 401) {
      removeAuthToken();
      const lower = (serverMessage || "").toLowerCase();
      const isCredentialFailure =
        endpoint.includes("/user/login") ||
        endpoint.includes("/wallet/pinlogin") ||
        lower.includes("invalid password") ||
        window.location.pathname.startsWith("/login");

      toast.error(getFriendlyMessage(serverMessage, status), { duration: 8000 });
      if (!isCredentialFailure) {
        window.location.href = "/login?reason=session_expired";
      }
      throw new Error(serverMessage);
    }

    // Body may carry non-success statuses (API always responds HTTP 200)
    const bodyStatus = typeof data.status === "number" ? data.status : status;
    const isError = !response.ok || status >= 400 || (bodyStatus >= 300 && bodyStatus !== 203);
    if (isError) {
      const friendly = getFriendlyMessage(serverMessage, status);
      const isAlreadyExists = status === 409 || (serverMessage || "").toLowerCase().includes("already exists");
      toast.error(friendly, {
        duration: isAlreadyExists ? 12000 : 6000,
        ...(isAlreadyExists && {
          action: {
            label: "Sign in",
            onClick: () => { window.location.href = "/login"; },
          },
        }),
      });
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
