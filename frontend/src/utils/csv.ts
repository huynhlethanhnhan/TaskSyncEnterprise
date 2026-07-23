export const safeEscapeCsvValue = (val: any): string => {
  if (val === null || val === undefined) return '';
  let str = String(val);
  // Escaping injection characters (=, +, -, @) to neutralize formula injection
  if (['=', '+', '-', '@'].some(char => str.startsWith(char))) {
    str = `'${str}`;
  }
  // Wrap in double quotes and escape internal quotes if special chars exist
  if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
    str = `"${str.replace(/"/g, '""')}"`;
  }
  return str;
};

export const exportToCsv = (filename: string, headers: string[], rows: any[][]) => {
  const headerLine = headers.map(safeEscapeCsvValue).join(',');
  const rowLines = rows.map(row => row.map(safeEscapeCsvValue).join(','));
  const csvContent = '\uFEFF' + [headerLine, ...rowLines].join('\n'); // UTF-8 BOM for Excel compatibility

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};
