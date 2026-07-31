import fs from "node:fs/promises";
import { SpreadsheetFile, Workbook } from "@oai/artifact-tool";

const root = "E:/TaskSyncEnterprise";
const outputDir = `${root}/Report/Agile`;
const previewRoot = `${root}/tmp/report_build/xlsx_preview_v3`;
await fs.mkdir(outputDir, { recursive: true });
await fs.mkdir(previewRoot, { recursive: true });

const data = JSON.parse(await fs.readFile(`${root}/tmp/report_build/report_data_v3.json`, "utf8"));
const backlog = data.backlog;
const sprint1 = backlog.filter((item) => item.sprint === "Sprint 1");
const sprint2 = backlog.filter((item) => item.sprint === "Sprint 2");

const C = {
  navy: "#17365D",
  blue: "#2E75B6",
  cyan: "#DDEBF7",
  green: "#C6EFCE",
  greenText: "#006100",
  yellow: "#FFF2CC",
  orange: "#FCE4D6",
  red: "#FFC7CE",
  redText: "#9C0006",
  gray: "#E7E6E6",
  grayText: "#595959",
  purple: "#E4DFEC",
  white: "#FFFFFF",
  ink: "#1F2937",
  light: "#F7F9FC",
};

function title(sheet, range, text, subtitle = "") {
  sheet.getRange(range).merge();
  const cell = sheet.getRange(range.split(":")[0]);
  cell.values = [[subtitle ? `${text}\n${subtitle}` : text]];
  sheet.getRange(range).format = {
    fill: C.navy,
    font: { bold: true, color: C.white, size: 17 },
    wrapText: true,
    verticalAlignment: "center",
    horizontalAlignment: "left",
    rowHeight: subtitle ? 54 : 38,
  };
}

function section(sheet, range, text) {
  sheet.getRange(range).merge();
  sheet.getRange(range.split(":")[0]).values = [[text]];
  sheet.getRange(range).format = {
    fill: C.blue,
    font: { bold: true, color: C.white, size: 11 },
    verticalAlignment: "center",
    rowHeight: 26,
  };
}

function header(range) {
  range.format = {
    fill: C.cyan,
    font: { bold: true, color: C.ink, size: 10 },
    wrapText: true,
    verticalAlignment: "center",
    horizontalAlignment: "center",
    borders: { preset: "all", style: "thin", color: "#A6A6A6" },
    rowHeight: 32,
  };
}

function body(range) {
  range.format = {
    font: { color: C.ink, size: 9 },
    wrapText: true,
    verticalAlignment: "center",
    borders: {
      insideHorizontal: { style: "thin", color: "#D9E2F3" },
      bottom: { style: "thin", color: "#D9E2F3" },
    },
  };
}

function statusRules(range) {
  const rules = [
    ["Hoàn thành", C.green, C.greenText],
    ["Đã kiểm thử", C.green, C.greenText],
    ["Đã hỗ trợ", C.cyan, C.ink],
    ["Sơ khai", C.yellow, "#7F6000"],
    ["Đang", C.yellow, "#7F6000"],
    ["Chưa xác minh", C.orange, "#9C5700"],
    ["Cần làm", C.gray, C.grayText],
    ["Dự kiến", C.gray, C.grayText],
    ["Chưa có sản phẩm", C.red, C.redText],
  ];
  for (const [text, fill, color] of rules) {
    range.conditionalFormats.add("containsText", {
      text,
      format: { fill, font: { color, bold: true } },
    });
  }
}

function setWidths(sheet, widths) {
  for (const [col, width] of Object.entries(widths)) {
    sheet.getRange(`${col}:${col}`).format.columnWidth = width;
  }
}

function finalizeSheet(sheet, freezeRows = 3, freezeCols = 0) {
  sheet.showGridlines = false;
  if (freezeRows) sheet.freezePanes.freezeRows(freezeRows);
  if (freezeCols) sheet.freezePanes.freezeColumns(freezeCols);
}

