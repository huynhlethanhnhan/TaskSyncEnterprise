import time
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import Response
import logging

# Sử dụng logger mặc định của uvicorn để in ra terminal gọn gàng
logger = logging.getLogger("uvicorn")

class LoggingMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next) -> Response:
        start_time = time.time()
        
        # Cho request đi tiếp đến các router xử lý
        response = await call_next(request)
        
        # Tính toán thời gian xử lý phản hồi (Process Time)
        process_time = time.time() - start_time
        response.headers["X-Process-Time"] = str(process_time)
        
        # In log trực tiếp ra terminal theo đúng định dạng
        logger.info(f"{request.method} {request.url.path} - {process_time:.3f}s")
        
        return response