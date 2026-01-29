import { toast } from "sonner";

const BASE_URL = import.meta.env.VITE_API_URL || "https://sendcash-be-production.up.railway.app";

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

    const data = await response.json();

    // Check HTTP status code OR error status in response body
    // Some APIs return 200 OK but include error status in the response body
    const isError = !response.ok || (data.status && data.status >= 400);
    
    if (isError) {
      // Show toast notification with server message
      const serverMessage = data.message || data.error || `Request failed with status ${response.status || data.status || 'unknown'}`;
      toast.error(serverMessage);
      throw new Error(serverMessage);
    }

    // Return the data in the expected ApiResponse format
    // The API returns { status, message, data } so we return it as-is
    return data;
  } catch (error: any) {
    // Handle network errors
    if (error instanceof TypeError) {
      const networkError = "Network error. Please check your connection.";
      toast.error(networkError);
      throw new Error(networkError);
    }
    
    // If error already has a message (from server), it's already shown in toast above
    // Only re-throw if it's not already handled
    if (error.message && !error.message.includes("Network error")) {
      // Error message was already shown in toast, just re-throw
      throw error;
    }
    
    // For any other unhandled errors
    const errorMessage = error.message || "An unexpected error occurred";
    toast.error(errorMessage);
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
