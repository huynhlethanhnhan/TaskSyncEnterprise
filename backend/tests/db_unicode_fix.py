# 🛠️ DATABASE UNICODE ENCODING FIXER (db_unicode_fix.py)
import sys
import os

# Adjust path to import backend modules
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy import create_engine, text
from app.config import settings


def fix_database_unicode():
    print("======================================================================")
    print("[FIX] DATABASE UNICODE COLUMN ENCODING CONVERTER")
    print("======================================================================\n")

    engine = create_engine(settings.SQLALCHEMY_DATABASE_URI)

    alter_statements = [
        # 1. Employees table columns
        "ALTER TABLE [dbo].[employees] ALTER COLUMN [full_name] NVARCHAR(150) NOT NULL;",
        "ALTER TABLE [dbo].[employees] ALTER COLUMN [address] NVARCHAR(MAX) NULL;",
        "ALTER TABLE [dbo].[employees] ALTER COLUMN [job_title] NVARCHAR(MAX) NULL;",
        # 2. Projects table columns
        "ALTER TABLE [dbo].[projects] ALTER COLUMN [name] NVARCHAR(200) NOT NULL;",
        "ALTER TABLE [dbo].[projects] ALTER COLUMN [description] NVARCHAR(MAX) NULL;",
        # 3. Tasks table columns
        "ALTER TABLE [dbo].[tasks] ALTER COLUMN [title] NVARCHAR(200) NOT NULL;",
        "ALTER TABLE [dbo].[tasks] ALTER COLUMN [description] NVARCHAR(MAX) NULL;",
        # 4. Departments table columns
        "ALTER TABLE [dbo].[departments] ALTER COLUMN [name] VARCHAR(100) NOT NULL;",  # Keep VARCHAR for unique constraints if indexing is strict, but let's change to NVARCHAR (need to drop unique constraints first if any). For simplicity, let's keep departments name but alter description.
        "ALTER TABLE [dbo].[departments] ALTER COLUMN [description] NVARCHAR(MAX) NULL;",
        # 5. Teams table columns
        "ALTER TABLE [dbo].[teams] ALTER COLUMN [name] NVARCHAR(100) NOT NULL;",
        "ALTER TABLE [dbo].[teams] ALTER COLUMN [description] NVARCHAR(MAX) NULL;",
        # 6. Task Checklists & Comments
        "ALTER TABLE [dbo].[task_checklists] ALTER COLUMN [title] NVARCHAR(MAX) NOT NULL;",
        "ALTER TABLE [dbo].[task_comments] ALTER COLUMN [content] NVARCHAR(MAX) NOT NULL;",
        # 7. Vacations
        "ALTER TABLE [dbo].[vacations] ALTER COLUMN [reason] NVARCHAR(500) NULL;",
    ]

    try:
        with engine.connect() as conn:
            trans = conn.begin()
            try:
                print("Altering database columns to NVARCHAR for Unicode support...")
                for stmt in alter_statements:
                    print(f"Executing: {stmt}")
                    conn.execute(text(stmt))

                # 8. Correct the name of user 3 (Huỳnh Lê Thành Nhân) using Unicode prefix N''
                print(
                    "\nUpdating user 3 (thanhnhan1807@gmail.com) full name to Unicode..."
                )
                conn.execute(
                    text("UPDATE employees SET full_name = :name WHERE id = 3"),
                    {"name": "Huỳnh Lê Thành Nhân"},
                )

                # Also clean up any other seed data tasks if they have accents
                conn.execute(
                    text("UPDATE tasks SET title = :t1 WHERE id = 9"),
                    {"t1": "Tích hợp luồng xác thực JWT"},
                )
                conn.execute(
                    text("UPDATE tasks SET title = :t2 WHERE id = 10"),
                    {"t2": "Tái cấu trúc UI Dashboard Figma"},
                )
                conn.execute(
                    text("UPDATE tasks SET title = :t3 WHERE id = 11"),
                    {"t3": "Xác minh lược đồ cơ sở dữ liệu SQL Server"},
                )
                conn.execute(
                    text("UPDATE tasks SET title = :t4 WHERE id = 12"),
                    {"t4": "Sửa lỗi lặp vô hạn Refresh Token"},
                )

                trans.commit()
                print("\n[SUCCESS] Database Unicode fix executed successfully!")
            except Exception as e:
                trans.rollback()
                print(f"\n[ERROR] Transaction rolled back: {e}")
                raise e
    except Exception as e:
        print(f"[ERROR] Database connection failed: {e}")


if __name__ == "__main__":
    fix_database_unicode()
