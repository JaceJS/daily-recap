import type { Provider } from "@/types";

export type UserSession = {
  name: string;
  token: string;
  provider: Provider;
};
