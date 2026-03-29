export function getNextDueDate(dueDate: string, type: string): string {
  const d = new Date(dueDate + 'T00:00:00');
  switch (type) {
    case 'monthly':
      d.setMonth(d.getMonth() + 1);
      break;
    case 'quarterly':
      d.setMonth(d.getMonth() + 3);
      break;
    case 'yearly':
      d.setFullYear(d.getFullYear() + 1);
      break;
  }
  return d.toISOString().split('T')[0];
}

/** Shift an array of YYYY-MM-DD date strings forward by a number of days. */
export function shiftDates(dates: string[], daysDelta: number): string[] {
  return dates.map((dateStr) => {
    const d = new Date(dateStr + 'T00:00:00');
    d.setDate(d.getDate() + daysDelta);
    return d.toISOString().split('T')[0];
  });
}

/** Returns today's date as YYYY-MM-DD in the given IANA timezone. */
export function getTodayInTimezone(tz: string): string {
  return new Date().toLocaleDateString('en-CA', { timeZone: tz });
}

/** Check if `now` is within +/- 7 minutes of the target HH:mm in the given timezone. */
export function isInDeliveryWindow(timeStr: string, timezone: string, now: Date): boolean {
  const [hours, minutes] = timeStr.split(':').map(Number);

  // Get current time in the user's timezone
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    hour: '2-digit', minute: '2-digit',
    hour12: false,
  });
  const nowParts = formatter.formatToParts(now);
  const getPart = (type: string) => nowParts.find((p) => p.type === type)?.value ?? '0';
  const nowHours = parseInt(getPart('hour'), 10);
  const nowMinutes = parseInt(getPart('minute'), 10);

  const targetMinutes = hours * 60 + minutes;
  const currentMinutes = nowHours * 60 + nowMinutes;
  // Handle midnight wraparound (e.g., target=23:55, current=00:03)
  const diff = Math.min(
    Math.abs(currentMinutes - targetMinutes),
    1440 - Math.abs(currentMinutes - targetMinutes),
  );
  return diff <= 7;
}
