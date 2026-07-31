import { FileBlob, SpreadsheetFile } from "@oai/artifact-tool";

const files = process.argv.slice(2);

for (const file of files) {
  const input = await FileBlob.load(file);
  const workbook = await SpreadsheetFile.importXlsx(input);
  const overview = await workbook.inspect({
    kind: "workbook,sheet,table",
    maxChars: 12000,
    tableMaxRows: 12,
    tableMaxCols: 12,
    tableMaxCellChars: 180,
  });
  console.log(`\n### ${file}`);
  console.log(overview.ndjson);
  for (const sheet of workbook.worksheets.items) {
    const used = sheet.getUsedRange();
    if (!used) continue;
    const preview = await workbook.inspect({
      kind: "region",
      sheetId: sheet.name,
      range: used.address,
      maxChars: 16000,
      tableMaxRows: 50,
      tableMaxCols: 18,
      tableMaxCellChars: 220,
    });
    console.log(`\n## SHEET ${sheet.name} ${used.address}`);
    console.log(preview.ndjson);
  }
}
