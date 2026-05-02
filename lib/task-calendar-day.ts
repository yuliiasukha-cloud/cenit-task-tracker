/** Calendar day match (local date parts) for list + protocol. */

export type TaskCalendarFields = {
  deadline: string | null;
  calendarDate: string | null;
};

function isSameLocalDay(a: Date, b: Date) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

export function taskOnCalendarDay(task: TaskCalendarFields, day: Date): boolean {
  if (task.deadline) {
    return isSameLocalDay(new Date(task.deadline), day);
  }
  if (task.calendarDate) {
    return isSameLocalDay(new Date(task.calendarDate), day);
  }
  return isSameLocalDay(day, new Date());
}
