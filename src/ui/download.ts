/** Save text as a file in the browser's downloads. */
export function downloadText(filename: string, text: string, type: string) {
  // A BOM makes Excel open UTF-8 CSV files (Bangla text, ৳) correctly.
  const body = type.startsWith("text/csv") ? "﻿" + text : text;
  const url = URL.createObjectURL(new Blob([body], { type }));
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export const stamp = (d = new Date()) => d.toISOString().slice(0, 10);
