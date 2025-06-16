import axios from 'axios';

// Create axios instance with default config
export const axiosInstance = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8081',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor
axiosInstance.interceptors.request.use(
  (config) => {
    // Get the session from localStorage
    const session = localStorage.getItem('supabase-session');
    if (session) {
      const { access_token } = JSON.parse(session);
      if (access_token) {
        config.headers.Authorization = `Bearer ${access_token}`;
      }
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor
axiosInstance.interceptors.response.use(
  (response) => {
    return response;
  },
  async (error) => {
    const originalRequest = error.config;

    // Handle 401 Unauthorized errors
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        // Get the session from localStorage
        const session = localStorage.getItem('supabase-session');
        if (session) {
          const { refresh_token } = JSON.parse(session);
          if (refresh_token) {
            // Call refresh token endpoint
            const response = await axiosInstance.post('/auth/refresh', {
              refresh_token,
            });

            if (response.data.success) {
              // Update session in localStorage
              localStorage.setItem(
                'supabase-session',
                JSON.stringify(response.data.data.session)
              );

              // Retry the original request with new token
              originalRequest.headers.Authorization = `Bearer ${response.data.data.session.access_token}`;
              return axiosInstance(originalRequest);
            }
          }
        }
      } catch (refreshError) {
        // If refresh token fails, redirect to login
        localStorage.removeItem('supabase-session');
        localStorage.removeItem('user-profile');
        window.location.href = '/auth';
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
); 