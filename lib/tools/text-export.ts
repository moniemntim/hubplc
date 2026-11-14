function spreadsheetText(value: string | number | boolean): string {
  const text = String(value);
  return typeof value === 'string' && /^[\s]*[=+@-]/.test(text)
    ? `'${text}`
    : text;
}

export function csvRows(
  rows: readonly (readonly (string | number | boolean)[])[],
): string {
  return rows
    .map((row) =>
      row
        .map((value) => `"${spreadsheetText(value).replaceAll('"', '""')}"`)
        .join(','),
    )
    .join('\r\n');
}

export function downloadText(
  text: string,
  filename: string,
  mime = 'text/plain;charset=utf-8',
) {
  const url = URL.createObjectURL(new Blob([text], { type: mime }));
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
