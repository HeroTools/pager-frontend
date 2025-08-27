interface AxiosErrorLike {
  response?: {
    data?: any;
    status?: number;
  };
  message?: string;
}

interface BackendErrorResponse {
  error: boolean;
  message: string;
}

export const getAuthErrorMessage = (error: unknown): string => {
  if (error && typeof error === 'object' && 'response' in error) {
    const axiosError = error as AxiosErrorLike;
    const data = axiosError.response?.data as BackendErrorResponse;
    const status = axiosError.response?.status;
    const errorMessage = data?.message || '';
    
    if (errorMessage === 'Invalid email format') {
      return 'Please enter a valid email address.';
    }
    if (errorMessage === 'Password must be at least 6 characters') {
      return 'Password must be at least 6 characters long.';
    }
    if (errorMessage === 'Name is required') {
      return 'Please enter your name.';
    }
    if (errorMessage === 'Invalid or expired invite token.') {
      return 'This invitation link is invalid or has expired. Please request a new one.';
    }
    if (errorMessage === 'Invite token has reached its usage limit.') {
      return 'This invitation link has been used too many times. Please request a new one.';
    }
    if (errorMessage === 'Failed to create user') {
      return 'Unable to create your account. Please try again.';
    }
    if (errorMessage === 'Invalid credentials for existing user.') {
      return 'An account with this email already exists. Please sign in instead.';
    }
    if (errorMessage === 'User already exists. Please sign in.') {
      return 'An account with this email already exists. Please sign in instead.';
    }
    if (errorMessage === 'User is already a member of this workspace.') {
      return 'You are already a member of this workspace.';
    }
    if (errorMessage === 'Email and password are required') {
      return 'Please enter both email and password.';
    }
    if (errorMessage === 'Invalid credentials') {
      return 'Invalid email or password. Please check your credentials and try again.';
    }
    if (errorMessage === 'Refresh token is required') {
      return 'Session expired. Please sign in again.';
    }
    if (errorMessage === 'Invalid refresh token or token already used') {
      return 'Session expired. Please sign in again.';
    }
    if (errorMessage === 'Failed to refresh session') {
      return 'Session expired. Please sign in again.';
    }
    if (errorMessage.startsWith('Refresh failed:')) {
      return 'Session expired. Please sign in again.';
    }
    
    switch (status) {
      case 400:
        return errorMessage || 'Invalid request. Please check your information and try again.';
      case 401:
        return 'Invalid email or password. Please check your credentials and try again.';
      case 409:
        return 'An account with this email already exists. Please sign in instead.';
      case 500:
        return 'Server error. Please try again later or contact support@pager.team if the problem persists.';
      default:
        return errorMessage || 'Something went wrong. Please try again.';
    }
  }
  
  if (error instanceof Error) {
    if (error.message.toLowerCase().includes('network')) {
      return 'Network error. Please check your connection and try again.';
    }
    if (error.message.toLowerCase().includes('timeout')) {
      return 'Request timed out. Please try again.';
    }
    return error.message || 'Something went wrong. Please try again.';
  }
  
  if (typeof error === 'string') {
    return error;
  }
  
  return 'Something went wrong. Please try again.';
};