function addGuide(workbook, filePurpose) {
  const sheet = workbook.worksheets.add("Hướng dẫn đọc");
  title(sheet, "A1:G2", "HƯỚNG DẪN ĐỌC FILE", filePurpose);
  sheet.getRange("A4:G4").values = [["Màu", "Ý nghĩa", "Cách sử dụng", "Nguồn", "Cập nhật bởi", "Thời điểm", "Lưu ý"]];
  header(sheet.getRange("A4:G4"));
  const rows = [
    ["Xanh lá", "Hoàn thành và đã xác minh", "Có mã nguồn, kiểm thử hoặc demo", "Git/Jira/giao diện", "Người xác minh", "Sau khi kiểm tra", "Không chỉ dựa vào trạng thái Jira"],
    ["Xanh dương", "Đã hỗ trợ hoặc có bằng chứng kỹ thuật", "Dùng cho hỗ trợ/debug/kiểm thử", "Git/Jira/biên bản", "Scrum Team", "Trong Sprint", "Không đồng nghĩa làm chính"],
    ["Vàng", "Sơ khai hoặc đang thực hiện", "Chức năng có nhưng chưa hoàn thiện", "Mã nguồn/demo", "Người phụ trách", "Trong Sprint", "Cần kiểm thử thêm"],
    ["Cam", "Chưa xác minh", "Có tên trên Jira nhưng thiếu minh chứng", "Jira", "Product Owner", "Khi rà soát", "Không tính là hoàn thành đã xác minh"],
    ["Đỏ", "Chưa có sản phẩm bàn giao", "Công việc được giao nhưng chưa có kết quả", "Biên bản nhóm", "Product Owner", "Cuối Sprint", "Cách viết trung tính"],
    ["Xám", "Kế hoạch Sprint 2", "Chưa thuộc phạm vi giữa kỳ", "Product Backlog", "Product Owner", "Sau 23/07", "Không dùng để tính kết quả Sprint 1"],
  ];
  sheet.getRange(`A5:G${4 + rows.length}`).values = rows;
  body(sheet.getRange(`A5:G${4 + rows.length}`));
  const fills = [C.green, C.cyan, C.yellow, C.orange, C.red, C.gray];
  fills.forEach((fill, index) => {
    sheet.getRange(`A${5 + index}`).format.fill = fill;
    sheet.getRange(`A${5 + index}`).format.font = { bold: true, color: C.ink };
  });
  section(sheet, "A13:G13", "QUY ƯỚC SPRINT");
  sheet.getRange("A14:G16").values = [
    ["Tên sử dụng", "Nguồn được gộp", "Bắt đầu", "Kết thúc", "Trạng thái", "Mục đích", "Ghi chú"],
    ["Sprint 1", "Sprint cũ 1 + 2", new Date("2026-07-02"), new Date("2026-07-23"), "Giữa kỳ", "Phạm vi nộp giữa kỳ", "Chỉ ghi kết quả đã xác minh"],
    ["Sprint 2", "Sprint cũ 3 + 4", new Date("2026-07-24"), new Date("2026-08-20"), "Dự kiến", "Tiếp tục hoàn thiện", "Các mốc có thể cập nhật"],
  ];
  header(sheet.getRange("A14:G14"));
  body(sheet.getRange("A15:G16"));
  sheet.getRange("C15:D16").format.numberFormat = "dd/mm/yyyy";
  setWidths(sheet, { A: 16, B: 28, C: 15, D: 15, E: 17, F: 28, G: 36 });
  finalizeSheet(sheet, 4);
}

function addBacklogSheet(workbook, name, rows, includeAll = false) {
  const sheet = workbook.worksheets.add(name);
  title(sheet, "A1:P2", name.toUpperCase(), includeAll ? "50 User Story - tiếng Việt - tách trạng thái Jira và trạng thái đã xác minh" : `${rows.length} User Story`);
  const headers = [
    "Mã", "Jira", "Epic", "Tên User Story", "Câu chuyện người dùng", "Ưu tiên", "Điểm",
    "Sprint", "Trạng thái Jira", "Trạng thái đã xác minh", "Người được giao trên Jira",
    "Người thực hiện/xác minh", "Tiêu chí chấp nhận", "Nguồn", "Ngày kết thúc Sprint", "Ghi chú",
  ];
  sheet.getRange("A4:P4").values = [headers];
  header(sheet.getRange("A4:P4"));
  const values = rows.map((item) => [
    item.id, item.jira, item.epic, item.title, item.user_story, item.priority, item.sp,
    item.sprint, item.jira_status, item.verified_status, item.jira_assignee,
    item.verified_owner, item.acceptance, item.source,
    new Date(item.sprint === "Sprint 1" ? "2026-07-23" : "2026-08-20"),
    item.sprint === "Sprint 2" ? "Dự kiến hoặc tiếp tục xác minh sau giữa kỳ" : "",
  ]);
  if (values.length) {
    sheet.getRange(`A5:P${4 + values.length}`).values = values;
    body(sheet.getRange(`A5:P${4 + values.length}`));
    sheet.getRange(`G5:G${4 + values.length}`).format.numberFormat = "0";
    sheet.getRange(`O5:O${4 + values.length}`).format.numberFormat = "dd/mm/yyyy";
    statusRules(sheet.getRange(`I5:J${4 + values.length}`));
    const tableName = `${name.replace(/[^A-Za-z0-9]/g, "") || "Backlog"}Table`;
    const table = sheet.tables.add(`A4:P${4 + values.length}`, true, tableName);
    table.style = "TableStyleMedium2";
  }
  setWidths(sheet, {
    A: 9, B: 9, C: 10, D: 32, E: 46, F: 12, G: 9, H: 12,
    I: 18, J: 29, K: 24, L: 40, M: 52, N: 35, O: 16, P: 34,
  });
  finalizeSheet(sheet, 4, 3);
  return sheet;
}

