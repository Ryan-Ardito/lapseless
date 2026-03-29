import { DatePicker, type DatePickerProps } from '@mantine/dates';
import { Text, Stack } from '@mantine/core';
import { useCallback, useMemo } from 'react';

interface ReminderCalendarProps {
  dueDate: string | null;
  reminderDates: string[];
  onChange: (dates: string[]) => void;
  disabled?: boolean;
}

/** Convert YYYY-MM-DD strings to Date objects for Mantine DatePicker */
function toDate(dateStr: string): Date {
  return new Date(dateStr + 'T00:00:00');
}

/** Convert Date to YYYY-MM-DD string using local time (not UTC) */
function toDateStr(d: Date): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function ReminderCalendar({ dueDate, reminderDates, onChange, disabled }: ReminderCalendarProps) {
  const selectedDates = useMemo(
    () => reminderDates.map(toDate),
    [reminderDates],
  );

  const dueDateObj = useMemo(
    () => dueDate ? toDate(dueDate) : undefined,
    [dueDate],
  );

  const today = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }, []);

  const handleChange = useCallback(
    (dates: Date[]) => {
      if (disabled) return;
      onChange(dates.map(toDateStr).sort());
    },
    [disabled, onChange],
  );

  const getDayProps: DatePickerProps<'multiple'>['getDayProps'] = useCallback(
    (date: Date) => {
      const isDue = dueDate && toDateStr(date) === dueDate;
      return {
        style: isDue
          ? {
              border: '2px solid var(--mantine-color-red-5)',
              borderRadius: '50%',
            }
          : undefined,
      };
    },
    [dueDate],
  );

  const count = reminderDates.length;

  return (
    <Stack gap={4}>
      <DatePicker
        type="multiple"
        value={selectedDates}
        onChange={handleChange}
        getDayProps={getDayProps}
        minDate={today}
        maxDate={dueDateObj}
        size="sm"
        defaultDate={dueDateObj ?? today}
        style={disabled ? { pointerEvents: 'none', opacity: 0.7 } : undefined}
      />
      <Text size="xs" c="dimmed" ta="center">
        {count === 0
          ? 'No reminders scheduled'
          : `${count} reminder${count === 1 ? '' : 's'} scheduled`}
        {dueDate && (
          <Text span c="red.5" inherit> &bull; Due date outlined in red</Text>
        )}
      </Text>
    </Stack>
  );
}
