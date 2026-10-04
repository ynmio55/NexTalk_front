export const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8080";

const turnUrl = import.meta.env.VITE_TURN_URL;
export const RTC_CONFIG = {
  iceServers: [
    { urls: "stun:stun.l.google.com:19302" },
    ...(turnUrl ? [{
      urls: turnUrl,
      username: import.meta.env.VITE_TURN_USERNAME || "",
      credential: import.meta.env.VITE_TURN_CREDENTIAL || "",
    }] : []),
  ],
};

export async function api(path, options = {}) {
  const token = localStorage.getItem("nextalk_token");
  const res = await fetch(API_URL + path, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers || {}),
    },
  });

  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(body.error || "Request failed");
  return body;
}