function buildManagement() {
  const wb = Workbook.create();
  addGuide(wb, "Quản lý Product Backlog và phạm vi hai Sprint");

  const dash = wb.worksheets.add("Tổng quan");
  title(dash, "A1:N2", "AGILE PROJECT MANAGEMENT", "TaskSyncEnterprise - giữa kỳ tập trung Sprint 1");
  section(dash, "A4:E4", "CHỈ SỐ CHÍNH");
  dash.getRange("A5:B10").values = [
    ["Chỉ số", "Giá trị"],
    ["Tổng User Story", null],
    ["User Story Sprint 1", null],
    ["User Story Sprint 2", null],
    ["Tổng Story Point", null],
    ["Story Point Sprint 1", null],
  ];
  header(dash.getRange("A5:B5"));
  body(dash.getRange("A6:B10"));
  dash.getRange("B6:B10").formulas = [
    ["=COUNTA('Product Backlog'!$A$5:$A$54)"],
    ["=COUNTIF('Product Backlog'!$H$5:$H$54,\"Sprint 1\")"],
    ["=COUNTIF('Product Backlog'!$H$5:$H$54,\"Sprint 2\")"],
    ["=SUM('Product Backlog'!$G$5:$G$54)"],
    ["=SUMIF('Product Backlog'!$H$5:$H$54,\"Sprint 1\",'Product Backlog'!$G$5:$G$54)"],
  ];
  dash.getRange("B6:B10").format = { fill: C.light, font: { bold: true, color: C.navy, size: 13 }, horizontalAlignment: "center" };

  section(dash, "D4:F4", "TRẠNG THÁI JIRA");
  dash.getRange("D5:E9").values = [
    ["Trạng thái", "Số lượng"],
    ["Hoàn thành", null],
    ["Đang thực hiện", null],
    ["Cần làm", null],
    ["Chưa tạo riêng trên Jira", null],
  ];
  header(dash.getRange("D5:E5"));
  body(dash.getRange("D6:E9"));
  dash.getRange("E6:E9").formulas = [
    ["=COUNTIF('Product Backlog'!$I$5:$I$54,D6)"],
    ["=COUNTIF('Product Backlog'!$I$5:$I$54,D7)"],
    ["=COUNTIF('Product Backlog'!$I$5:$I$54,D8)"],
    ["=COUNTIF('Product Backlog'!$I$5:$I$54,D9)"],
  ];
  statusRules(dash.getRange("D6:D9"));

  section(dash, "A13:F13", "KẾT LUẬN ĐỌC NHANH");
  dash.getRange("A14:F18").merge();
  dash.getRange("A14").values = [[
    "Sprint 1 được dùng cho báo cáo giữa kỳ, từ 02/07/2026 đến 23/07/2026. " +
    "Trạng thái Jira và trạng thái đã xác minh được tách riêng vì Jira phản ánh phân công nhưng không đủ chứng minh người được giao đã trực tiếp triển khai. " +
    "Lịch sử Git trong giai đoạn Sprint 1 ghi nhận 79 commit dưới các biến thể tên tài khoản của Huỳnh Lê Thành Nhân."
  ]];
  dash.getRange("A14:F18").format = { fill: C.yellow, wrapText: true, verticalAlignment: "center", font: { size: 11, color: C.ink } };

  const chart = dash.charts.add("bar", dash.getRange("D5:E9"));
  chart.title = "Phân bố trạng thái Jira";
  chart.hasLegend = false;
  chart.setPosition("H4", "N18");
  chart.xAxis = { axisType: "textAxis" };
  chart.yAxis = { numberFormatCode: "0" };
  setWidths(dash, { A: 24, B: 14, C: 3, D: 25, E: 14, F: 3, G: 3, H: 13, I: 13, J: 13, K: 13, L: 13, M: 13, N: 13 });
  finalizeSheet(dash, 4);

  addBacklogSheet(wb, "Product Backlog", backlog, true);
  addBacklogSheet(wb, "Sprint 1", sprint1);
  addBacklogSheet(wb, "Sprint 2", sprint2);

  const epicSheet = wb.worksheets.add("Epic");
  title(epicSheet, "A1:F2", "DANH SÁCH EPIC", "Nhóm phạm vi chức năng của TaskSyncEnterprise");
  epicSheet.getRange("A4:F4").values = [["Mã Epic", "Tên Epic", "Số Story", "Sprint 1", "Sprint 2", "Ghi chú"]];
  header(epicSheet.getRange("A4:F4"));
  const epicRows = Object.entries(data.epics).map(([code, name]) => [
    code, name,
    backlog.filter((x) => x.epic === code).length,
    sprint1.filter((x) => x.epic === code).length,
    sprint2.filter((x) => x.epic === code).length,
    code === "EP12" ? "Bổ sung từ mã nguồn/Git để phản ánh công việc vận hành thực tế" : "",
  ]);
  epicSheet.getRange(`A5:F${4 + epicRows.length}`).values = epicRows;
  body(epicSheet.getRange(`A5:F${4 + epicRows.length}`));
  setWidths(epicSheet, { A: 12, B: 40, C: 12, D: 12, E: 12, F: 48 });
  finalizeSheet(epicSheet, 4);

  const lists = wb.worksheets.add("Danh mục");
  title(lists, "A1:F2", "DANH MỤC DÙNG CHUNG");
  lists.getRange("A4:F10").values = [
    ["Sprint", "Ưu tiên", "Trạng thái Jira", "Trạng thái xác minh", "Nguồn", "Mức đóng góp"],
    ["Sprint 1", "Cao", "Hoàn thành", "Hoàn thành và có thể demo", "Jira", "Đóng góp chính"],
    ["Sprint 2", "Trung bình", "Đang thực hiện", "Hoàn thành phần chính", "Git", "Có đóng góp và hỗ trợ"],
    ["", "Thấp", "Cần làm", "Sơ khai", "Mã nguồn", "Hỗ trợ kiểm thử"],
    ["", "", "Chưa tạo riêng trên Jira", "Đang hoàn thiện", "Giao diện", "Chưa có sản phẩm xác minh"],
    ["", "", "", "Chưa xác minh", "Biên bản", ""],
    ["", "", "", "Dự kiến", "", ""],
  ];
  header(lists.getRange("A4:F4"));
  body(lists.getRange("A5:F10"));
  setWidths(lists, { A: 16, B: 16, C: 26, D: 32, E: 22, F: 32 });
  finalizeSheet(lists, 4);
  return wb;
}

