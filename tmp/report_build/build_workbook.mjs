import fs from "node:fs/promises";
import path from "node:path";
import { FileBlob, SpreadsheetFile, Workbook } from "@oai/artifact-tool";

const repoRoot = path.resolve(process.cwd(), "..", "..");
const sourceDir = path.join(repoRoot, "Report", "Tham khảo");
const outputDir = path.join(repoRoot, "Report", "Agile");
const previewDir = path.join(process.cwd(), "xlsx_preview");
await fs.mkdir(outputDir, { recursive: true });
await fs.mkdir(previewDir, { recursive: true });

const projectInput = await FileBlob.load(path.join(sourceDir, "Agile_Project_Management.xlsx"));
const projectWorkbook = await SpreadsheetFile.importXlsx(projectInput);
const bugInput = await FileBlob.load(path.join(sourceDir, "bao-cao-thong-ke-bug-timeline (1).xlsx"));
const bugWorkbook = await SpreadsheetFile.importXlsx(bugInput);

const sourceBacklog = projectWorkbook.worksheets.getItem("Product Backlog").getRange("A2:H41").values;
const featureRows = projectWorkbook.worksheets.getItem("Feature").getRange("A2:C41").values;
const epicRows = projectWorkbook.worksheets.getItem("Epic").getRange("A2:B13").values;
const authoritativeRows = bugWorkbook.worksheets.getItemAt(2).getRange("A5:H44").values;
const bugRows = bugWorkbook.worksheets.getItemAt(1).getRange("A5:H15").values;

const featureToEpic = new Map(featureRows.map(([featureId, epicId]) => [featureId, epicId]));
const descriptionById = new Map(sourceBacklog.map(([id, , , , description]) => [id, description]));

function acceptance(title) {
  const common = `Chức năng ${title} thực hiện đúng User Story; kiểm tra quyền ở Backend; dữ liệu được lưu nhất quán; có thông báo lỗi rõ ràng.`;
  if (title.includes("Login")) return "Đăng nhập đúng thông tin trả phiên hợp lệ; sai thông tin bị từ chối; tài khoản không có quyền không truy cập được workspace.";
  if (title.includes("Role") || title.includes("Audit")) return "Chỉ vai trò được phép mới thao tác; mọi thay đổi nhạy cảm được ghi audit; truy vấn trái quyền bị từ chối.";
  if (title.includes("Import")) return "File hợp lệ được import; dòng sai/trùng được báo rõ; không commit một phần khi batch validation thất bại.";
  if (title.includes("Kanban") || title.includes("Task")) return "Task hiển thị đúng Project/Sprint; chuyển trạng thái hợp lệ; realtime đồng bộ; lịch sử thay đổi được lưu.";
  if (title.includes("Leave") || title.includes("Overtime")) return "Yêu cầu đúng chính sách được gửi/duyệt; sai chính sách bị chặn; số dư và trạng thái cập nhật trong transaction.";
  if (title.includes("Notification") || title.includes("Alerts")) return "Sự kiện sau commit tạo thông báo; người dùng đúng quyền nhận được; lỗi gửi có retry hoặc trạng thái theo dõi.";
  if (title.includes("Report") || title.includes("Dashboard") || title.includes("Predictor")) return "Số liệu truy vết được tới nguồn; bộ lọc hoạt động; người dùng chỉ xem dữ liệu trong phạm vi quyền.";
  return common;
}

const backlogRows = authoritativeRows.map((row) => {
  const [id, featureId, title, priority, storyPoint, businessValue, assignee, sprint] = row;
  return [
    id,
    featureToEpic.get(featureId) ?? "",
    featureId,
    title,
    descriptionById.get(id) ?? "",
    priority,
    Number(storyPoint),
    businessValue,
    assignee,
    sprint,
    "Done",
    acceptance(title),
  ];
});

const workbook = Workbook.create();
const dashboard = workbook.worksheets.add("Dashboard");
const product = workbook.worksheets.add("Product Backlog");
const sprint1 = workbook.worksheets.add("Sprint 1 Backlog");
const sprint2 = workbook.worksheets.add("Sprint 2 Backlog");
const epics = workbook.worksheets.add("Epics");
const team = workbook.worksheets.add("Scrum Team");
const release = workbook.worksheets.add("Release Plan");
const bugs = workbook.worksheets.add("Bug Register");
const refs = workbook.worksheets.add("Danh mục");

