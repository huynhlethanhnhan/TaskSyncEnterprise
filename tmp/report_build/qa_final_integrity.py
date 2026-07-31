from pathlib import Path
from zipfile import ZipFile, BadZipFile

FILES = [
    Path(r"E:\TaskSyncEnterprise\Report\Agile\Agile_Project_Management_TaskSyncEnterprise.xlsx"),
    Path(r"E:\TaskSyncEnterprise\Report\Agile\Agile_Tracking_TaskSyncEnterprise.xlsx"),
    Path(r"E:\TaskSyncEnterprise\Report\Agile\Bao_cao_Giua_ky_Sprint_1_TaskSyncEnterprise.docx"),
    Path(r"E:\TaskSyncEnterprise\Report\Agile\Bao_cao_Agile_Scrum_TaskSyncEnterprise.docx"),
    Path(r"E:\TaskSyncEnterprise\Report\Agile\Daily_Scrum_1_TaskSyncEnterprise.docx"),
    Path(r"E:\TaskSyncEnterprise\Report\Agile\Daily_Scrum_2_TaskSyncEnterprise.docx"),
    Path(r"E:\TaskSyncEnterprise\Report\Agile\Bao_cao_dong_gop_thanh_vien_Sprint_1_TaskSyncEnterprise.docx"),
    Path(r"E:\TaskSyncEnterprise\Report\Môn kiến trúc phần mềm\Bao_cao_Kien_truc_phan_mem_TaskSyncEnterprise.docx"),
    Path(r"E:\TaskSyncEnterprise\Report\Sơ đồ Diagram\Thuyet_minh_So_do_TaskSyncEnterprise.docx"),
]

failed = []
for path in FILES:
    if not path.is_file() or path.stat().st_size == 0:
        failed.append(f"MISSING_OR_EMPTY: {path}")
        continue
    try:
        with ZipFile(path) as archive:
            bad_member = archive.testzip()
            if bad_member:
                failed.append(f"BAD_MEMBER {bad_member}: {path}")
                continue
            names = set(archive.namelist())
            required = "word/document.xml" if path.suffix == ".docx" else "xl/workbook.xml"
            if required not in names:
                failed.append(f"MISSING {required}: {path}")
                continue
    except BadZipFile:
        failed.append(f"BAD_ZIP: {path}")
        continue
    print(f"OK | {path.name} | {path.stat().st_size:,} bytes")

if failed:
    print("\n".join(failed))
    raise SystemExit(1)

print(f"PASS | {len(FILES)} final deliverables")