function mainTaskStatus(item) {
  const s = item.verified_status;
  if (s.includes("Hoàn thành")) return "Hoàn thành";
  if (s.includes("Sơ khai") || s.includes("Đang")) return "Đang thực hiện";
  return "Chưa xác minh";
}

function buildSprint1Tasks() {
  const tasks = sprint1.map((item, index) => ({
    id: `CV-${String(index + 1).padStart(3, "0")}`,
    story: item.id,
    title: `Phân tích, triển khai và tích hợp: ${item.title}`,
    owner: "Huỳnh Lê Thành Nhân",
    role: "Thực hiện chính",
    status: mainTaskStatus(item),
    start: new Date(index < 8 ? "2026-07-02" : index < 19 ? "2026-07-09" : "2026-07-16"),
    end: new Date(index < 8 ? "2026-07-08" : index < 19 ? "2026-07-15" : "2026-07-23"),
    evidence: item.source,
    note: item.verified_status,
  }));
  const support = [
    ["US02", "Kiểm thử gia hạn phiên đăng nhập", "Nguyễn Đức Mạnh", "Kiểm thử", "Đã kiểm thử cơ bản", "Jira JD-15"],
    ["US01", "Hỗ trợ xác định nguyên nhân lỗi 404 sau đăng nhập", "Nguyễn Đức Mạnh", "Hỗ trợ debug", "Đã hỗ trợ", "Báo cáo nhóm"],
    ["US43", "Hỗ trợ kiểm thử lịch công việc", "Nguyễn Đức Mạnh", "Calendar", "Đã kiểm thử cơ bản", "Mã nguồn CalendarPage"],
    ["US45", "Hỗ trợ kiểm thử trung tâm thông báo", "Nguyễn Đức Mạnh", "Thông báo", "Đã kiểm thử cơ bản", "Mã nguồn NotificationsPage"],
    ["US04", "Chạy thử phân quyền trên local", "Nguyễn Lê Huy Hoàng", "Kiểm thử demo", "Đã kiểm thử cơ bản", "Thông tin nhóm cung cấp"],
    ["US15", "Chạy thử bảng Kanban trên local", "Nguyễn Lê Huy Hoàng", "Kiểm thử demo", "Đã kiểm thử cơ bản", "Thông tin nhóm cung cấp"],
    ["US18", "Chạy thử luồng bình luận trên local", "Nguyễn Lê Huy Hoàng", "Kiểm thử demo", "Chưa xác minh", "Thiếu biên bản"],
    ["US11", "Xây dựng sơ đồ dự án theo phân công", "Phạm Tuấn Anh", "Sơ đồ/tài liệu", "Chưa có sản phẩm bàn giao", "Jira JD-24"],
    ["US16", "Xây dựng sơ đồ phụ thuộc công việc", "Phạm Tuấn Anh", "Sơ đồ/tài liệu", "Chưa có sản phẩm bàn giao", "Jira JD-29"],
    ["US06", "Nghiên cứu tài liệu hồ sơ nhân viên", "Nguyễn Anh Tuấn", "Nghiên cứu tài liệu", "Chưa có sản phẩm bàn giao", "Thông tin nhóm cung cấp"],
    ["US30", "Tổng hợp thuật ngữ báo cáo", "Nguyễn Anh Tuấn", "Nghiên cứu tài liệu", "Chưa có sản phẩm bàn giao", "Thông tin nhóm cung cấp"],
  ];
  support.forEach((row, index) => tasks.push({
    id: `HT-${String(index + 1).padStart(3, "0")}`,
    story: row[0], title: row[1], owner: row[2], role: row[3], status: row[4],
    start: new Date(index < 4 ? "2026-07-08" : "2026-07-15"),
    end: new Date(index < 4 ? "2026-07-22" : "2026-07-23"),
    evidence: row[5], note: "Phân biệt công việc được giao và kết quả đã xác minh.",
  }));
  return tasks;
}

const sprint1Tasks = buildSprint1Tasks();

