import { FileBlob, SpreadsheetFile } from "@oai/artifact-tool";
const wb=await SpreadsheetFile.importXlsx(await FileBlob.load("E:/TaskSyncEnterprise/Report/Agile/Agile_Tracking_TaskSyncEnterprise.xlsx"));
const r=await wb.inspect({kind:"table",sheetId:"Công việc Sprint 1",range:"A32:F46",include:"values",tableMaxRows:20,tableMaxCols:6,maxChars:6000}); console.log(r.ndjson);
