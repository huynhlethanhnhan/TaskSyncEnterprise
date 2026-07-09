# Kiến Trúc Phản Hồi Doanh Nghiệp (Enterprise Response Architecture)

## Mục tiêu
Thiết kế và triển khai một cấu trúc phản hồi API chuẩn hóa (Enveloped API Responses), tận dụng cơ chế Generics trong Python và Pydantic để tạo tài liệu Swagger UI rõ ràng, kết hợp xử lý dữ liệu phân trang nhất quán.

## Kiến thức nền
Một ứng dụng chuyên nghiệp cần trả về các phản hồi API có cấu trúc đồng nhất. Nếu endpoint này trả về một danh sách thô, endpoint khác trả về một đối tượng bọc trong khóa `data`, còn endpoint khác lại trả về cấu trúc phân trang khác hoàn toàn, lập trình viên frontend sẽ gặp khó khăn lớn khi tích hợp và xử lý dữ liệu.

## Giải thích chi tiết

### 1. Phản hồi bọc trong phong bì (Enveloped Response)
Là cơ chế đóng gói tất cả các payload dữ liệu trả về từ API vào một cấu trúc chuẩn chung. Một phong bì phản hồi thành công thường chứa các trường:
*   `success`: Giá trị boolean thể hiện trạng thái thành công (`True`).
*   `message`: Thông báo mô tả kết quả xử lý.
*   `data`: Payload dữ liệu thực tế (có thể là một đối tượng hoặc một danh sách).
*   `request_id`: Mã liên vết request phục vụ giám sát.
*   `timestamp`: Thời điểm phản hồi được tạo ra.

### 2. Sử dụng Python Generics (`Generic[T]`)
FastAPI tự động sinh tài liệu Swagger bằng cách đọc các kiểu dữ liệu khai báo. Nếu chúng ta dùng một lớp phong bì chung chứa trường `data: Any`, Swagger sẽ không thể hiển thị cấu trúc chi tiết của dữ liệu bên trong (ví dụ: cấu trúc của một Employee hay Project). Bằng cách khai báo Generics (`ApiResponse[T]`), FastAPI sẽ sinh cấu trúc tài liệu chính xác tuyệt đối cho từng đối tượng tương ứng.

### 3. Chuẩn hóa cấu trúc phân trang (PagedResponse)
Đảm bảo tất cả các API truy vấn danh sách dữ liệu lớn đều trả về cấu trúc phân trang giống nhau, chứa thông tin siêu dữ liệu phân trang (`PaginationMeta`): số trang hiện tại, số bản ghi trên mỗi trang, tổng số bản ghi và tổng số trang.

## Luồng hoạt động

```mermaid
graph TD
    Router[FastAPI Router Handler] -->|Return Data| ResponseBuilder[app/core/response_builder.py]
    ResponseBuilder -->|Wrap into Generic Schema| ApiResponse[ApiResponse[T] / PagedResponse[T]]
    ApiResponse -->|Serialize to JSON| JSONResponse[JSON Response to Client]
    ApiResponse -->|Generate Doc Schema| SwaggerUI[Swagger UI OpenAPI Spec]
```

## Ví dụ trong TaskSyncEnterprise

### 1. Định nghĩa Schema bọc Generics ([response.py](file:///e:/TaskSyncEnterprise/backend/app/schemas/response.py)):
```python
from typing import Generic, TypeVar, List, Optional
from pydantic import BaseModel

T = TypeVar("T")

class PaginationMeta(BaseModel):
    page: int
    size: int
    total: int
    pages: int

class ApiResponse(BaseModel, Generic[T]):
    success: bool = True
    message: str = "Thành công"
    request_id: Optional[str] = None
    timestamp: str
    data: Optional[T] = None

class PagedResponse(BaseModel, Generic[T]):
    success: bool = True
    message: str = "Thành công"
    request_id: Optional[str] = None
    timestamp: str
    data: List[T]
    meta: PaginationMeta
```

### 2. Trình dựng phản hồi ([response_builder.py](file:///e:/TaskSyncEnterprise/backend/app/core/response_builder.py)):
```python
from datetime import datetime, timezone
from app.core.request_context import get_request_id
from app.schemas.response import ApiResponse

class ResponseBuilder:
    @staticmethod
    def success(data: T, message: str = "Thành công") -> ApiResponse[T]:
        return ApiResponse(
            success=True,
            message=message,
            request_id=get_request_id(),
            timestamp=datetime.now(timezone.utc).isoformat(),
            data=data
        )
```

## Khi nào sử dụng
*   Sử dụng `ResponseBuilder.success(...)` cho tất cả các API trả về dữ liệu đơn lẻ (ví dụ: lấy thông tin chi tiết một nhân viên).
*   Sử dụng `ResponseBuilder.pagination(...)` cho tất cả các API trả về danh sách dữ liệu có phân trang.
*   Sử dụng `ResponseBuilder.no_content()` khi xóa tài nguyên thành công (trả về mã HTTP 204 không chứa body).

## Sai lầm thường gặp
*   **Sử dụng `data: Any`:** Làm mất khả năng tự động sinh tài liệu mẫu dữ liệu của Swagger UI. Luôn sử dụng `ApiResponse[T]` kèm kiểu dữ liệu `T` cụ thể.
*   **Tính toán sai tổng số trang (pages):** Quên sử dụng hàm làm tròn lên (ví dụ: `ceil(total / size)`) khi tính toán tổng số trang từ tổng số bản ghi và kích thước trang.

## Best Practices
1. Giữ cho logic phân trang nằm độc lập ở tầng tiện ích hoặc helper để tránh viết lại công thức tính toán ở nhiều controller khác nhau.
2. Tích hợp lấy mã Request ID tự động từ ContextVar để điền vào phong bì phản hồi mà không yêu cầu lập trình viên truyền thủ công.

## Checklist ghi nhớ
- [x] Sử dụng kiểu `TypeVar` để cấu hình Generics cho Pydantic.
- [x] Trả về cấu trúc phân trang đồng nhất cho mọi API danh sách.
- [x] Đăng ký kiểu trả về chính xác trong định nghĩa route `response_model=ApiResponse[EmployeeResponse]`.

## Tổng kết
Kiến trúc phản hồi doanh nghiệp chuẩn hóa giúp nâng cao tính chuyên nghiệp của hệ thống API, hỗ trợ các nhà phát triển frontend tích hợp nhanh chóng và sinh tài liệu kỹ thuật hoàn toàn tự động.
