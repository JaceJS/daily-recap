export type Provider = "gitlab" | "github";

export type RegisterUserInput = {
  name: string;
  token: string;
  provider: Provider;
};

export type UserSession = {
  name: string;
  token: string;
  provider: Provider;
};
