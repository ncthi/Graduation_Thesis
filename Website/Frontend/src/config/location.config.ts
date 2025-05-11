export function convertToDMS(decimal: number, isLat: boolean): string {
  const direction = isLat
    ? decimal >= 0 ? "N" : "S"
    : decimal >= 0 ? "E" : "W";

  const absVal = Math.abs(decimal);
  const degrees = Math.floor(absVal);
  const minutesFloat = (absVal - degrees) * 60;
  const minutes = Math.floor(minutesFloat);
  const seconds = ((minutesFloat - minutes) * 60).toFixed(2);

  return `${degrees}°${minutes}'${seconds}" ${direction}`;
}

export function parseLocation(locationStr?: string) {
  if (!locationStr) return null;
  const match = locationStr.match(/\(([^,]+),\s*([^)]+)\)/);
  if (!match) return null;

  const lat = parseFloat(match[1]);
  const lng = parseFloat(match[2]);

  return {
    lat,
    lng,
    latDMS: convertToDMS(lat, true),
    lngDMS: convertToDMS(lng, false),
  };
}
