// ───────────────────────────────────────────────────────────────────────────
//  EkkoJS · Pure ESM JavaScript & TypeScript runtime
//
//  License      MIT
//  Copyright    © 2026 Ampla Network LLC
//  Contact      hello@e-mc2.dev
//
//  EkkoJS is the result of the whole team's effort. Enjoy using it!
// ───────────────────────────────────────────────────────────────────────────

import { describe, test, expect } from "ekko:test";
import { createAuth } from "ekko:auth";

describe("oauth mapUser - GitHub built-in mapUser", () => {
  const auth = createAuth({ secret: "s", sessionTTL: 3600 });
  auth.oauth.provider("github", { clientId: "id", clientSecret: "sec" });
  const mapUser = auth.oauth.providers.github.mapUser;

  const githubProfile = {
    id: 12345,
    login: "octocat",
    email: "octocat@github.com",
    avatar_url: "https://avatars.githubusercontent.com/u/12345",
    name: "The Octocat",
  };

  test("GitHub mapUser extracts id as string", () => {
    const user = mapUser(githubProfile);
    expect(user.id).toBe("12345");
  });

  test("GitHub mapUser extracts login as name", () => {
    const user = mapUser(githubProfile);
    expect(user.name).toBe("octocat");
  });

  test("GitHub mapUser extracts email", () => {
    const user = mapUser(githubProfile);
    expect(user.email).toBe("octocat@github.com");
  });

  test("GitHub mapUser extracts avatar_url as avatar", () => {
    const user = mapUser(githubProfile);
    expect(user.avatar).toBe("https://avatars.githubusercontent.com/u/12345");
  });
});

describe("oauth mapUser - Google built-in mapUser", () => {
  const auth = createAuth({ secret: "s", sessionTTL: 3600 });
  auth.oauth.provider("google", { clientId: "id", clientSecret: "sec" });
  const mapUser = auth.oauth.providers.google.mapUser;

  const googleProfile = {
    id: "google-uid-abc",
    sub: "google-uid-abc",
    name: "Jane Doe",
    email: "jane@gmail.com",
    picture: "https://lh3.googleusercontent.com/photo.jpg",
  };

  test("Google mapUser extracts id", () => {
    const user = mapUser(googleProfile);
    
    expect(user.id).toBe("google-uid-abc");
  });

  test("Google mapUser extracts name", () => {
    const user = mapUser(googleProfile);
    expect(user.name).toBe("Jane Doe");
  });

  test("Google mapUser extracts email", () => {
    const user = mapUser(googleProfile);
    expect(user.email).toBe("jane@gmail.com");
  });

  test("Google mapUser extracts picture as avatar", () => {
    const user = mapUser(googleProfile);
    expect(user.avatar).toBe("https://lh3.googleusercontent.com/photo.jpg");
  });
});

describe("oauth mapUser - Discord built-in mapUser", () => {
  const auth = createAuth({ secret: "s", sessionTTL: 3600 });
  auth.oauth.provider("discord", { clientId: "id", clientSecret: "sec" });
  const mapUser = auth.oauth.providers.discord.mapUser;

  const discordProfile = {
    id: "987654321",
    username: "DiscordUser",
    email: "discord@example.com",
    avatar: "abc123hash",
  };

  test("Discord mapUser extracts id", () => {
    const user = mapUser(discordProfile);
    expect(user.id).toBe("987654321");
  });

  test("Discord mapUser extracts username as name", () => {
    const user = mapUser(discordProfile);
    expect(user.name).toBe("DiscordUser");
  });

  test("Discord mapUser extracts email", () => {
    const user = mapUser(discordProfile);
    expect(user.email).toBe("discord@example.com");
  });

  test("Discord mapUser constructs avatar URL from id + avatar hash", () => {
    const user = mapUser(discordProfile);
    
    expect(user.avatar.includes("987654321")).toBe(true);
    expect(user.avatar.includes("abc123hash")).toBe(true);
  });
});

describe("oauth mapUser - custom mapUser", () => {
  test("custom mapUser receives full profile", () => {
    const auth = createAuth({ secret: "s", sessionTTL: 3600 });
    let receivedProfile: any = null;
    auth.oauth.provider({
      name: "spy",
      authorizeUrl: "https://spy.io/auth",
      tokenUrl: "https://spy.io/token",
      userInfoUrl: "https://spy.io/user",
      clientId: "c",
      clientSecret: "s",
      scopes: [],
      mapUser(p: any) { receivedProfile = p; return { id: p.id, name: p.n, email: p.e }; },
    });
    const profile = { id: "x1", n: "Spy", e: "spy@x.com", extra: "data" };
    auth.oauth.providers.spy.mapUser(profile);
    expect(receivedProfile).not.toBeNull();
    expect(receivedProfile.id).toBe("x1");
    expect(receivedProfile.extra).toBe("data");
  });

  test("custom mapUser return shape used", () => {
    const auth = createAuth({ secret: "s", sessionTTL: 3600 });
    auth.oauth.provider({
      name: "shaped",
      authorizeUrl: "https://x.io/auth",
      tokenUrl: "https://x.io/token",
      userInfoUrl: "https://x.io/user",
      clientId: "c",
      clientSecret: "s",
      scopes: [],
      mapUser(p: any) { return { id: "custom-" + p.uid, name: p.full_name, email: p.contact }; },
    });
    const result = auth.oauth.providers.shaped.mapUser({ uid: "42", full_name: "Alice", contact: "alice@co.io" });
    expect(result.id).toBe("custom-42");
    expect(result.name).toBe("Alice");
    expect(result.email).toBe("alice@co.io");
  });

  test("default mapUser (when not provided) extracts id/name/email", () => {
    const auth = createAuth({ secret: "s", sessionTTL: 3600 });
    auth.oauth.provider({
      name: "defaults",
      authorizeUrl: "https://d.io/auth",
      tokenUrl: "https://d.io/token",
      userInfoUrl: "https://d.io/user",
      clientId: "c",
      clientSecret: "s",
      scopes: [],
    });
    const result = auth.oauth.providers.defaults.mapUser({ id: "555", name: "Defaulter", email: "def@d.com" });
    expect(result.id).toBe("555");
    expect(result.name).toBe("Defaulter");
    expect(result.email).toBe("def@d.com");
  });
});
