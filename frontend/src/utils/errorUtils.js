// Utility function to parse FastAPI error responses
export const parseErrorResponse = (error) => {
  // Handle network errors
  if (!error.response) {
    if (error.code === 'ECONNABORTED') {
      return 'Request timeout. Please try again.';
    }
    if (error.code === 'NETWORK_ERROR' || error.message?.includes('Network Error')) {
      return 'Network error. Please check your internet connection.';
    }
    if (error.message?.includes('timeout')) {
      return 'Connection timeout. Please try again.';
    }
    return `Network error: ${error.message || 'Please check your connection.'}`;
  }

  const detail = error.response?.data?.detail;
  
  // If no detail, return generic error
  if (!detail) {
    return `Error: ${error.response?.status || 'Unknown error'}`;
  }

  // If detail is an array of validation errors (Pydantic validation)
  if (Array.isArray(detail)) {
    const errorMessages = detail.map(err => {
      if (typeof err === 'object' && err.msg) {
        // Handle field-specific errors
        if (err.loc && Array.isArray(err.loc) && err.loc.length > 1) {
          const field = err.loc[err.loc.length - 1];
          return `${field}: ${err.msg}`;
        }
        return err.msg;
      }
      return String(err);
    });
    return errorMessages.join(', ');
  }

  // If detail is a simple string
  if (typeof detail === 'string') {
    return detail;
  }

  // If detail is an object with properties like {type, loc, msg, input, url}
  if (typeof detail === 'object') {
    if (detail.msg) {
      return detail.msg;
    }
    // Try to extract any meaningful message
    return JSON.stringify(detail);
  }

  return 'An error occurred';
};