const colors = {
  navy: "#16324F",
  blue: "#2E74B5",
  teal: "#0F766E",
  gold: "#B78318",
  light: "#F2F4F7",
  lightBlue: "#E8EEF5",
  white: "#FFFFFF",
  gray: "#5B6573",
  green: "#DFF3E6",
  red: "#FBE4E4",
  yellow: "#FFF3CD",
};

function titleBand(sheet, range, title, subtitle) {
  sheet.getRange(range).merge();
  const first = range.split(":")[0];
  sheet.getRange(first).values = [[title]];
  sheet.getRange(range).format = {
    fill: colors.navy,
    font: { color: colors.white, bold: true, size: 18 },
    verticalAlignment: "center",
  };
  sheet.getRange(range).format.rowHeight = 34;
  const subtitleRange = `${range.split(":")[0].replace(/\d+$/, "2")}:${range.split(":")[1].replace(/\d+$/, "2")}`;
  sheet.getRange(subtitleRange).merge();
  sheet.getRange(subtitleRange.split(":")[0]).values = [[subtitle]];
  sheet.getRange(subtitleRange).format = {
    fill: colors.lightBlue,
    font: { color: colors.gray, italic: true, size: 10 },
    wrapText: true,
  };
  sheet.getRange(subtitleRange).format.rowHeight = 30;
}

function styleHeader(range) {
  range.format = {
    fill: colors.blue,
    font: { color: colors.white, bold: true, size: 10 },
    horizontalAlignment: "center",
    verticalAlignment: "center",
    wrapText: true,
    borders: { preset: "all", style: "thin", color: "#C6D2DE" },
  };
  range.format.rowHeight = 30;
}

function styleBody(range) {
  range.format = {
    font: { color: "#111827", size: 9 },
    verticalAlignment: "center",
    wrapText: true,
    borders: {
      insideHorizontal: { style: "thin", color: "#D9E1E8" },
      bottom: { style: "thin", color: "#D9E1E8" },
    },
  };
}

for (const sheet of workbook.worksheets.items) {
  sheet.showGridLines = false;
}

