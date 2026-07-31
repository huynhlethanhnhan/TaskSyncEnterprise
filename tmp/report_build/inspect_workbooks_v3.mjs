import { FileBlob, SpreadsheetFile } from "@oai/artifact-tool";

for (const file of [
  "E:/TaskSyncEnterprise/Report/Agile/Agile_Project_Management_TaskSyncEnterprise.xlsx",
  "E:/TaskSyncEnterprise/Report/Agile/Agile_Tracking_TaskSyncEnterprise.xlsx",
]) {
  const workbook = await SpreadsheetFile.importXlsx(await FileBlob.load(file));
  const range = file.includes("Project_Management") ? "A5:E10" : "A4:E10";
  const result = await workbook.inspect({
    kind: "table",
    sheetId: "Tổng quan",
    range,
    include: "values,formulas",
    tableMaxRows: 10,
    tableMaxCols: 6,
    maxChars: 4000,
  });
  const errors = await workbook.inspect({
    kind: "match",
    searchTerm: "#REF!|#DIV/0!|#VALUE!|#NAME\\?|#N/A",
    options: { useRegex: true, maxResults: 100 },
    maxChars: 1000,
  });
  console.log(file, result.ndjson, errors.ndjson);
}
