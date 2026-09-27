export const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8080";

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