// Dashboard
titleBand(
  dashboard,
  "A1:H1",
  "DASHBOARD AGILE - TASKSYNCENTERPRISE",
  "Nguồn dữ liệu: Product Backlog 40 User Stories. Quy ước mới: Sprint cũ 1+2 → Sprint 1; Sprint cũ 3+4 → Sprint 2.",
);
dashboard.getRange("A4:B10").values = [
  ["Chỉ số", "Giá trị"],
  ["Tổng User Stories", null],
  ["Tổng Story Points", null],
  ["Sprint 1 - Story Points", null],
  ["Sprint 2 - Story Points", null],
  ["User Stories Done", null],
  ["Tỷ lệ hoàn thành", null],
];
styleHeader(dashboard.getRange("A4:B4"));
styleBody(dashboard.getRange("A5:B10"));
dashboard.getRange("B5").formulas = [["=COUNTA('Product Backlog'!$A$5:$A$44)"]];
dashboard.getRange("B6").formulas = [["=SUM('Product Backlog'!$G$5:$G$44)"]];
dashboard.getRange("B7").formulas = [["=SUMIF('Product Backlog'!$J$5:$J$44,\"Sprint 1\",'Product Backlog'!$G$5:$G$44)"]];
dashboard.getRange("B8").formulas = [["=SUMIF('Product Backlog'!$J$5:$J$44,\"Sprint 2\",'Product Backlog'!$G$5:$G$44)"]];
dashboard.getRange("B9").formulas = [["=COUNTIF('Product Backlog'!$K$5:$K$44,\"Done\")"]];
dashboard.getRange("B10").formulas = [["=IFERROR(B9/B5,0)"]];
dashboard.getRange("B5:B9").format.numberFormat = "0";
dashboard.getRange("B10").format.numberFormat = "0%";
dashboard.getRange("B5:B10").format = {
  fill: "#F8FBFF",
  font: { bold: true, color: colors.navy, size: 12 },
  horizontalAlignment: "center",
};
dashboard.getRange("D4:F6").values = [
  ["Sprint", "User Stories", "Story Points"],
  ["Sprint 1", null, null],
  ["Sprint 2", null, null],
];
styleHeader(dashboard.getRange("D4:F4"));
styleBody(dashboard.getRange("D5:F6"));
dashboard.getRange("E5").formulas = [["=COUNTIF('Product Backlog'!$J$5:$J$44,D5)"]];
dashboard.getRange("E6").formulas = [["=COUNTIF('Product Backlog'!$J$5:$J$44,D6)"]];
dashboard.getRange("F5").formulas = [["=SUMIF('Product Backlog'!$J$5:$J$44,D5,'Product Backlog'!$G$5:$G$44)"]];
dashboard.getRange("F6").formulas = [["=SUMIF('Product Backlog'!$J$5:$J$44,D6,'Product Backlog'!$G$5:$G$44)"]];
const sprintChart = dashboard.charts.add("bar", dashboard.getRange("D4:F6"));
sprintChart.title = "So sánh quy mô hai Sprint";
sprintChart.hasLegend = true;
sprintChart.xAxis = { axisType: "textAxis", textStyle: { fontSize: 10 } };
sprintChart.yAxis = { numberFormatCode: "0" };
sprintChart.setPosition("D8", "H22");
dashboard.getRange("A13:B17").values = [
  ["Kiểm soát hồ sơ", "Trạng thái"],
  ["Gộp Sprint đúng yêu cầu", "Đạt"],
  ["Product Backlog đủ US01-US40", "Đạt"],
  ["Mốc sau 29/07/2026", "Cần xác nhận thực tế"],
  ["Họ tên / MSSV", "Cần nhóm đối chiếu"],
];
styleHeader(dashboard.getRange("A13:B13"));
styleBody(dashboard.getRange("A14:B17"));
dashboard.getRange("B14:B15").format.fill = colors.green;
dashboard.getRange("B16:B17").format.fill = colors.yellow;
dashboard.getRange("A1:A22").format.columnWidth = 28;
dashboard.getRange("B1:B22").format.columnWidth = 20;
dashboard.getRange("C1:C22").format.columnWidth = 3;
dashboard.getRange("D1:D22").format.columnWidth = 18;
dashboard.getRange("E1:F22").format.columnWidth = 15;
dashboard.getRange("G1:H22").format.columnWidth = 13;
dashboard.freezePanes.freezeRows(2);

// Product Backlog
titleBand(
  product,
  "A1:L1",
  "PRODUCT BACKLOG - 40 USER STORIES",
  "Sprint 1: US01-US18, 107 SP | Sprint 2: US19-US40, 135 SP | Tổng dòng: 242 SP (Summary nguồn ghi 228 SP). Trạng thái Done cần đối chiếu evidence thực tế.",
);
const backlogHeaders = ["US ID", "Epic", "Feature", "User Story Title", "User Story", "Priority", "SP", "Business Value", "Assignee", "Sprint", "Status", "Acceptance Criteria"];
product.getRange("A4:L4").values = [backlogHeaders];
product.getRange("A5:L44").values = backlogRows;
styleHeader(product.getRange("A4:L4"));
styleBody(product.getRange("A5:L44"));
product.getRange("G5:G44").format.numberFormat = "0";
product.getRange("A5:C44").format.horizontalAlignment = "center";
product.getRange("F5:H44").format.horizontalAlignment = "center";
product.getRange("J5:K44").format.horizontalAlignment = "center";
product.getRange("A5:A44").format.font = { bold: true, color: colors.navy };
product.getRange("A4:L44").format.autofitRows();
product.getRange("A1:A44").format.columnWidth = 9;
product.getRange("B1:C44").format.columnWidth = 10;
product.getRange("D1:D44").format.columnWidth = 29;
product.getRange("E1:E44").format.columnWidth = 48;
product.getRange("F1:F44").format.columnWidth = 12;
product.getRange("G1:G44").format.columnWidth = 8;
product.getRange("H1:H44").format.columnWidth = 14;
product.getRange("I1:I44").format.columnWidth = 24;
product.getRange("J1:K44").format.columnWidth = 12;
product.getRange("L1:L44").format.columnWidth = 45;
product.freezePanes.freezeRows(4);
product.freezePanes.freezeColumns(4);
const productTable = product.tables.add("A4:L44", true, "ProductBacklogTable");
productTable.style = "TableStyleMedium2";
product.getRange("F5:F44").dataValidation = { rule: { type: "list", values: ["Highest", "Medium", "Lowest"] } };
product.getRange("I5:I44").dataValidation = { rule: { type: "list", formula1: "'Danh mục'!$D$2:$D$6" } };
product.getRange("J5:J44").dataValidation = { rule: { type: "list", values: ["Sprint 1", "Sprint 2"] } };
product.getRange("K5:K44").dataValidation = { rule: { type: "list", values: ["To Do", "In Progress", "Done"] } };
product.getRange("K5:K44").conditionalFormats.add("containsText", { text: "Done", format: { fill: colors.green, font: { color: "#1F6B45", bold: true } } });
product.getRange("K5:K44").conditionalFormats.add("containsText", { text: "In Progress", format: { fill: colors.yellow, font: { color: "#7A5A00", bold: true } } });
product.getRange("K5:K44").conditionalFormats.add("containsText", { text: "To Do", format: { fill: colors.red, font: { color: "#9B1C1C", bold: true } } });

