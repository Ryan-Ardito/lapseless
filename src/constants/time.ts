/** 30-minute interval time options for Select dropdowns (Google Calendar style). */
export const TIME_OPTIONS = Array.from({ length: 48 }, (_, i) => {
  const h24 = Math.floor(i / 2);
  const m = i % 2 === 0 ? '00' : '30';
  const value = `${String(h24).padStart(2, '0')}:${m}`;
  const h12 = h24 === 0 ? 12 : h24 > 12 ? h24 - 12 : h24;
  const ampm = h24 < 12 ? 'AM' : 'PM';
  return { value, label: `${h12}:${m} ${ampm}` };
});
