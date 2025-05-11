export function timestampToDate(filename: string): string {
  const rawTimestamp = filename.replace(/\.(jpg|jpeg|png)$/i, "");
  const timestamp = parseFloat(rawTimestamp);
  const date = new Date(timestamp * 1000);

  return date.toLocaleString("vi-VN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}
