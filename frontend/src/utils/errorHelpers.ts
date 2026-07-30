import { AxiosError } from 'axios';

export interface ApiErrorDetail {
  code?: string;
  message?: string;
  field?: string;
}

export interface ApiError {
  status: number;
  message: string;
  code?: string;
  details?: ApiErrorDetail[];
}

export function extractApiError(error: unknown, defaultMessage = 'Đã xảy ra lỗi không xác định.'): ApiError {
  if (error && typeof error === 'object' && 'isAxiosError' in error) {
    const axiosError = error as AxiosError<any>;
    const data = axiosError.response?.data;
    const status = axiosError.response?.status || 500;

    if (data && typeof data === 'object') {
      // Custom format from backend (e.g., ConflictException, ValidationException)
      if (data.detail) {
        if (typeof data.detail === 'string') {
          return {
            status,
            message: data.detail,
            code: data.error_code,
          };
        } else if (Array.isArray(data.detail)) {
          // Pydantic validation errors format
          const messages = data.detail.map((d: any) => {
            const field = d.loc?.join('.') || 'Trường';
            return `${field}: ${d.msg}`;
          });
          return {
            status,
            message: messages.join('\n') || defaultMessage,
            code: 'VALIDATION_ERROR',
            details: data.detail,
          };
        }
      }

      if (data.message) {
        return {
          status,
          message: data.message,
          code: data.error_code || data.code,
        };
      }
    }
    return {
      status,
      message: axiosError.message || defaultMessage,
    };
  }

  if (error instanceof Error) {
    return {
      status: 500,
      message: error.message,
    };
  }

  return {
    status: 500,
    message: defaultMessage,
  };
}
