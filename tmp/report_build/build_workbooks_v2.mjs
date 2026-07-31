import fs from "node:fs/promises";
import path from "node:path";
import { SpreadsheetFile, Workbook } from "@oai/artifact-tool";

const root = "E:/TaskSyncEnterprise";
const outputDir = `${root}/Report/Agile`;
const previewRoot = `${root}/tmp/report_build/xlsx_preview_v2`;
await fs.mkdir(outputDir, { recursive: true });
await fs.mkdir(previewRoot, { recursive: true });

const sourceRows = JSON.parse(
  await fs.readFile(`${root}/tmp/report_build/reference_extract/current_backlog.json`, "utf8"),
);

const titlesVi = [
  "Đăng nhập người dùng an toàn",
  "Tự động gia hạn phiên đăng nhập",
  "Thiết lập danh mục vai trò",
  "Kiểm soát truy cập theo vai trò",
  "Trình hướng dẫn tạo dự án",
  "Phân công thành viên vào dự án",
  "Bảng Kanban quản lý công việc",
  "Tải nhiều tài liệu cùng lúc",
  "Tạo hồ sơ nhân viên",
  "Nhập danh sách nhân viên hàng loạt",
  "Gán quản lý trực tiếp",
  "Thiết lập cơ cấu phòng ban",
  "Bổ nhiệm trưởng phòng",
  "Quy trình phê duyệt chuyển phòng ban",
  "Sơ đồ phụ thuộc công việc",
  "Bộ lọc Backlog nâng cao",
  "Phân rã công việc",
  "Luồng bình luận cộng tác",
  "Trình soạn thảo tạo công việc",
  "Thông báo khi nhắc tên người dùng",
  "Dọn dẹp tệp không còn sử dụng",
  "Gửi đơn nghỉ phép",
  "Bảng phê duyệt đơn nghỉ phép",
  "Tích lũy số dư phép năm",
  "Hủy đơn nghỉ khẩn cấp",
  "Gửi yêu cầu làm thêm giờ",
  "Bảng phê duyệt làm thêm giờ",
  "Kiểm tra chính sách làm thêm giờ",
  "Cảnh báo thời gian thực trong ứng dụng",
  "Theo dõi cột mốc dự án",
  "Bảo mật tệp đính kèm công việc",
  "Cài đặt kênh nhận thông báo",
  "Email tổng hợp công việc hằng ngày",
  "Gửi lại thông báo thất bại",
  "Dashboard hiệu suất vận hành",
  "Bản đồ phân bổ nguồn lực phòng ban",
  "Trình tạo báo cáo dự án tùy chỉnh",
  "Dự báo Burnup của dự án",
  "Kiểm toán thay đổi cơ cấu tổ chức",
  "Tra cứu nhật ký kiểm toán bảo mật",
];

const epicVi = {
  EP01: "Xác thực và kiểm soát truy cập",
  EP02: "Quản lý hồ sơ nhân viên",
  EP03: "Quản lý cơ cấu phòng ban",
  EP04: "Quản lý dự án và phân bổ nhóm",
  EP05: "Vòng đời công việc và Kanban",
  EP06: "Cộng tác nhóm",
  EP07: "Quản lý tài liệu và tệp",
  EP08: "Quản lý nghỉ phép",
  EP09: "Quản lý làm thêm giờ",
  EP10: "Thông báo đa kênh",
  EP11: "Phân tích hiệu suất và báo cáo",
  EP12: "Kiểm toán và an toàn hệ thống",
};

const team = [
  ["A", "Phạm Tuấn Anh", "2311558672", "Product Owner / Full-stack"],
  ["B", "Nguyễn Đức Mạnh", "2200010420", "Backend Developer"],
  ["C", "Nguyễn Lê Huy Hoàng", "2311554285", "Frontend Developer"],
  ["D", "Phạm Anh Tuấn", "2311559121", "QA / Tester"],
  ["E", "Nguyễn Lê Thành Nhân", "2000004897", "Business Analyst / Documentation"],
];

const priorityVi = { Highest: "Cao", Medium: "Trung bình", Lowest: "Thấp" };
const valueVi = { High: "Cao", Medium: "Trung bình", Low: "Thấp" };

function actor(epic) {
  if (epic === "EP01") return "người dùng hoặc quản trị viên";
  if (epic === "EP02" || epic === "EP03") return "quản trị viên nhân sự";
  if (epic === "EP04") return "quản lý dự án";
  if (epic === "EP05" || epic === "EP06" || epic === "EP07") return "thành viên dự án";
  if (epic === "EP08" || epic === "EP09") return "nhân viên hoặc người phê duyệt";
  if (epic === "EP10") return "người dùng hệ thống";
  return "quản lý hoặc quản trị viên";
}

