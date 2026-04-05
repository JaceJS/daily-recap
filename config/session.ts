import { getIronSession, type IronSession } from "iron-session";
import { cookies } from "next/headers";
import { env } from "@/config/env";

export type SessionData = {
  name: string;
  token: string;
  provider: "gitlab" | "github";
};

const SESSION_OPTIONS = {
  cookieName: "session",
  password: env.SESSION_SECRET,
  ttl: 60 * 60 * 3, // 3 hours
  cookieOptions: {
    httpOnly: true,
    secure: env.NODE_ENV === "production",
    sameSite: "strict" as const,
  },
};

export async function getSession(): Promise<IronSession<SessionData>> {
  const cookieStore = await cookies();
  return getIronSession<SessionData>(cookieStore, SESSION_OPTIONS);
}
