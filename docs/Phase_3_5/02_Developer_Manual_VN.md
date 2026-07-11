# Cẩm Nang Lập Trình Viên - Hướng Dẫn Sử Dụng Redis Caching

Tài liệu này hướng dẫn chi tiết cho các lập trình viên cách tích hợp, mở rộng và bảo trì hệ thống Caching trong dự án TaskSyncEnterprise.

---

## 1. Cấu Trúc Thư Mục Caching

Tất cả mã nguồn liên quan đến Caching nằm gọn trong gói `backend/app/cache/`:

```
backend/app/cache/
├── __init__.py            # Xuất bản (Export) các Singleton (cache_service, cache_manager)
├── cache_keys.py          # Tập trung định nghĩa tất cả cấu trúc Khóa (Keys) & Mẫu quét (Patterns)
├── cache_invalidator.py   # Lớp quản lý trục xuất (evict) bộ đệm tập trung
├── cache_manager.py       # Tầng logic Read-Through (cache_model, cache_collection)
├── cache_service.py       # Wrapper cấp thấp kết nối Redis, thực hiện get/set/delete
├── redis_client.py        # Singleton khởi tạo lười (lazy-loading) hồ kết nối (Connection Pool)
└── exceptions.py          # Lớp định nghĩa lỗi Cache nội bộ (CacheError, v.v.)
```

---

## 2. Chi Tiết Các Hợp Phần

### 2.1. Khởi Tạo Lười (Lazy Client) - `redis_client.py`
Để tránh cấp phát tài nguyên socket thừa khi ứng dụng khởi chạy hoặc khi thực thi các bài kiểm thử unit tests (được cô lập khỏi Redis), `RedisClient` sử dụng cơ chế **Lazy Instantiation**:
*   Kết nối tới Redis chỉ được tạo ra khi có yêu cầu đọc/ghi đầu tiên phát sinh.
*   Cung cấp cơ chế `ping()` để kiểm tra sức khỏe Redis lúc khởi động hệ thống.
*   Cung cấp phương thức `close()` để ngắt toàn bộ Socket Pool một cách an toàn khi ứng dụng nhận tín hiệu tắt (Lifespan Shutdown).

### 2.2. Tầng Quản Lý Read-Through - `cache_manager.py`
Tầng này cung cấp hai API chính cho các routers:
1.  `cache_model(key, creator_fn, ttl, response_model)`: Dùng để cache một đối tượng đơn lẻ (ví dụ: thông tin một Employee, một Task).
2.  `cache_collection(key, creator_fn, ttl, response_model)`: Dùng để cache một danh sách các đối tượng (ví dụ: danh sách Task có phân trang).

### 2.3. Tầng Trục Xuất Tập Trung - `cache_invalidator.py`
Chứa các phương thức tĩnh (`classmethod`) thực hiện trục xuất bộ đệm khi có hành động CRUD xảy ra. Nó giải quyết bài toán **Cascading Invalidation (Trục xuất lan tỏa)**:
*   *Ví dụ:* Khi một Task được chỉnh sửa, hệ thống sẽ tự động trục xuất:
    *   Khóa của Task đó (`task:{id}`).
    *   Mẫu danh sách Task (`task:list:*`).
    *   Khóa của Dự án chứa Task đó (`project:{project_id}`) để cập nhật lại tiến độ phần trăm.
    *   Khóa của Nhân viên thực hiện Task đó (`employee:{employee_id}`) để làm mới thống kê khối lượng công việc.
    *   Các khóa Dashboard tổng hợp (`dashboard:summary`, `dashboard:analytics`).

---

## 3. Hướng Dẫn Tích Hợp Caching Vào API Mới

Để áp dụng Caching cho một thực thể mới (ví dụ: `Team`), hãy thực hiện nghiêm ngặt 3 bước sau:

### Bước 1: Định nghĩa Khóa (Key Schema) trong `cache_keys.py`
Thêm các hàm sinh key chi tiết và mẫu quét danh sách vào [cache_keys.py](file:///e:/TaskSyncEnterprise/backend/app/cache/cache_keys.py):
```python
def get_team_key(team_id: int) -> str:
    """Trả về khóa chi tiết nhóm."""
    return f"team:{team_id}"

def get_team_list_pattern() -> str:
    """Trả về mẫu quét tìm danh sách nhóm (dành cho Invalidation)."""
    return "team:list:*"

def get_team_list_key(skip: int, limit: int, search: str | None = None) -> str:
    """Trả về khóa danh sách nhóm có phân trang và tìm kiếm."""
    search_part = f"search:{search}" if search else "all"
    return f"team:list:skip:{skip}:limit:{limit}:{search_part}"
```

### Bước 2: Sử dụng `CacheManager` trong Router để Đọc dữ liệu (Read-Through)
Mở file router tương ứng, import `cache_manager` và bọc hàm truy vấn cơ sở dữ liệu:
```python
from app.cache import cache_manager, cache_keys
from app.schemas.team import TeamResponse

@router.get("/{team_id}", response_model=TeamResponse)
def get_team(team_id: int, db: Session = Depends(get_db)):
    # Định nghĩa khóa
    key = cache_keys.get_team_key(team_id)
    
    # Định nghĩa hàm nạp dữ liệu từ Database khi Cache Miss
    def load_from_db():
        obj = crud_team.get_by_id(db, team_id)
        if not obj:
            raise HTTPException(status_code=404, detail="Team not found")
        return obj

    # Trả về thông qua cache manager
    return cache_manager.cache_model(
        key=key,
        creator_fn=load_from_db,
        ttl=1800,  # 30 phút
        response_model=TeamResponse
    )
```

### Bước 3: Thêm Hàm Trục Xuất Cache vào `CacheInvalidator`
Thêm phương thức trục xuất tương ứng vào [cache_invalidator.py](file:///e:/TaskSyncEnterprise/backend/app/cache/cache_invalidator.py):
```python
    @classmethod
    def invalidate_team(cls, team_id: int | None = None) -> None:
        """Trục xuất cache liên quan đến Team."""
        if not cls._check_redis_ready():
            return
        try:
            service = cls._get_service()
            # Xóa key chi tiết nếu có
            if team_id is not None:
                service.delete(cache_keys.get_team_key(team_id))
            
            # Quét và xóa các danh sách trang nhóm
            service.clear_pattern(cache_keys.get_team_list_pattern())
            logger.info("Team Cache Invalidated")
        except Exception as e:
            logger.error(f"Failed to invalidate team cache: {e}")
```
Sau đó, gọi hàm `CacheInvalidator.invalidate_team(team_id)` ngay sau khi thực hiện các lệnh tạo mới, cập nhật hoặc xóa nhóm trong router.

---

## 4. Các Quy Ước Viết Code & Tiêu Chuẩn Thiết Kế

### 4.1. Quy ước đặt tên
*   Hàm lấy khóa chi tiết: `get_[tên_thực_thể]_key(id)` -> Ví dụ: `get_project_key(project_id)`.
*   Hàm lấy khóa danh sách: `get_[tên_thực_thể]_list_key(skip, limit, ...)` -> Nhất thiết phải chứa các tham số phân trang.
*   Hàm lấy mẫu quét: `get_[tên_thực_thể]_list_pattern()` -> Trả về chuỗi kết thúc bằng dấu sao `*`.

### 4.2. Nguyên tắc Fail-Silent
Không bao giờ được phép để khối lệnh gọi Cache làm dừng chương trình. Mọi thao tác ghi cache hoặc invalidation phải nằm trong khối `try-except Exception` để bắt tất cả các lỗi kết nối từ Redis và ghi nhận logs dưới dạng `Warning/Error` kèm tham số hệ thống `extra={"operation": "..."}`.

### 4.3. Không bao giờ sử dụng lệnh `KEYS` của Redis
Lệnh `KEYS` duyệt tuyến tính qua toàn bộ các key trong Redis dưới dạng blocking đơn luồng, có thể gây treo hệ thống khi số lượng key lên tới hàng triệu. Phải luôn sử dụng hàm `clear_pattern` của `CacheService` vì hàm này sử dụng lệnh `SCAN` không chặn để duyệt và xóa các key khớp mẫu theo từng đợt (chunk) nhỏ.

---

## 5. Câu Hỏi Thường Gặp (FAQ) & Các Lỗi Phổ Biến

### Lỗi 1: `AttributeError: module 'app.cache.cache_service' has no attribute '_get_client'`
*   **Nguyên nhân:** Xảy ra do import vòng (Circular Import) khi file `cache_invalidator.py` cố gắng import `cache_service` ở đầu file vào thời điểm package `app.cache` đang được khởi tạo.
*   **Giải pháp:** Thực hiện import cục bộ (lazy import) `cache_service` bên trong các phương thức của `CacheInvalidator` thay vì import ở mức độ module.

### Lỗi 2: Bản ghi thay đổi trong DB nhưng API vẫn trả về dữ liệu cũ
*   **Nguyên nhân:** Lập trình viên quên không gọi hàm `CacheInvalidator` tương ứng ở cuối route ghi dữ liệu (POST/PUT/PATCH/DELETE), hoặc khóa được sinh ra trong hàm CRUD không khớp với mẫu quét trục xuất.
*   **Giải pháp:** Kiểm tra xem route cập nhật dữ liệu đã import và gọi đúng `CacheInvalidator` chưa. Chạy lệnh `MONITOR` trên `redis-cli` để kiểm tra xem khóa nào bị xóa khi gửi request ghi.

### Lỗi 3: Lỗi Serialization kiểu dữ liệu `datetime`
*   **Nguyên nhân:** Thư viện `json` mặc định của Python không hỗ trợ mã hóa đối tượng `datetime` sang chuỗi JSON.
*   **Giải pháp:** Trong `CacheService`, chúng ta sử dụng `Pydantic TypeAdapter` hoặc `model_dump(mode="json")` để tự động chuẩn hóa định dạng ngày giờ sang chuỗi ISO-8601 trước khi lưu vào Redis.