function benefit(epic) {
  if (epic === "EP01") return "truy cập đúng phạm vi quyền và bảo vệ phiên làm việc";
  if (epic === "EP02" || epic === "EP03") return "duy trì dữ liệu tổ chức và nhân sự nhất quán";
  if (epic === "EP04") return "lập kế hoạch và phân bổ nguồn lực rõ ràng";
  if (epic === "EP05" || epic === "EP06") return "theo dõi tiến độ và cộng tác hiệu quả";
  if (epic === "EP07") return "quản lý tài liệu an toàn và có thể truy vết";
  if (epic === "EP08" || epic === "EP09") return "thực hiện quy trình hành chính đúng chính sách";
  if (epic === "EP10") return "nhận thông tin đúng sự kiện và đúng kênh";
  if (epic === "EP11") return "có dữ liệu hỗ trợ quyết định";
  return "truy vết thay đổi và kiểm tra tuân thủ";
}

function acceptance(title) {
  return [
    `Chức năng “${title}” hoạt động đúng với dữ liệu hợp lệ.`,
    "Trường hợp sai dữ liệu hoặc sai quyền bị từ chối và có thông báo rõ ràng.",
    "Dữ liệu được lưu nhất quán; thao tác nhạy cảm có Audit Log và sự kiện chỉ phát sau commit.",
  ].join(" ");
}

const backlog = sourceRows.map((row, index) => {
  const id = row[0];
  const epic = row[1];
  const sprint = row[9];
  const title = titlesVi[index];
  const ownerIndex = index % team.length;
  return {
    id,
    epic,
    epicName: epicVi[epic],
    feature: row[2],
    title,
    userStory: `Là ${actor(epic)}, tôi muốn ${title.toLowerCase()} để ${benefit(epic)}.`,
    priority: priorityVi[row[5]] ?? row[5],
    sp: Number(row[6]),
    businessValue: valueVi[row[7]] ?? row[7],
    owner: team[ownerIndex][1],
    sprint,
    sourceStatus: "Hoàn thành (theo hồ sơ nguồn)",
    verifiedStatus: sprint === "Sprint 1" ? "Cần đối chiếu evidence" : "Kế hoạch - chờ xác nhận",
    acceptance: acceptance(title),
    source: "Agile_Project_Management.xlsx; Agile_Tracking.xlsx; mã nguồn TaskSyncEnterprise",
  };
});

const colors = {
  navy: "#17365D",
  blue: "#2E75B6",
  teal: "#0F766E",
  gold: "#B78318",
  light: "#F3F6F9",
  lightBlue: "#DDEBF7",
  white: "#FFFFFF",
  gray: "#5B6573",
  green: "#E2F0D9",
  yellow: "#FFF2CC",
  red: "#FCE4D6",
  purple: "#E4DFEC",
};

function titleBand(sheet, range, title, subtitle) {
  sheet.getRange(range).merge();
  sheet.getRange(range.split(":")[0]).values = [[title]];
  sheet.getRange(range).format = {
    fill: colors.navy,
    font: { color: colors.white, bold: true, size: 18 },
    verticalAlignment: "center",
  };
  sheet.getRange(range).format.rowHeight = 34;
  const start = range.split(":")[0].replace(/\d+$/, "2");
  const end = range.split(":")[1].replace(/\d+$/, "2");
  sheet.getRange(`${start}:${end}`).merge();
  sheet.getRange(start).values = [[subtitle]];
  sheet.getRange(`${start}:${end}`).format = {
    fill: colors.lightBlue,
    font: { color: colors.gray, italic: true, size: 10 },
    wrapText: true,
    verticalAlignment: "center",
  };
  sheet.getRange(`${start}:${end}`).format.rowHeight = 32;
}

function headerStyle(range) {
  range.format = {
    fill: colors.blue,
    font: { color: colors.white, bold: true, size: 10 },
    horizontalAlignment: "center",
    verticalAlignment: "center",
    wrapText: true,
    borders: { preset: "all", style: "thin", color: "#B4C7E7" },
  };
  range.format.rowHeight = 30;
}

function bodyStyle(range, size = 9) {
  range.format = {
    font: { color: "#1F2937", size },
    verticalAlignment: "center",
    wrapText: true,
    borders: {
      insideHorizontal: { style: "thin", color: "#D9E2F3" },
      bottom: { style: "thin", color: "#D9E2F3" },
    },
  };
}

function formatTableSheet(sheet, title, subtitle, headers, rows, widths) {
  const lastCol = String.fromCharCode(64 + headers.length);
  titleBand(sheet, `A1:${lastCol}1`, title, subtitle);
  sheet.getRange(`A4:${lastCol}4`).values = [headers];
  sheet.getRange(`A5:${lastCol}${4 + rows.length}`).values = rows;
  headerStyle(sheet.getRange(`A4:${lastCol}4`));
  bodyStyle(sheet.getRange(`A5:${lastCol}${4 + rows.length}`));
  widths.forEach((width, index) => {
    const col = String.fromCharCode(65 + index);
    sheet.getRange(`${col}1:${col}${4 + rows.length}`).format.columnWidth = width;
  });
  sheet.getRange(`A4:${lastCol}${4 + rows.length}`).format.autofitRows();
  sheet.freezePanes.freezeRows(4);
  sheet.showGridLines = false;
}