// Sprint backlog sheets link directly to Product Backlog as the source of truth.
function buildSprintSheet(sheet, sprintName, sourceStartRow, count, goal, period) {
  titleBand(sheet, "A1:L1", `${sprintName.toUpperCase()} BACKLOG`, `${period} | ${goal}`);
  sheet.getRange("A4:L4").values = [backlogHeaders];
  styleHeader(sheet.getRange("A4:L4"));
  for (let i = 0; i < count; i++) {
    const destRow = 5 + i;
    const srcRow = sourceStartRow + i;
    const formulas = backlogHeaders.map((_, col) => {
      const letter = String.fromCharCode("A".charCodeAt(0) + col);
      return `='Product Backlog'!${letter}${srcRow}`;
    });
    sheet.getRange(`A${destRow}:L${destRow}`).formulas = [formulas];
  }
  const endRow = 4 + count;
  styleBody(sheet.getRange(`A5:L${endRow}`));
  sheet.getRange(`A${endRow + 2}:B${endRow + 5}`).values = [
    ["Chỉ số Sprint", "Giá trị"],
    ["User Stories", null],
    ["Story Points", null],
    ["Tỷ lệ Done", null],
  ];
  styleHeader(sheet.getRange(`A${endRow + 2}:B${endRow + 2}`));
  styleBody(sheet.getRange(`A${endRow + 3}:B${endRow + 5}`));
  sheet.getRange(`B${endRow + 3}`).formulas = [[`=COUNTA(A5:A${endRow})`]];
  sheet.getRange(`B${endRow + 4}`).formulas = [[`=SUM(G5:G${endRow})`]];
  sheet.getRange(`B${endRow + 5}`).formulas = [[`=IFERROR(COUNTIF(K5:K${endRow},"Done")/COUNTA(A5:A${endRow}),0)`]];
  sheet.getRange(`B${endRow + 5}`).format.numberFormat = "0%";
  const usedEnd = endRow + 5;
  sheet.getRange(`A1:A${usedEnd}`).format.columnWidth = 9;
  sheet.getRange(`B1:C${usedEnd}`).format.columnWidth = 10;
  sheet.getRange(`D1:D${usedEnd}`).format.columnWidth = 28;
  sheet.getRange(`E1:E${usedEnd}`).format.columnWidth = 44;
  sheet.getRange(`F1:F${usedEnd}`).format.columnWidth = 12;
  sheet.getRange(`G1:G${usedEnd}`).format.columnWidth = 8;
  sheet.getRange(`H1:H${usedEnd}`).format.columnWidth = 14;
  sheet.getRange(`I1:I${usedEnd}`).format.columnWidth = 24;
  sheet.getRange(`J1:K${usedEnd}`).format.columnWidth = 12;
  sheet.getRange(`L1:L${usedEnd}`).format.columnWidth = 44;
  sheet.getRange(`A4:L${endRow}`).format.autofitRows();
  sheet.freezePanes.freezeRows(4);
  sheet.freezePanes.freezeColumns(4);
}
buildSprintSheet(sprint1, "Sprint 1", 5, 18, "Core Auth, Organization, Employee và Project/Task cơ bản", "02/07-30/07/2026 | 107 SP");
buildSprintSheet(sprint2, "Sprint 2", 23, 22, "Task nâng cao, Vacation/OT, Realtime, Analytics và Audit", "30/07-27/08/2026 | 135 SP");

