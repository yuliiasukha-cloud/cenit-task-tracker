import { google } from "googleapis";

import { getPrisma } from "@/lib/prisma";
import { taskOnCalendarDay } from "@/lib/task-calendar-day";

type TaskRow = {
  id: string;
  title: string;
  deadline: Date | null;
  calendarDate: Date | null;
};

/**
 * Insert one Calendar event per protocol task for the given local calendar day.
 * Uses the Google OAuth account row (refresh token) for this user.
 */
export async function insertProtocolTasksAsCalendarEvents(options: {
  userId: string;
  day: Date;
  /** IANA zone for Calendar API (pass from browser when possible). */
  eventTimeZone: string;
}): Promise<{ ok: true; created: number } | { ok: false; error: string }> {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    return { ok: false, error: "Google OAuth is not configured on the server." };
  }

  const prisma = getPrisma();
  const account = await prisma.account.findFirst({
    where: { userId: options.userId, provider: "google" },
  });

  if (!account?.refresh_token) {
    return {
      ok: false,
      error:
        "No Google refresh token on file. Sign out, then sign in again so Calendar access can be granted.",
    };
  }

  const rows = await prisma.task.findMany({
    where: {
      userId: options.userId,
      protocolApproved: true,
      done: false,
    },
  });

  const day = options.day;
  const dto = (t: TaskRow) => ({
    deadline: t.deadline ? t.deadline.toISOString() : null,
    calendarDate: t.calendarDate ? t.calendarDate.toISOString() : null,
  });

  const forDay = rows.filter((t) => taskOnCalendarDay(dto(t), day));

  if (forDay.length === 0) {
    return { ok: false, error: "No tasks on your protocol for this day." };
  }

  const oauth2 = new google.auth.OAuth2(clientId, clientSecret);
  oauth2.setCredentials({ refresh_token: account.refresh_token });

  const calendar = google.calendar({ version: "v3", auth: oauth2 });
  const tz = options.eventTimeZone || "UTC";

  let created = 0;
  for (const t of forDay) {
    const start = t.deadline ?? t.calendarDate ?? day;
    const end = new Date(start.getTime() + 45 * 60_000);

    await calendar.events.insert({
      calendarId: "primary",
      requestBody: {
        summary: `Cénit — ${t.title}`,
        description: "Added from Cénit task protocol",
        start: { dateTime: start.toISOString(), timeZone: tz },
        end: { dateTime: end.toISOString(), timeZone: tz },
      },
    });
    created += 1;
  }

  return { ok: true, created };
}