function buildTracking() {
  const wb = Workbook.create();
  addGuide(wb, "Theo dõi công việc, Daily Scrum, lỗi, rủi ro và bằng chứng");

  const dash = wb.worksheets.add("Tổng quan");
  title(dash, "A1:N2", "AGILE TRACKING", "Theo dõi giữa kỳ Sprint 1");
  dash.getRange("A4:E10").values = [
    ["Chỉ số", "Giá trị", "", "Trạng thái", "Số công việc"],
    ["Tổng công việc Sprint 1", null, "", "Hoàn thành", null],
    ["Công việc hoàn thành", null, "", "Đang thực hiện", null],
    ["Công việc đang thực hiện", null, "", "Đã hỗ trợ", null],
    ["Chưa xác minh/bàn giao", null, "", "Đã kiểm thử cơ bản", null],
    ["Số buổi cập nhật chính", 8, "", "Chưa có sản phẩm bàn giao", null],
    ["", null, "", "Chưa xác minh", null],
  ];
  header(dash.getRange("A4:B4"));
  header(dash.getRange("D4:E4"));
  body(dash.getRange("A5:B10"));
  body(dash.getRange("D5:E10"));
  dash.getRange("B5:B8").formulas = [
    ["=COUNTA('Công việc Sprint 1'!$A$5:$A$60)"],
    ["=COUNTIF('Công việc Sprint 1'!$F$5:$F$60,\"Hoàn thành\")"],
    ["=COUNTIF('Công việc Sprint 1'!$F$5:$F$60,\"Đang thực hiện\")"],
    ["=COUNTIF('Công việc Sprint 1'!$F$5:$F$60,\"Chưa xác minh\")+COUNTIF('Công việc Sprint 1'!$F$5:$F$60,\"Chưa có sản phẩm bàn giao\")"],
  ];
  dash.getRange("E5:E10").formulas = [
    ["=COUNTIF('Công việc Sprint 1'!$F$5:$F$60,D5)"],
    ["=COUNTIF('Công việc Sprint 1'!$F$5:$F$60,D6)"],
    ["=COUNTIF('Công việc Sprint 1'!$F$5:$F$60,D7)"],
    ["=COUNTIF('Công việc Sprint 1'!$F$5:$F$60,D8)"],
    ["=COUNTIF('Công việc Sprint 1'!$F$5:$F$60,D9)"],
    ["=COUNTIF('Công việc Sprint 1'!$F$5:$F$60,D10)"],
  ];
  dash.getRange("B5:B9").format = { fill: C.light, font: { bold: true, color: C.navy, size: 13 }, horizontalAlignment: "center" };
  statusRules(dash.getRange("D5:D10"));
  const chart = dash.charts.add("bar", dash.getRange("D4:E10"));
  chart.title = "Trạng thái công việc Sprint 1";
  chart.hasLegend = false;
  chart.setPosition("G4", "N18");
  chart.yAxis = { numberFormatCode: "0" };
  section(dash, "A12:E12", "NGUYÊN TẮC XÁC MINH");
  dash.getRange("A13:E17").merge();
  dash.getRange("A13").values = [[
    "Git xác nhận 79 commit trong giai đoạn 04/07-23/07 dưới tên Huỳnh Lê Thành Nhân/huynh. " +
    "Jira có 50 issue nhưng trạng thái và người được giao không tự động chứng minh người đó đã trực tiếp viết mã. " +
    "Các công việc thiếu sản phẩm bàn giao được giữ ở trạng thái chưa xác minh."
  ]];
  dash.getRange("A13:E17").format = { fill: C.yellow, wrapText: true, verticalAlignment: "center", font: { size: 11 } };
  setWidths(dash, { A: 28, B: 14, C: 4, D: 30, E: 14, F: 4, G: 13, H: 13, I: 13, J: 13, K: 13, L: 13, M: 13, N: 13 });
  finalizeSheet(dash, 4);

  const tasks = wb.worksheets.add("Công việc Sprint 1");
  title(tasks, "A1:K2", "CÔNG VIỆC SPRINT 1", "Phân rã theo người thực hiện thực tế, không chia đều hình thức");
  tasks.getRange("A4:K4").values = [[
    "Mã việc", "User Story", "Công việc", "Người phụ trách", "Vai trò", "Trạng thái",
    "Bắt đầu", "Kết thúc", "Bằng chứng", "Ghi chú xác minh", "Mức độ",
  ]];
  header(tasks.getRange("A4:K4"));
  const taskValues = sprint1Tasks.map((t) => [
    t.id, t.story, t.title, t.owner, t.role, t.status, t.start, t.end, t.evidence, t.note,
    t.owner === "Huỳnh Lê Thành Nhân" ? "Đóng góp chính" : t.status.includes("Chưa có") ? "Chưa xác minh" : "Hỗ trợ",
  ]);
  tasks.getRange(`A5:K${4 + taskValues.length}`).values = taskValues;
  body(tasks.getRange(`A5:K${4 + taskValues.length}`));
  tasks.getRange(`G5:H${4 + taskValues.length}`).format.numberFormat = "dd/mm/yyyy";
  statusRules(tasks.getRange(`F5:F${4 + taskValues.length}`));
  const tasksTable = tasks.tables.add(`A4:K${4 + taskValues.length}`, true, "Sprint1TasksTable");
  tasksTable.style = "TableStyleMedium2";
  setWidths(tasks, { A: 12, B: 12, C: 48, D: 28, E: 22, F: 25, G: 14, H: 14, I: 38, J: 40, K: 20 });
  finalizeSheet(tasks, 4, 2);

  const daily = wb.worksheets.add("Daily Scrum Sprint 1");
  title(daily, "A1:J2", "DAILY SCRUM / CẬP NHẬT TIẾN ĐỘ SPRINT 1", "Buổi chính tại trường và cập nhật ngắn theo tiến độ");
  daily.getRange("A4:J4").values = [[
    "Ngày", "Loại", "Thời gian", "Người cập nhật", "Đã làm", "Sẽ làm", "Trở ngại",
    "Quyết định", "Trạng thái tham gia", "Minh chứng",
  ]];
  header(daily.getRange("A4:J4"));
  const dailyRows = [
    ["2026-07-02", "Bắt đầu Sprint", "15-30 phút", "Huỳnh Lê Thành Nhân", "Chốt phạm vi Sprint và kiểm tra dự án ban đầu", "Ổn định cấu trúc, database và đăng nhập", "Nhóm phản hồi chậm", "Product Owner chủ động chốt phạm vi", "Tham gia chính", "Jira/Git"],
    ["2026-07-06", "Cập nhật tại trường", "15-30 phút", "Huỳnh Lê Thành Nhân; Nguyễn Đức Mạnh", "Rà cấu trúc Backend/Frontend", "Kiểm tra Login/Auth và lỗi 404", "Thiếu phản hồi từ một số thành viên", "Ưu tiên luồng đăng nhập", "Có trao đổi", "Git"],
    ["2026-07-08", "Cập nhật tại trường", "15-30 phút", "Huỳnh Lê Thành Nhân; Nguyễn Đức Mạnh", "Củng cố nền tảng Backend", "Test phiên đăng nhập và cấu hình", "Lỗi môi trường và database", "Tách lỗi cấu hình khỏi nghiệp vụ", "Có trao đổi", "Git 1472f9b, 999f826"],
    ["2026-07-13", "Cập nhật tại trường", "15-30 phút", "Huỳnh Lê Thành Nhân; Nguyễn Đức Mạnh", "Hoàn thiện health, logging, cache và thông báo nền tảng", "Kiểm thử tích hợp và xử lý cảnh báo", "Khó bố trí thời gian", "Kiểm tra từng luồng nhỏ", "Có trao đổi", "Git 83d2a69, 8d196a0"],
    ["2026-07-15", "Cập nhật tại trường", "15-30 phút", "Huỳnh Lê Thành Nhân; Nguyễn Đức Mạnh; Nguyễn Lê Huy Hoàng", "Rà giao diện demo và các route chính", "Kiểm thử Login, Task, Project", "Một số màn hình chưa ổn định", "Giới hạn demo vào chức năng cốt lõi", "Huy Hoàng hỗ trợ test", "Jira/Git"],
    ["2026-07-20", "Cập nhật tại trường", "15-30 phút", "Huỳnh Lê Thành Nhân; Nguyễn Đức Mạnh", "Hoàn thiện Docker, sao lưu và cấu hình triển khai", "Rà lỗi còn lại, chuẩn bị demo", "CI và cấu hình môi trường", "Dùng cấu hình mẫu có thể tái lập", "Có trao đổi", "Git 052f835"],
    ["2026-07-22", "Cập nhật tại trường", "15-30 phút", "Huỳnh Lê Thành Nhân; Nguyễn Đức Mạnh", "Rà Task, Project, Notification và Calendar", "Chốt lỗi nghiêm trọng trước giữa kỳ", "Thiếu bằng chứng từ người được giao", "Tách trạng thái Jira và xác minh", "Có trao đổi", "Jira/Git"],
    ["2026-07-23", "Sprint Review", "30-60 phút", "Huỳnh Lê Thành Nhân; nhóm tham dự theo thực tế", "Hoàn thiện kiểm thử chấp nhận, CI và tài liệu kỹ thuật", "Ghi nhận phần chưa ổn định sang Sprint 2", "Nhiều hạng mục thiếu phản hồi", "Chỉ báo cáo phần đã xác minh", "Kết thúc Sprint 1", "Git 4475139 và các commit ngày 23/07"],
  ].map((r) => [new Date(r[0]), ...r.slice(1)]);
  daily.getRange(`A5:J${4 + dailyRows.length}`).values = dailyRows;
  body(daily.getRange(`A5:J${4 + dailyRows.length}`));
  daily.getRange(`A5:A${4 + dailyRows.length}`).format.numberFormat = "dd/mm/yyyy";
  setWidths(daily, { A: 14, B: 24, C: 15, D: 38, E: 46, F: 44, G: 38, H: 44, I: 25, J: 35 });
  finalizeSheet(daily, 4, 3);

  const bugs = wb.worksheets.add("Lỗi và Debug");
  title(bugs, "A1:I2", "LỖI VÀ QUÁ TRÌNH DEBUG", "Tổng hợp từ lịch sử Git Sprint 1");
  bugs.getRange("A4:I4").values = [["Ngày", "Nhóm lỗi", "Hiện tượng", "Nguyên nhân", "Xử lý", "Người chính", "Hỗ trợ", "Kết quả", "Bằng chứng"]];
  header(bugs.getRange("A4:I4"));
  const bugRows = [
    ["2026-07-07", "Database", "Schema và default không tương thích môi trường test", "Khác biệt SQL Server/SQLite", "Chuẩn hóa model và migration", "Huỳnh Lê Thành Nhân", "", "Đã xử lý", "8db87cd, 7d6cf11"],
    ["2026-07-09", "Hạ tầng Backend", "Cấu hình và ngoại lệ chưa nhất quán", "Nền tảng cũ thiếu chuẩn hóa", "Củng cố config, logging, exception", "Huỳnh Lê Thành Nhân", "", "Đã xử lý", "1be79c5, 47a9ddc"],
    ["2026-07-10", "Thông báo", "Thiếu nền tảng gửi thông báo", "Chưa có khung đa kênh", "Xây dựng notification framework", "Huỳnh Lê Thành Nhân", "Nguyễn Đức Mạnh kiểm thử", "Hoàn thành phần nền tảng", "17fb551"],
    ["2026-07-11", "Hiệu năng", "Truy vấn lặp lại", "Chưa có cache", "Bổ sung Redis và cache manager", "Huỳnh Lê Thành Nhân", "", "Hoàn thành phần nền tảng", "83d2a69"],
    ["2026-07-12", "Quan sát hệ thống", "Khó theo dõi lỗi runtime", "Thiếu health/metrics/tracing", "Bổ sung health, metrics, logging, tracing", "Huỳnh Lê Thành Nhân", "", "Đã xử lý", "e9918fe, 3a542b4"],
    ["2026-07-14", "Docker/Database", "Sai thông tin kết nối SQL Server", "Thông tin môi trường không đồng bộ", "Đồng bộ cấu hình và hướng dẫn", "Huỳnh Lê Thành Nhân", "", "Đã xử lý", "9059157"],
    ["2026-07-16", "CI", "Pipeline lỗi phụ thuộc và test", "Cấu hình workflow chưa phù hợp", "Sửa action, dependency và test isolation", "Huỳnh Lê Thành Nhân", "Nguyễn Đức Mạnh hỗ trợ lỗi 404", "Đã xử lý", "8f3f7bc, 6d9e049"],
    ["2026-07-17", "Bảo mật triển khai", "Container chưa đủ an toàn", "Cấu hình production còn thiếu", "Harden Docker và môi trường", "Huỳnh Lê Thành Nhân", "", "Hoàn thành phần nền tảng", "de5b73a"],
    ["2026-07-20", "Triển khai", "Thiếu reverse proxy/backup", "Chưa hoàn chỉnh hạ tầng vận hành", "Bổ sung Nginx và sao lưu", "Huỳnh Lê Thành Nhân", "", "Đã xử lý", "a1aeb75, 0cf8cd4"],
    ["2026-07-23", "Runtime", "Kiểm thử chấp nhận còn lỗi", "Tích hợp nhiều thành phần", "Sửa lỗi runtime và bổ sung test", "Huỳnh Lê Thành Nhân", "", "Đã xử lý tại mốc giữa kỳ", "f09a486, 899c926"],
    ["2026-07-23", "404/Login", "Một số đường dẫn không tồn tại hoặc điều hướng sai", "Route và trạng thái xác thực", "Rà ProtectedRoute và trang 404", "Huỳnh Lê Thành Nhân", "Nguyễn Đức Mạnh hỗ trợ", "Hoàn thành phần chính", "AppRouter/NotFoundPage"],
  ].map((r) => [new Date(r[0]), ...r.slice(1)]);
  bugs.getRange(`A5:I${4 + bugRows.length}`).values = bugRows;
  body(bugs.getRange(`A5:I${4 + bugRows.length}`));
  bugs.getRange(`A5:A${4 + bugRows.length}`).format.numberFormat = "dd/mm/yyyy";
  statusRules(bugs.getRange(`H5:H${4 + bugRows.length}`));
  setWidths(bugs, { A: 14, B: 22, C: 38, D: 40, E: 44, F: 28, G: 30, H: 24, I: 28 });
  finalizeSheet(bugs, 4, 2);

  const risks = wb.worksheets.add("Rủi ro và trở ngại");
  title(risks, "A1:H2", "RỦI RO VÀ TRỞ NGẠI SPRINT 1");
  risks.getRange("A4:H4").values = [["Mã", "Rủi ro/trở ngại", "Xác suất", "Ảnh hưởng", "Mức độ", "Ứng phó", "Chủ sở hữu", "Trạng thái"]];
  header(risks.getRange("A4:H4"));
  const riskRows = [
    ["RR-01", "Thành viên phản hồi chậm hoặc không có sản phẩm bàn giao", "Cao", "Cao", "Nghiêm trọng", "Thu hẹp phạm vi demo; tách trạng thái giao việc và xác minh", "Product Owner", "Đang kiểm soát"],
    ["RR-02", "Thiếu ảnh họp trực tiếp", "Cao", "Trung bình", "Cao", "Dùng biên bản tái dựng trung thực; không khẳng định có ảnh", "Scrum Master", "Chấp nhận"],
    ["RR-03", "Jira không phản ánh đúng người trực tiếp triển khai", "Cao", "Cao", "Nghiêm trọng", "Đối chiếu Git, code và demo", "Product Owner", "Đã xử lý trong hồ sơ"],
    ["RR-04", "Một số màn hình chưa chạy ổn định", "Trung bình", "Cao", "Cao", "Chỉ demo Login, Task, Project, Employee sơ khai, Notification, Calendar", "Development Team", "Chuyển phần còn lại Sprint 2"],
    ["RR-05", "Thiếu kiểm thử đầy đủ", "Cao", "Cao", "Nghiêm trọng", "Ghi rõ trạng thái sơ khai/chưa xác minh", "QA", "Đang xử lý"],
    ["RR-06", "Dữ liệu MSSV chưa đủ", "Trung bình", "Thấp", "Trung bình", "Để trống Phạm Tuấn Anh và Nguyễn Anh Tuấn để bổ sung", "Nhóm", "Chờ cập nhật"],
  ];
  risks.getRange(`A5:H${4 + riskRows.length}`).values = riskRows;
  body(risks.getRange(`A5:H${4 + riskRows.length}`));
  statusRules(risks.getRange(`H5:H${4 + riskRows.length}`));
  setWidths(risks, { A: 10, B: 46, C: 14, D: 14, E: 18, F: 52, G: 24, H: 28 });
  finalizeSheet(risks, 4);

  const evidence = wb.worksheets.add("Bằng chứng");
  title(evidence, "A1:G2", "DANH MỤC BẰNG CHỨNG", "Ảnh giao diện sẽ do nhóm bổ sung sau");
  evidence.getRange("A4:G4").values = [["Mã", "Loại", "Nội dung", "Vị trí/đường dẫn", "Người liên quan", "Trạng thái", "Ghi chú"]];
  header(evidence.getRange("A4:G4"));
  const evidenceRows = [
    ["BC-01", "Jira", "50 issue của dự án JD", "https://task-snycs-enterprise.atlassian.net/issues/?jql=project%20%3D%20JD%20ORDER%20BY%20key%20ASC", "Nhóm", "Có", "Chỉ dùng làm nguồn phân công/trạng thái"],
    ["BC-02", "Git", "79 commit từ 04/07 đến 23/07", "E:\\TaskSyncEnterprise\\.git", "Huỳnh Lê Thành Nhân", "Có", "Ba biến thể tên tác giả cùng một người"],
    ["BC-03", "Mã nguồn", "Frontend, Backend, Database", "E:\\TaskSyncEnterprise", "Huỳnh Lê Thành Nhân", "Có", "Dùng xác minh chức năng"],
    ["BC-04", "Ảnh", "Giao diện Login", "Hình X. Giao diện đăng nhập", "Nhóm bổ sung", "Chưa bổ sung", ""],
    ["BC-05", "Ảnh", "Giao diện Task/Kanban", "Hình X. Giao diện quản lý công việc", "Nhóm bổ sung", "Chưa bổ sung", ""],
    ["BC-06", "Ảnh", "Giao diện Project", "Hình X. Giao diện quản lý dự án", "Nhóm bổ sung", "Chưa bổ sung", ""],
    ["BC-07", "Ảnh", "Giao diện Employee sơ khai", "Hình X. Giao diện quản lý nhân viên", "Nhóm bổ sung", "Chưa bổ sung", ""],
    ["BC-08", "Ảnh", "Notification và Calendar", "Hình X. Trung tâm thông báo và lịch công việc", "Nhóm bổ sung", "Chưa bổ sung", ""],
    ["BC-09", "Biên bản", "Họp trực tiếp thứ Hai/thứ Tư", "Daily Scrum Sprint 1", "Nhóm", "Không có ảnh", "Báo cáo dùng biên bản tái dựng theo thông tin Product Owner"],
  ];
  evidence.getRange(`A5:G${4 + evidenceRows.length}`).values = evidenceRows;
  body(evidence.getRange(`A5:G${4 + evidenceRows.length}`));
  statusRules(evidence.getRange(`F5:F${4 + evidenceRows.length}`));
  setWidths(evidence, { A: 10, B: 14, C: 38, D: 62, E: 28, F: 22, G: 48 });
  finalizeSheet(evidence, 4);

  const sprint2Sheet = addBacklogSheet(wb, "Sprint 2", sprint2);
  return wb;
}