function addStatusRules(range) {
  range.conditionalFormats.add("containsText", {
    text: "Hoàn thành",
    format: { fill: colors.green, font: { color: "#1F6B45", bold: true } },
  });
  range.conditionalFormats.add("containsText", {
    text: "Đang thực hiện",
    format: { fill: colors.yellow, font: { color: "#7F6000", bold: true } },
  });
  range.conditionalFormats.add("containsText", {
    text: "Kế hoạch",
    format: { fill: colors.purple, font: { color: "#4C3A75", bold: true } },
  });
  range.conditionalFormats.add("containsText", {
    text: "Cần",
    format: { fill: colors.red, font: { color: "#9C0006", bold: true } },
  });
}

function businessDays(start, end) {
  const days = [];
  const current = new Date(start);
  while (current <= end) {
    const weekday = current.getDay();
    if (weekday !== 0 && weekday !== 6) days.push(new Date(current));
    current.setDate(current.getDate() + 1);
  }
  return days;
}

function buildManagementWorkbook() {
  const wb = Workbook.create();
  const overview = wb.worksheets.add("Tổng quan");
  const product = wb.worksheets.add("Product Backlog");
  const sprint1 = wb.worksheets.add("Sprint 1");
  const sprint2 = wb.worksheets.add("Sprint 2");
  const epics = wb.worksheets.add("Epic");
  const scrumTeam = wb.worksheets.add("Nhóm Scrum");
  const release = wb.worksheets.add("Kế hoạch phát hành");
  const dictionary = wb.worksheets.add("Danh mục");
  for (const sheet of wb.worksheets.items) sheet.showGridLines = false;

  titleBand(
    overview,
    "A1:H1",
    "QUẢN LÝ DỰ ÁN AGILE - TASKSYNCENTERPRISE",
    "Toàn bộ nội dung đã Việt hóa. Sprint nguồn 1+2 thành Sprint 1; Sprint nguồn 3+4 thành Sprint 2.",
  );
  overview.getRange("A4:B12").values = [
    ["Chỉ số", "Giá trị"],
    ["Tổng User Stories", null],
    ["Tổng Story Points", null],
    ["Sprint 1 - User Stories", null],
    ["Sprint 1 - Story Points", null],
    ["Sprint 2 - User Stories", null],
    ["Sprint 2 - Story Points", null],
    ["Tổng Epic", null],
    ["Tỷ lệ có chủ sở hữu", null],
  ];
  headerStyle(overview.getRange("A4:B4"));
  bodyStyle(overview.getRange("A5:B12"));
  overview.getRange("B5").formulas = [["=COUNTA('Product Backlog'!$A$5:$A$44)"]];
  overview.getRange("B6").formulas = [["=SUM('Product Backlog'!$G$5:$G$44)"]];
  overview.getRange("B7").formulas = [["=COUNTIF('Product Backlog'!$J$5:$J$44,\"Sprint 1\")"]];
  overview.getRange("B8").formulas = [["=SUMIF('Product Backlog'!$J$5:$J$44,\"Sprint 1\",'Product Backlog'!$G$5:$G$44)"]];
  overview.getRange("B9").formulas = [["=COUNTIF('Product Backlog'!$J$5:$J$44,\"Sprint 2\")"]];
  overview.getRange("B10").formulas = [["=SUMIF('Product Backlog'!$J$5:$J$44,\"Sprint 2\",'Product Backlog'!$G$5:$G$44)"]];
  overview.getRange("B11").formulas = [["=COUNTA('Epic'!$A$5:$A$16)"]];
  overview.getRange("B12").formulas = [["=COUNTIF('Product Backlog'!$I$5:$I$44,\"<>\")/COUNTA('Product Backlog'!$A$5:$A$44)"]];
  overview.getRange("B5:B11").format.numberFormat = "0";
  overview.getRange("B12").format.numberFormat = "0%";
  overview.getRange("D4:F6").values = [
    ["Sprint", "User Stories", "Story Points"],
    ["Sprint 1", null, null],
    ["Sprint 2", null, null],
  ];
  headerStyle(overview.getRange("D4:F4"));
  bodyStyle(overview.getRange("D5:F6"));
  overview.getRange("E5").formulas = [["=B7"]];
  overview.getRange("F5").formulas = [["=B8"]];
  overview.getRange("E6").formulas = [["=B9"]];
  overview.getRange("F6").formulas = [["=B10"]];
  const chart = overview.charts.add("bar", overview.getRange("D4:F6"));
  chart.title = "Quy mô hai Sprint";
  chart.hasLegend = true;
  chart.xAxis = { axisType: "textAxis", textStyle: { fontSize: 10 } };
  chart.yAxis = { numberFormatCode: "0" };
  chart.setPosition("D8", "H22");
  overview.getRange("A15:B19").values = [
    ["Kiểm soát hồ sơ", "Trạng thái"],
    ["Gộp Sprint đúng yêu cầu", "Đạt"],
    ["Đủ US01-US40", "Đạt"],
    ["Tổng chi tiết 242 SP", "Đạt"],
    ["Evidence trạng thái Done", "Cần nhóm xác nhận"],
  ];
  headerStyle(overview.getRange("A15:B15"));
  bodyStyle(overview.getRange("A16:B19"));
  addStatusRules(overview.getRange("B16:B19"));
  overview.getRange("A1:A22").format.columnWidth = 30;
  overview.getRange("B1:B22").format.columnWidth = 20;
  overview.getRange("C1:C22").format.columnWidth = 3;
  overview.getRange("D1:F22").format.columnWidth = 16;
  overview.getRange("G1:H22").format.columnWidth = 12;
  overview.freezePanes.freezeRows(2);

  const headers = [
    "Mã US",
    "Epic",
    "Mã tính năng",
    "Tên User Story",
    "User Story",
    "Ưu tiên",
    "SP",
    "Giá trị kinh doanh",
    "Chủ sở hữu",
    "Sprint",
    "Trạng thái nguồn",
    "Trạng thái xác minh",
    "Tiêu chí chấp nhận",
    "Nguồn",
  ];
  const rows = backlog.map((x) => [
    x.id,
    x.epic,
    x.feature,
    x.title,
    x.userStory,
    x.priority,
    x.sp,
    x.businessValue,
    x.owner,
    x.sprint,
    x.sourceStatus,
    x.verifiedStatus,
    x.acceptance,
    x.source,
  ]);
  formatTableSheet(
    product,
    "PRODUCT BACKLOG - 40 USER STORIES",
    "Nguồn: hai workbook Agile, báo cáo dự án và mã nguồn. Trạng thái xác minh tách riêng khỏi trạng thái nguồn.",
    headers,
    rows,
    [9, 9, 10, 29, 48, 12, 7, 14, 24, 11, 21, 23, 48, 35],
  );
  product.getRange("G5:G44").format.numberFormat = "0";
  product.getRange("A5:C44").format.horizontalAlignment = "center";
  product.getRange("F5:H44").format.horizontalAlignment = "center";
  product.getRange("J5:L44").format.horizontalAlignment = "center";
  product.freezePanes.freezeColumns(4);
  const productTable = product.tables.add("A4:N44", true, "BangProductBacklog");
  productTable.style = "TableStyleMedium2";
  product.getRange("F5:F44").dataValidation = { rule: { type: "list", values: ["Cao", "Trung bình", "Thấp"] } };
  product.getRange("I5:I44").dataValidation = { rule: { type: "list", formula1: "'Danh mục'!$D$2:$D$6" } };
  product.getRange("J5:J44").dataValidation = { rule: { type: "list", values: ["Sprint 1", "Sprint 2"] } };
  product.getRange("L5:L44").dataValidation = {
    rule: { type: "list", values: ["Đã xác minh", "Cần đối chiếu evidence", "Kế hoạch - chờ xác nhận"] },
  };
  addStatusRules(product.getRange("K5:L44"));

  function buildSprintSheet(sheet, sprintName, filtered) {
    const sprintRows = filtered.map((x) => [
      x.id,
      x.epic,
      x.title,
      x.userStory,
      x.priority,
      x.sp,
      x.owner,
      x.sourceStatus,
      x.verifiedStatus,
      x.acceptance,
    ]);
    formatTableSheet(
      sheet,
      `${sprintName.toUpperCase()} BACKLOG`,
      `${filtered.length} User Stories - ${filtered.reduce((sum, x) => sum + x.sp, 0)} Story Points`,
      ["Mã US", "Epic", "Tên User Story", "User Story", "Ưu tiên", "SP", "Chủ sở hữu", "Trạng thái nguồn", "Xác minh", "Tiêu chí chấp nhận"],
      sprintRows,
      [9, 9, 30, 46, 12, 7, 24, 20, 22, 48],
    );
    sheet.getRange(`F5:F${4 + filtered.length}`).format.numberFormat = "0";
    addStatusRules(sheet.getRange(`H5:I${4 + filtered.length}`));
  }
  buildSprintSheet(sprint1, "Sprint 1", backlog.filter((x) => x.sprint === "Sprint 1"));
  buildSprintSheet(sprint2, "Sprint 2", backlog.filter((x) => x.sprint === "Sprint 2"));

  const epicRows = Object.entries(epicVi).map(([id, name]) => [
    id,
    name,
    backlog.filter((x) => x.epic === id).length,
    backlog.filter((x) => x.epic === id).reduce((sum, x) => sum + x.sp, 0),
  ]);
  formatTableSheet(epics, "DANH MỤC EPIC", "12 Epic dùng để tổ chức Product Backlog.", ["Epic", "Tên Epic", "Số User Stories", "Story Points"], epicRows, [12, 42, 18, 18]);
  formatTableSheet(scrumTeam, "SCRUM TEAM", "Danh sách lấy từ Co_su_Ly_Thuyet.docx.", ["Mã", "Họ tên", "MSSV", "Vai trò"], team, [10, 30, 20, 45]);
  formatTableSheet(
    release,
    "KẾ HOẠCH PHÁT HÀNH - 2 SPRINT",
    "Mốc sau 29/07/2026 là kế hoạch và cần cập nhật bằng chứng thực tế.",
    ["Sprint", "Thời gian", "Phạm vi", "Story Points", "Sprint Goal", "Trạng thái hồ sơ"],
    [
      ["Sprint 1", "02/07-30/07/2026", "US01-US18", 107, "Xác thực, tổ chức, dự án, Backlog, Kanban và cộng tác cốt lõi.", "Cần đối chiếu evidence"],
      ["Sprint 2", "30/07-27/08/2026", "US19-US40", 135, "Task, tài liệu, nghỉ phép/OT, thông báo, báo cáo và audit.", "Kế hoạch - chờ xác nhận"],
    ],
    [14, 22, 18, 15, 55, 26],
  );
  addStatusRules(release.getRange("F5:F6"));

  dictionary.getRange("A1:E1").values = [["Ưu tiên", "Trạng thái xác minh", "Sprint", "Thành viên", "Nguồn"]];
  headerStyle(dictionary.getRange("A1:E1"));
  dictionary.getRange("A2:E6").values = [
    ["Cao", "Đã xác minh", "Sprint 1", team[0][1], "Agile_Project_Management.xlsx"],
    ["Trung bình", "Cần đối chiếu evidence", "Sprint 2", team[1][1], "Agile_Tracking.xlsx"],
    ["Thấp", "Kế hoạch - chờ xác nhận", "", team[2][1], "Co_su_Ly_Thuyet.docx"],
    ["", "", "", team[3][1], "Cac_bang_table.docx"],
    ["", "", "", team[4][1], "Mã nguồn TaskSyncEnterprise"],
  ];
  bodyStyle(dictionary.getRange("A2:E6"));
  dictionary.getRange("A1:E6").format.columnWidth = 28;
  dictionary.showGridLines = false;
  return wb;
}

