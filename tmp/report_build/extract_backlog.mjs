import fs from "node:fs/promises";
import { FileBlob, SpreadsheetFile } from "@oai/artifact-tool";

const inputPath = "E:/TaskSyncEnterprise/Report/Agile/Product_Backlog_TaskSyncEnterprise.xlsx";
const outputPath = "E:/TaskSyncEnterprise/tmp/report_build/reference_extract/current_backlog.json";
const input = await FileBlob.load(inputPath);
const workbook = await SpreadsheetFile.importXlsx(input);
const sheet = workbook.worksheets.getItem("Product Backlog");
const rows = sheet.getRange("A5:L44").values;
await fs.writeFile(outputPath, JSON.stringify(rows, null, 2), "utf8");
console.log(`Đã trích ${rows.length} User Stories.`);
