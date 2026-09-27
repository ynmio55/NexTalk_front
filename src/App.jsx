import { useEffect, useState } from "react";
import { api, API_URL } from "./api";

const demoChannels = [
  { icon: "#", name: "general", type: "text" },
  { icon: "#", name: "random", type: "text" },
  { icon: "◖", name: "General Voice", type: "voice" },
  { icon: "◖", name: "Gaming", type: "voice" },
];

function Auth({ onDone }) {
  const [mode, setMode] = useState("login");
  const [form, setForm] = useState({ username: "", display_name: "", password: "" });
  const [error, setError] = useState("");

  async function submit(e) {
    e.preventDefault();
    setError("");
    try {
      const data = await api(`/api/auth/${mode}`, {
        method: "POST",
        body: JSON.stringify(form),
      });
      localStorage.setItem("nextalk_token", data.token);
      onDone(data.user);
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <div className="auth-page">
      <div className="brand-mark">N</div>
      <form className="auth-card" onSubmit={submit}>
        <div>
          <div className="eyebrow">PRIVATE CHAT</div>
          <h1>NexTalk</h1>
          <p>{mode === "login" ? "Welcome back. Your group is waiting." : "Create your NexTalk account."}</p>
        </div>

        <label>
          Username
          <input
            value={form.username}
            onChange={(e) => setForm({ ...form, username: e.target.value })}
            placeholder="mio55"
            autoComplete="username"
          />
        </label>

        {mode === "register" && (
          <label>
            Display name
            <input
              value={form.display_name}
              onChange={(e) => setForm({ ...form, display_name: e.target.value })}
              placeholder="Mio"
            />
          </label>
        )}

        <label>
          Password
          <input
            type="password"
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
            placeholder="••••••••"
            autoComplete={mode === "login" ? "current-password" : "new-password"}
          />
        </label>

        {error && <div className="error">{error}</div>}
        <button className="primary">{mode === "login" ? "Sign in" : "Create account"}</button>

        <button type="button" className="text-button" onClick={() => setMode(mode === "login" ? "register" : "login")}>
          {mode === "login" ? "Need an account? Register" : "Already have an account? Sign in"}
        </button>
      </form>
    </div>
  );
}

function Chat({ user, onLogout }) {
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState([
    { id: 1, author: "NexTalk", text: "Welcome to your private server.", time: "now" },
  ]);
  const [socketState, setSocketState] = useState("connecting");

  useEffect(() => {
    const token = localStorage.getItem("nextalk_token");
    const wsBase = API_URL.replace(/^http/, "ws");
    const ws = new WebSocket(`${wsBase}/ws?token=${encodeURIComponent(token)}`);

    ws.onopen = () => setSocketState("online");
    ws.onclose = () => setSocketState("offline");
    ws.onerror = () => setSocketState("offline");
    ws.onmessage = (e) => {
      try {
        const data = JSON.parse(e.data);
        if (data.type === "chat" && data.text) {
          setMessages((old) => [...old, {
            id: crypto.randomUUID(),
            author: data.from === user.id ? user.display_name || user.username : "Friend",
            text: data.text,
            time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
          }]);
        }
      } catch {}
    };

    window.__nextalkSocket = ws;
    return () => ws.close();
  }, [user]);

  function send(e) {
    e.preventDefault();
    const text = message.trim();
    if (!text) return;
    const ws = window.__nextalkSocket;
    if (!ws || ws.readyState !== WebSocket.OPEN) return;
    ws.send(JSON.stringify({ type: "chat", text }));
    setMessage("");
  }

  return (
    <div className="app-shell">
      <aside className="server-rail">
        <button className="server active">N</button>
        <button className="server add">+</button>
      </aside>

      <aside className="sidebar">
        <div className="workspace-head">
          <div>
            <strong>NexTalk</strong>
            <span>Private server</span>
          </div>
          <button>⌄</button>
        </div>

        <div className="channel-block">
          <div className="section-title">TEXT CHANNELS <button>+</button></div>
          {demoChannels.filter(c => c.type === "text").map((c, i) => (
            <button key={c.name} className={"channel " + (i === 0 ? "selected" : "")}>
              <span>{c.icon}</span>{c.name}
            </button>
          ))}
        </div>

        <div className="channel-block">
          <div className="section-title">VOICE CHANNELS <button>+</button></div>
          {demoChannels.filter(c => c.type === "voice").map(c => (
            <button key={c.name} className="channel"><span>{c.icon}</span>{c.name}</button>
          ))}
        </div>

        <div className="user-panel">
          <div className="avatar">{(user.display_name || user.username || "U")[0].toUpperCase()}</div>
          <div className="user-copy">
            <strong>{user.display_name || user.username}</strong>
            <span className={"status " + socketState}>{socketState}</span>
          </div>
          <button title="Microphone">◉</button>
          <button title="Settings">⚙</button>
          <button title="Logout" onClick={onLogout}>↪</button>
        </div>
      </aside>

      <main className="chat">
        <header className="chat-head">
          <div><span className="hash">#</span><strong>general</strong></div>
          <div className="head-actions"><button>◖</button><button>⌕</button><button>☻</button></div>
        </header>

        <section className="message-list">
          <div className="channel-hero">
            <div className="hero-icon">#</div>
            <h2>Welcome to #general</h2>
            <p>This is the beginning of the NexTalk general channel.</p>
          </div>

          {messages.map((m) => (
            <article className="message" key={m.id}>
              <div className="msg-avatar">{m.author[0]}</div>
              <div>
                <div className="msg-meta"><strong>{m.author}</strong><span>{m.time}</span></div>
                <p>{m.text}</p>
              </div>
            </article>
          ))}
        </section>

        <form className="composer" onSubmit={send}>
          <button type="button">+</button>
          <input value={message} onChange={(e) => setMessage(e.target.value)} placeholder="Message #general" />
          <button type="button">☺</button>
        </form>
      </main>

      <aside className="members">
        <div className="members-title">ONLINE — 1</div>
        <div className="member">
          <div className="avatar small">{(user.display_name || user.username)[0].toUpperCase()}</div>
          <div><strong>{user.display_name || user.username}</strong><span>Online</span></div>
        </div>
      </aside>
    </div>
  );
}

export default function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(Boolean(localStorage.getItem("nextalk_token")));

  useEffect(() => {
    if (!localStorage.getItem("nextalk_token")) return;
    api("/api/me")
      .then(setUser)
      .catch(() => localStorage.removeItem("nextalk_token"))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="loading">NexTalk</div>;
  if (!user) return <Auth onDone={setUser} />;

  return <Chat user={user} onLogout={() => {
    localStorage.removeItem("nextalk_token");
    setUser(null);
  }} />;
}
