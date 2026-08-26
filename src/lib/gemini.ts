import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

const flashModel = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
const proModel   = genAI.getGenerativeModel({ model: "gemini-1.5-pro" });

export async function suggestNotificationMessage(
  eventName: string,
  eventType: string,
  notifType: string,
  language: "en" | "sw"
): Promise<string> {
  const langInstruction = language === "sw" ? "Write the message in Swahili." : "Write the message in English.";
  const prompt = `
    You are composing a short ${notifType} message for an event organizer.
    Event: "${eventName}" (type: ${eventType}).
    ${langInstruction}
    Keep the message under 160 characters for SMS compatibility.
    Be warm, concise, and professional.
    Return only the message text, no explanation.
  `.trim();

  const result = await flashModel.generateContent(prompt);
  return result.response.text().trim();
}

export async function interpretRsvpReply(rawMessage: string): Promise<"yes" | "no" | "unknown"> {
  const prompt = `
    A guest replied to an event RSVP request with: "${rawMessage}"
    Determine if this is a YES (accepting the invitation), NO (declining), or UNKNOWN.
    Reply with exactly one word: YES, NO, or UNKNOWN.
  `.trim();

  const result = await flashModel.generateContent(prompt);
  const answer = result.response.text().trim().toUpperCase();
  if (answer === "YES") return "yes";
  if (answer === "NO") return "no";
  return "unknown";
}

export async function generatePostEventSummary(eventData: {
  eventName:        string;
  eventType:        string;
  totalInvitees:    number;
  rsvpConfirmed:    number;
  attendees:        number;
  totalPledged:     string;
  totalCollected:   string;
  currencyCode:     string;
}): Promise<string> {
  const prompt = `
    Write a short, warm post-event summary paragraph (3-4 sentences) for an event organizer.
    Event: "${eventData.eventName}" (${eventData.eventType})
    Stats:
    - Invited: ${eventData.totalInvitees} guests
    - RSVP confirmed: ${eventData.rsvpConfirmed}
    - Attended: ${eventData.attendees}
    - Contributions pledged: ${eventData.totalPledged} ${eventData.currencyCode}
    - Contributions collected: ${eventData.totalCollected} ${eventData.currencyCode}
    Be celebratory and positive. Highlight the key achievements.
  `.trim();

  const result = await proModel.generateContent(prompt);
  return result.response.text().trim();
}