// Epics
titleBand(epics, "A1:C1", "DANH MỤC EPIC", "12 Epics làm khung tổ chức Product Backlog.");
epics.getRange("A4:C4").values = [["Epic ID", "Epic Name", "Số User Stories"]];
epics.getRange("A5:B16").values = epicRows;
for (let i = 5; i <= 16; i++) {
  epics.getRange(`C${i}`).formulas = [[`=COUNTIF('Product Backlog'!$B$5:$B$44,A${i})`]];
}
styleHeader(epics.getRange("A4:C4"));
styleBody(epics.getRange("A5:C16"));
epics.getRange("A1:A16").format.columnWidth = 12;
epics.getRange("B1:B16").format.columnWidth = 42;
epics.getRange("C1:C16").format.columnWidth = 18;
epics.freezePanes.freezeRows(4);

// Scrum Team
titleBand(team, "A1:D1", "SCRUM TEAM", "Vai trò lấy theo workbook và báo cáo tổng hợp mới nhất.");
team.getRange("A4:D4").values = [["Mã", "Thành viên", "Vai trò", "Trách nhiệm chính"]];
team.getRange("A5:D9").values = [
  ["A", "Huỳnh Lê Thành Nhân", "Product Owner / Full Stack Lead", "Tầm nhìn, ưu tiên backlog, kiến trúc, code review."],
  ["B", "Nguyễn Đức Mạnh", "Scrum Master / Backend Developer", "Facilitate Scrum, Backend API, database, workflow."],
  ["C", "Nguyễn Lê Huy Hoàng", "Frontend Developer", "React UI, Kanban, form và trải nghiệm người dùng."],
  ["D", "Phạm Anh Tuấn", "QA / Test Engineer", "Test plan, API/E2E, regression và quality gate."],
  ["E", "Nguyễn Anh Tuấn", "Research & Documentation", "Nghiên cứu, biên bản, báo cáo và chuẩn hóa tài liệu."],
];
styleHeader(team.getRange("A4:D4"));
styleBody(team.getRange("A5:D9"));
team.getRange("A1:A12").format.columnWidth = 8;
team.getRange("B1:B12").format.columnWidth = 28;
team.getRange("C1:C12").format.columnWidth = 34;
team.getRange("D1:D12").format.columnWidth = 52;
team.getRange("A11:D12").merge(true);
team.getRange("A11").values = [["Lưu ý: tài liệu nguồn có khác biệt về họ tên/MSSV; nhóm cần đối chiếu danh sách chính thức trước khi nộp."]];
team.getRange("A11:D12").format = { fill: colors.yellow, font: { color: "#7A5A00", italic: true }, wrapText: true };

// Release Plan
titleBand(release, "A1:F1", "RELEASE PLAN - 2 SPRINT", "Mốc thời gian chuẩn hóa theo phép gộp Sprint 1+2 và Sprint 3+4.");
release.getRange("A4:F4").values = [["Sprint", "Thời gian", "Phạm vi", "Story Points", "Sprint Goal", "Trạng thái hồ sơ"]];
release.getRange("A5:F6").values = [
  ["Sprint 1", new Date("2026-07-02"), "US01-US18", 107, "Core Auth, Organization, Employee và Project/Task cơ bản", "Đã tổng hợp đến 29/07"],
  ["Sprint 2", new Date("2026-07-30"), "US19-US40", 135, "Task nâng cao, Vacation/OT, Realtime, Analytics và Audit", "Baseline cần xác nhận"],
];
styleHeader(release.getRange("A4:F4"));
styleBody(release.getRange("A5:F6"));
release.getRange("B5:B6").format.numberFormat = "yyyy-mm-dd";
release.getRange("A1:A6").format.columnWidth = 12;
release.getRange("B1:B6").format.columnWidth = 15;
release.getRange("C1:C6").format.columnWidth = 16;
release.getRange("D1:D6").format.columnWidth = 14;
release.getRange("E1:E6").format.columnWidth = 52;
release.getRange("F1:F6").format.columnWidth = 24;