async function saveAndPreview(workbook, filename, previewNames) {
  const output = await SpreadsheetFile.exportXlsx(workbook);
  await output.save(`${outputDir}/${filename}`);
  for (const name of previewNames) {
    const blob = await workbook.render({ sheetName: name, autoCrop: "all", scale: 1, format: "png" });
    await fs.writeFile(`${previewRoot}/${filename.replace(".xlsx", "")}_${name.replaceAll(" ", "_")}.png`, new Uint8Array(await blob.arrayBuffer()));
  }
  const errors = await workbook.inspect({
    kind: "match",
    searchTerm: "#REF!|#DIV/0!|#VALUE!|#NAME\\?|#N/A",
    options: { useRegex: true, maxResults: 100 },
    maxChars: 2000,
    summary: `${filename} formula error scan`,
  });
  console.log(filename, errors.ndjson);
}

const management = buildManagement();
await saveAndPreview(
  management,
  "Agile_Project_Management_TaskSyncEnterprise.xlsx",
  ["Hướng dẫn đọc", "Tổng quan", "Product Backlog", "Sprint 1", "Sprint 2", "Epic", "Danh mục"],
);

const tracking = buildTracking();
await saveAndPreview(
  tracking,
  "Agile_Tracking_TaskSyncEnterprise.xlsx",
  ["Hướng dẫn đọc", "Tổng quan", "Công việc Sprint 1", "Daily Scrum Sprint 1", "Lỗi và Debug", "Rủi ro và trở ngại", "Bằng chứng", "Sprint 2"],
);

console.log("Built workbook package version 3.");
