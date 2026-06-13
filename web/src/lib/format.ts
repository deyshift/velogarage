/** Meters -> rounded kilometers, with thousands separators. */
export const km = (meters?: number) => Math.round((meters || 0) / 1000).toLocaleString();