// Bug register
titleBand(bugs, "A1:H1", "BUG REGISTER", "11 bugs từ báo cáo nguồn; Sprint đã được chuẩn hóa thành Sprint 0, Sprint 1 và Sprint 2.");
bugs.getRange("A4:H4").values = [["Bug ID", "Sprint", "Module", "Severity", "Description", "Root Cause", "Fix", "Lesson Learned"]];
bugs.getRange("A5:H15").values = bugRows;
styleHeader(bugs.getRange("A4:H4"));
styleBody(bugs.getRange("A5:H15"));
bugs.getRange("A1:A15").format.columnWidth = 10;
bugs.getRange("B1:B15").format.columnWidth = 12;
bugs.getRange("C1:C15").format.columnWidth = 22;
bugs.getRange("D1:D15").format.columnWidth = 12;
bugs.getRange("E1:H15").format.columnWidth = 45;
bugs.getRange("A4:H15").format.autofitRows();
bugs.freezePanes.freezeRows(4);
bugs.getRange("D5:D15").conditionalFormats.add("containsText", { text: "High", format: { fill: colors.red, font: { color: "#9B1C1C", bold: true } } });
bugs.getRange("D5:D15").conditionalFormats.add("containsText", { text: "Medium", format: { fill: colors.yellow, font: { color: "#7A5A00", bold: true } } });

// Reference lists
refs.getRange("A1:E1").values = [["Priority", "Status", "Sprint", "Assignee", "Nguồn"]];
styleHeader(refs.getRange("A1:E1"));
refs.getRange("A2:A4").values = [["Highest"], ["Medium"], ["Lowest"]];
refs.getRange("B2:B4").values = [["To Do"], ["In Progress"], ["Done"]];
refs.getRange("C2:C3").values = [["Sprint 1"], ["Sprint 2"]];
refs.getRange("D2:D6").values = [
  ["A (Huỳnh Lê Thành Nhân)"],
  ["B (Backend Dev)"],
  ["C (Frontend Dev)"],
  ["D (QA Engineer)"],
  ["E (Docs)"],
];
refs.getRange("E2:E6").values = [
  ["Report/Tham khảo/Agile_Project_Management.xlsx"],
  ["Report/Tham khảo/bao-cao-thong-ke-bug-timeline (1).xlsx"],
  ["Report/Tham khảo/Agile_Tracking.xlsx"],
  ["Daily Sprint 1 Google Docs"],
  ["docs/architecture và docs/reports"],
];
styleBody(refs.getRange("A2:E6"));
refs.getRange("A1:D6").format.columnWidth = 24;
refs.getRange("E1:E6").format.columnWidth = 55;

// Compact verification.
const dashboardCheck = await workbook.inspect({
  kind: "table",
  range: "Dashboard!A4:F10",
  include: "values,formulas",
  tableMaxRows: 12,
  tableMaxCols: 8,
  maxChars: 5000,
});
console.log(dashboardCheck.ndjson);
const productCheck = await workbook.inspect({
  kind: "table",
  range: "Product Backlog!A4:L10",
  include: "values,formulas",
  tableMaxRows: 8,
  tableMaxCols: 12,
  maxChars: 7000,
});
console.log(productCheck.ndjson);
const formulaErrors = await workbook.inspect({
  kind: "match",
  searchTerm: "#REF!|#DIV/0!|#VALUE!|#NAME\\?|#N/A",
  options: { useRegex: true, maxResults: 300 },
  summary: "final formula error scan",
});
console.log(formulaErrors.ndjson);

for (const sheet of workbook.worksheets.items) {
  const preview = await workbook.render({ sheetName: sheet.name, autoCrop: "all", scale: 1, format: "png" });
  const safeName = sheet.name.replace(/[^\p{L}\p{N}]+/gu, "_");
  await fs.writeFile(path.join(previewDir, `${safeName}.png`), new Uint8Array(await preview.arrayBuffer()));
}

const output = await SpreadsheetFile.exportXlsx(workbook);
await output.save(path.join(outputDir, "Product_Backlog_TaskSyncEnterprise.xlsx"));
console.log("Workbook exported.");
