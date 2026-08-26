import { formatDate } from "@/lib/utils";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://invitee.co.tz";

export interface TemplateContext {
  name:     string;
  date:     Date | string;
  venue:    string;
  rsvpToken?: string;
}

/* Replaces {name}, {date}, {venue}, {rsvp_link} with their values */
export function renderTemplate(message: string, context: TemplateContext): string {
  const values: Record<string, string> = {
    name:      context.name,
    date:      formatDate(context.date),
    venue:     context.venue,
    rsvp_link: context.rsvpToken
      ? `${APP_URL}/rsvp/${context.rsvpToken}`
      : `${APP_URL}/rsvp`,
  };

  return message.replace(/\{(\w+)\}/g, (match, key: string) =>
    Object.prototype.hasOwnProperty.call(values, key) ? values[key] : match
  );
}