function buildTrackingWorkbook() {
  const wb = Workbook.create();
  const overview = wb.worksheets.add("Tổng quan");
  const tasksSheet = wb.worksheets.add("Phân rã công việc");
  const sprint1 = wb.worksheets.add("Theo dõi Sprint 1");
  const sprint2 = wb.worksheets.add("Theo dõi Sprint 2");
  const daily1 = wb.worksheets.add("Daily Scrum 1");
  const daily2 = wb.worksheets.add("Daily Scrum 2");
  const bugs = wb.worksheets.add("Lỗi và sự cố");
  const risks = wb.worksheets.add("Rủi ro");
  const dictionary = wb.worksheets.add("Danh mục");
  for (const sheet of wb.worksheets.items) sheet.showGridLines = false;

  const taskTypes = [
    ["Phân tích", "Phân tích yêu cầu và cập nhật tiêu chí chấp nhận", team[4][1], team[4][3]],
    ["Backend", "Thiết kế API, dữ liệu và quy tắc phân quyền", team[1][1], team[1][3]],
    ["Frontend", "Xây dựng giao diện và tích hợp API", team[2][1], team[2][3]],
    ["Kiểm thử", "Kiểm thử, ghi bằng chứng và cập nhật test case", team[3][1], team[3][3]],
    ["Tích hợp", "Review, tích hợp, demo và nghiệm thu Product Backlog Item", team[0][1], team[0][3]],
  ];
  const sprintDays = {
    "Sprint 1": businessDays(new Date(2026, 6, 2), new Date(2026, 6, 30)),
    "Sprint 2": businessDays(new Date(2026, 6, 30), new Date(2026, 7, 27)),
  };
  const tasks = [];
  for (const item of backlog) {
    const days = sprintDays[item.sprint];
    taskTypes.forEach((type, index) => {
      const startIndex = (Number(item.id.slice(2)) + index * 2) % days.length;
      const start = days[startIndex];
      const end = days[Math.min(days.length - 1, startIndex + 2)];
      const hours = index === 0 ? 4 + Math.ceil(item.sp / 3) : index === 1 ? 8 + item.sp : index === 2 ? 6 + item.sp : index === 3 ? 4 + Math.ceil(item.sp / 2) : 3;
      tasks.push({
        id: `${item.id}-CV${String(index + 1).padStart(2, "0")}`,
        us: item.id,
        epic: item.epic,
        sprint: item.sprint,
        type: type[0],
        content: `${type[1]} cho “${item.title}”`,
        owner: type[2],
        role: type[3],
        hours,
        status: item.sprint === "Sprint 1" ? "Hoàn thành theo hồ sơ - cần evidence" : "Kế hoạch - chờ xác nhận",
        start,
        end,
        dependency: index === 0 ? "" : `${item.id}-CV${String(index).padStart(2, "0")}`,
        evidence: "",
        note: index === 3 ? "Liên kết test/ảnh/biên bản trước khi xác minh Done." : "",
      });
    });
  }

  titleBand(
    overview,
    "A1:H1",
    "AGILE TRACKING - TASKSYNCENTERPRISE",
    "40 User Stories được phân rã thành 200 công việc cho đủ 5 thành viên.",
  );
  overview.getRange("A4:B12").values = [
    ["Chỉ số", "Giá trị"],
    ["Tổng công việc", null],
    ["Tổng giờ ước lượng", null],
    ["Công việc Sprint 1", null],
    ["Giờ Sprint 1", null],
    ["Công việc Sprint 2", null],
    ["Giờ Sprint 2", null],
    ["Công việc có người phụ trách", null],
    ["Công việc có evidence", null],
  ];
  headerStyle(overview.getRange("A4:B4"));
  bodyStyle(overview.getRange("A5:B12"));
  overview.getRange("B5").formulas = [["=COUNTA('Phân rã công việc'!$A$5:$A$204)"]];
  overview.getRange("B6").formulas = [["=SUM('Phân rã công việc'!$I$5:$I$204)"]];
  overview.getRange("B7").formulas = [["=COUNTIF('Phân rã công việc'!$D$5:$D$204,\"Sprint 1\")"]];
  overview.getRange("B8").formulas = [["=SUMIF('Phân rã công việc'!$D$5:$D$204,\"Sprint 1\",'Phân rã công việc'!$I$5:$I$204)"]];
  overview.getRange("B9").formulas = [["=COUNTIF('Phân rã công việc'!$D$5:$D$204,\"Sprint 2\")"]];
  overview.getRange("B10").formulas = [["=SUMIF('Phân rã công việc'!$D$5:$D$204,\"Sprint 2\",'Phân rã công việc'!$I$5:$I$204)"]];
  overview.getRange("B11").formulas = [["=COUNTIF('Phân rã công việc'!$G$5:$G$204,\"<>\")"]];
  overview.getRange("B12").formulas = [["=COUNTIF('Phân rã công việc'!$N$5:$N$204,\"?*\")"]];
  overview.getRange("D4:F9").values = [
    ["Thành viên", "Vai trò", "Giờ ước lượng"],
    ...team.map((member) => [member[1], member[3], null]),
  ];
  headerStyle(overview.getRange("D4:F4"));
  bodyStyle(overview.getRange("D5:F9"));
  for (let row = 5; row <= 9; row++) {
    overview.getRange(`F${row}`).formulas = [[`=SUMIF('Phân rã công việc'!$G$5:$G$204,D${row},'Phân rã công việc'!$I$5:$I$204)`]];
  }
  const memberChart = overview.charts.add("bar", overview.getRange("D4:F9"));
  memberChart.title = "Phân bổ giờ theo thành viên";
  memberChart.hasLegend = false;
  memberChart.xAxis = { axisType: "textAxis", textStyle: { fontSize: 9 } };
  memberChart.yAxis = { numberFormatCode: "0" };
  memberChart.setPosition("D11", "H27");
  overview.getRange("A1:A27").format.columnWidth = 28;
  overview.getRange("B1:B27").format.columnWidth = 18;
  overview.getRange("C1:C27").format.columnWidth = 3;
  overview.getRange("D1:D27").format.columnWidth = 27;
  overview.getRange("E1:E27").format.columnWidth = 30;
  overview.getRange("F1:F27").format.columnWidth = 16;

  const taskHeaders = [
    "Mã công việc",
    "Mã US",
    "Epic",
    "Sprint",
    "Loại công việc",
    "Nội dung chi tiết",
    "Người phụ trách",
    "Vai trò",
    "Giờ ước lượng",
    "Trạng thái",
    "Bắt đầu",
    "Kết thúc",
    "Phụ thuộc",
    "Evidence",
    "Ghi chú",
  ];
  const taskRows = tasks.map((x) => [
    x.id,
    x.us,
    x.epic,
    x.sprint,
    x.type,
    x.content,
    x.owner,
    x.role,
    x.hours,
    x.status,
    x.start,
    x.end,
    x.dependency,
    x.evidence,
    x.note,
  ]);
  formatTableSheet(
    tasksSheet,
    "PHÂN RÃ CÔNG VIỆC - 200 HẠNG MỤC",
    "Mỗi User Story có 5 phần việc: phân tích, Backend, Frontend, kiểm thử và tích hợp/nghiệm thu.",
    taskHeaders,
    taskRows,
    [16, 9, 9, 11, 16, 48, 25, 28, 14, 28, 14, 14, 16, 32, 38],
  );
  tasksSheet.getRange("I5:I204").format.numberFormat = "0";
  tasksSheet.getRange("K5:L204").format.numberFormat = "dd/mm/yyyy";
  tasksSheet.getRange("G5:G204").dataValidation = { rule: { type: "list", formula1: "'Danh mục'!$A$2:$A$6" } };
  tasksSheet.getRange("J5:J204").dataValidation = {
    rule: { type: "list", values: ["Chưa bắt đầu", "Đang thực hiện", "Đang kiểm thử", "Hoàn thành theo hồ sơ - cần evidence", "Đã xác minh", "Kế hoạch - chờ xác nhận"] },
  };
  addStatusRules(tasksSheet.getRange("J5:J204"));
  const taskTable = tasksSheet.tables.add("A4:O204", true, "BangPhanRaCongViec");
  taskTable.style = "TableStyleMedium2";
  tasksSheet.freezePanes.freezeColumns(5);

  function trackingSprint(sheet, sprintName) {
    const filtered = tasks.filter((x) => x.sprint === sprintName);
    const rows = filtered.map((x) => [x.id, x.us, x.type, x.content, x.owner, x.hours, x.status, x.start, x.end, x.evidence]);
    formatTableSheet(
      sheet,
      `THEO DÕI ${sprintName.toUpperCase()}`,
      `${filtered.length} công việc được phân rã từ ${sprintName === "Sprint 1" ? 18 : 22} User Stories.`,
      ["Mã CV", "Mã US", "Loại", "Nội dung", "Người phụ trách", "Giờ", "Trạng thái", "Bắt đầu", "Kết thúc", "Evidence"],
      rows,
      [16, 9, 15, 48, 25, 10, 28, 14, 14, 35],
    );
    const endRow = 4 + rows.length;
    sheet.getRange(`F5:F${endRow}`).format.numberFormat = "0";
    sheet.getRange(`H5:I${endRow}`).format.numberFormat = "dd/mm/yyyy";
    addStatusRules(sheet.getRange(`G5:G${endRow}`));
  }
  trackingSprint(sprint1, "Sprint 1");
  trackingSprint(sprint2, "Sprint 2");

  function buildDaily(sheet, sprintName, start, end) {
    const days = businessDays(start, end);
    const sprintTasks = tasks.filter((x) => x.sprint === sprintName);
    const rows = [];
    days.forEach((day, dayIndex) => {
      team.forEach((member, memberIndex) => {
        const current = sprintTasks[(dayIndex * team.length + memberIndex) % sprintTasks.length];
        const previous = sprintTasks[(dayIndex * team.length + memberIndex + sprintTasks.length - team.length) % sprintTasks.length];
        rows.push([
          day,
          member[1],
          previous.id,
          previous.content,
          current.id,
          current.content,
          "Chưa có blocker được xác nhận",
          day > new Date(2026, 6, 29) ? "Kế hoạch - chờ xác nhận" : "Cần nhóm xác nhận",
          "",
        ]);
      });
    });
    formatTableSheet(
      sheet,
      `${sprintName.toUpperCase()} - DAILY SCRUM`,
      "Mỗi thành viên có mục đã làm, sẽ làm, blocker và evidence. Dòng tương lai là kế hoạch.",
      ["Ngày", "Thành viên", "CV đã làm", "Nội dung đã làm", "CV sẽ làm", "Nội dung sẽ làm", "Trở ngại", "Trạng thái biên bản", "Evidence"],
      rows,
      [14, 25, 16, 42, 16, 42, 30, 25, 32],
    );
    const endRow = 4 + rows.length;
    sheet.getRange(`A5:A${endRow}`).format.numberFormat = "dd/mm/yyyy";
    addStatusRules(sheet.getRange(`H5:H${endRow}`));
  }
  buildDaily(daily1, "Sprint 1", new Date(2026, 6, 2), new Date(2026, 6, 30));
  buildDaily(daily2, "Sprint 2", new Date(2026, 6, 30), new Date(2026, 7, 27));

  const bugRows = [
    ["BUG-01", "Sprint 1", "Quản lý phiên đăng nhập", "Cao", "Phiên không bị thu hồi đúng lúc", "Kiểm tra refresh token và blacklist", "Cần xác minh", ""],
    ["BUG-02", "Sprint 1", "Import nhân viên", "Trung bình", "Dòng lỗi chưa báo đủ nguyên nhân", "Bổ sung validation theo từng dòng", "Cần xác minh", ""],
    ["BUG-03", "Sprint 1", "Kanban realtime", "Cao", "Client khác cập nhật chậm", "Kiểm tra publish sau commit và invalidate query", "Cần xác minh", ""],
    ["BUG-04", "Sprint 2", "Tệp đính kèm", "Cao", "Metadata nguồn bị mô tả sai", "Đối chiếu model/migration và sửa tài liệu", "Đã xử lý tài liệu", "Cac_bang_table.docx"],
    ["BUG-05", "Sprint 2", "Thông báo", "Trung bình", "Retry có thể tạo bản ghi trùng", "Dùng event_id/idempotency và log retry", "Kế hoạch", ""],
    ["BUG-06", "Sprint 2", "Readiness Redis", "Cao", "Readiness trả 503 khi Redis tắt", "Xác định dependency bắt buộc và degraded mode", "Kế hoạch", ""],
  ];
  formatTableSheet(
    bugs,
    "LỖI VÀ SỰ CỐ",
    "Danh sách kiểm soát phục vụ Review; cập nhật evidence sau khi sửa.",
    ["Mã lỗi", "Sprint", "Khu vực", "Mức độ", "Mô tả", "Hướng xử lý", "Trạng thái", "Evidence"],
    bugRows,
    [12, 12, 25, 13, 40, 46, 22, 32],
  );
  addStatusRules(bugs.getRange("G5:G10"));

  const riskRows = [
    ["R01", "Tổng Story Points nguồn không khớp", "Cao", "Trung bình", "Dùng tổng từng dòng 242 SP và kiểm tra công thức", team[0][1], "Đang theo dõi"],
    ["R02", "Evidence Done chưa đầy đủ", "Cao", "Cao", "Liên kết US với PR/test/ảnh/biên bản", team[3][1], "Đang theo dõi"],
    ["R03", "Tên/MSSV không thống nhất", "Trung bình", "Cao", "Dùng Co_su_Ly_Thuyet làm nguồn chính và xác nhận", team[4][1], "Đang theo dõi"],
    ["R04", "Redis/readiness local chưa ổn định", "Cao", "Trung bình", "Kiểm tra dependency và degraded mode", team[1][1], "Kế hoạch"],
    ["R05", "Docker engine không sẵn sàng", "Cao", "Trung bình", "Xác minh build/deploy trên môi trường CI", team[1][1], "Kế hoạch"],
    ["R06", "Thiếu ảnh buổi họp", "Trung bình", "Cao", "Bổ sung theo placeholder trong báo cáo", team[4][1], "Đang theo dõi"],
    ["R07", "Rò rỉ quyền qua API", "Cao", "Thấp", "Test broken access control cho từng vai trò", team[3][1], "Kế hoạch"],
    ["R08", "Tệp upload không an toàn", "Cao", "Trung bình", "Kiểm tra MIME, size, scope và malware", team[1][1], "Kế hoạch"],
  ];
  formatTableSheet(
    risks,
    "SỔ ĐĂNG KÝ RỦI RO",
    "Đánh giá định tính để ưu tiên hành động giảm thiểu.",
    ["Mã", "Rủi ro", "Tác động", "Khả năng", "Ứng phó", "Chủ sở hữu", "Trạng thái"],
    riskRows,
    [10, 38, 14, 14, 48, 25, 22],
  );
  addStatusRules(risks.getRange("G5:G12"));

  dictionary.getRange("A1:D1").values = [["Thành viên", "Loại công việc", "Trạng thái", "Sprint"]];
  headerStyle(dictionary.getRange("A1:D1"));
  dictionary.getRange("A2:D8").values = [
    [team[0][1], "Phân tích", "Chưa bắt đầu", "Sprint 1"],
    [team[1][1], "Backend", "Đang thực hiện", "Sprint 2"],
    [team[2][1], "Frontend", "Đang kiểm thử", ""],
    [team[3][1], "Kiểm thử", "Hoàn thành theo hồ sơ - cần evidence", ""],
    [team[4][1], "Tích hợp", "Đã xác minh", ""],
    ["", "", "Kế hoạch - chờ xác nhận", ""],
    ["", "", "Cần nhóm xác nhận", ""],
  ];
  bodyStyle(dictionary.getRange("A2:D8"));
  dictionary.getRange("A1:D8").format.columnWidth = 34;
  return wb;
}

