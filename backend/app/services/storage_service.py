# 📂 FILE: app/services/storage_service.py
import os
import shutil
import uuid
from fastapi import UploadFile, HTTPException

# Cấu hình đường dẫn gốc lưu trữ file
UPLOAD_DIR = "uploads"
AVATAR_DIR = os.path.join(UPLOAD_DIR, "avatars")
ATTACHMENT_DIR = os.path.join(UPLOAD_DIR, "attachments")

# Giới hạn dung lượng: 5MB cho Avatar, 20MB cho Tài liệu đính kèm Task
MAX_AVATAR_SIZE = 5 * 1024 * 1024       # 🟢 Đã sửa thành dấu # (5 Megabytes)
MAX_ATTACHMENT_SIZE = 20 * 1024 * 1024  # 🟢 Đã sửa thành dấu # (20 Megabytes)

# Danh sách định dạng ảnh được phép làm Avatar
ALLOWED_AVATAR_EXTENSIONS = {".jpg", ".jpeg", ".png", ".webp"}

class StorageService:
    
    @staticmethod
    def _ensure_directories():
        """Đảm bảo các thư mục lưu trữ luôn tồn tại trên ổ cứng"""
        os.makedirs(AVATAR_DIR, exist_ok=True)
        os.makedirs(ATTACHMENT_DIR, exist_ok=True)

    @staticmethod
    def save_avatar(file: UploadFile) -> str:
        """Xử lý lưu trữ ảnh đại diện (Avatar)"""
        StorageService._ensure_directories()
        
        # 1. Kiểm tra định dạng file
        file_ext = os.path.splitext(file.filename)[1].lower()
        if file_ext not in ALLOWED_AVATAR_EXTENSIONS:
            raise HTTPException(
                status_code=400, 
                detail=f"Định dạng file không hỗ trợ! Chỉ chấp nhận: {', '.join(ALLOWED_AVATAR_EXTENSIONS)}"
            )
            
        # 2. Kiểm tra dung lượng file (Đọc tạm thời để check size)
        file.file.seek(0, os.SEEK_END)
        file_size = file.file.tell()
        file.file.seek(0)  # 🟢 Đã sửa thành dấu # (Reset con trỏ file về ban đầu)
        
        if file_size > MAX_AVATAR_SIZE:
            raise HTTPException(status_code=400, detail="Dung lượng ảnh đại diện không được vượt quá 5MB!")

        # 3. Đổi tên file thành chuỗi UUID duy nhất để tránh trùng tên đè file trên Server
        unique_filename = f"{uuid.uuid4()}{file_ext}"
        file_path = os.path.join(AVATAR_DIR, unique_filename)

        # 4. Ghi file xuống ổ cứng vật lý
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
            
        # Trả về đường dẫn lưu trong DB để Frontend gọi link truy cập
        return f"/uploads/avatars/{unique_filename}"

    @staticmethod
    def save_attachment(file: UploadFile) -> dict:
        """Xử lý lưu trữ tài liệu đính kèm Task"""
        StorageService._ensure_directories()
        
        # 1. Kiểm tra dung lượng file
        file.file.seek(0, os.SEEK_END)
        file_size = file.file.tell()
        file.file.seek(0)
        
        if file_size > MAX_ATTACHMENT_SIZE:
            raise HTTPException(status_code=400, detail="Dung lượng file đính kèm không được vượt quá 20MB!")

        # 2. Đổi tên file để lưu trữ vật lý an toàn
        file_ext = os.path.splitext(file.filename)[1].lower()
        unique_filename = f"{uuid.uuid4()}{file_ext}"
        physical_path = os.path.join(ATTACHMENT_DIR, unique_filename)

        # 3. Ghi file xuống ổ cứng
        with open(physical_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)

        # Trả về metadata đầy đủ để router chèn thông tin vào bảng task_attachments
        return {
            "file_name": file.filename,
            "file_path": f"/uploads/attachments/{unique_filename}",
            "file_size": file_size,
            "mime_type": file.content_type or "application/octet-stream"
        }