async function exportAndVerify(workbook, filename, previewFolder) {
  await fs.mkdir(previewFolder, { recursive: true });
  const output = await SpreadsheetFile.exportXlsx(workbook);
  await output.save(`${outputDir}/${filename}`);

  const inspect = await workbook.inspect({
    kind: "table",
    range: "Tổng quan!A1:H30",
    include: "values,formulas",
    tableMaxRows: 30,
    tableMaxCols: 10,
    maxChars: 6000,
  });
  await fs.writeFile(`${previewFolder}/inspect.ndjson`, inspect.ndjson, "utf8");
  const errors = await workbook.inspect({
    kind: "match",
    searchTerm: "#REF!|#DIV/0!|#VALUE!|#NAME\\?|#N/A",
    options: { useRegex: true, maxResults: 300 },
    summary: "Kiểm tra lỗi công thức",
  });
  await fs.writeFile(`${previewFolder}/formula_errors.ndjson`, errors.ndjson, "utf8");

  for (const sheet of workbook.worksheets.items) {
    const rendered = await workbook.render({
      sheetName: sheet.name,
      autoCrop: "all",
      scale: 1,
      format: "png",
    });
    const safe = sheet.name.replace(/[\\/:*?"<>| ]/g, "_");
    await fs.writeFile(`${previewFolder}/${safe}.png`, new Uint8Array(await rendered.arrayBuffer()));
  }
}

const management = buildManagementWorkbook();
const tracking = buildTrackingWorkbook();
await exportAndVerify(
  management,
  "Agile_Project_Management_TaskSyncEnterprise.xlsx",
  `${previewRoot}/management`,
);
await exportAndVerify(
  tracking,
  "Agile_Tracking_TaskSyncEnterprise.xlsx",
  `${previewRoot}/tracking`,
);
console.log("Built two Vietnamese Agile workbooks.");
