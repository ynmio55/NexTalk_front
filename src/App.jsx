import { useEffect, useState } from "react";
import { api } from "./api";
import Chat from "./Chat";

function Auth({ onDone }) {
  const [mode, setMode] = useState("login");
  const [form, setForm] = useState({
    username: "",
    display_name: "",
    password: "",
    invite_code: "",
  });
  const [error, setError] = useState("");

  async function submit(event) {
    event.preventDefault();
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
          <p>
            {mode === "login"
              ? "Welcome back. Your group is waiting."
              : "Create your NexTalk account."}
          </p>
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
          <>
          <label>
            Display name
            <input
              value={form.display_name}
              onChange={(e) => setForm({ ...form, display_name: e.target.value })}
              placeholder="Mio"
            />
          </label>
          <label>
            Invite code
            <input
              value={form.invite_code}
              onChange={(e) => setForm({ ...form, invite_code: e.target.value })}
              placeholder="Private invite code"
              autoComplete="off"
            />
          </label>
          </>
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

        <button className="primary">
          {mode === "login" ? "Sign in" : "Create account"}
        </button>

        <button
          type="button"
          className="text-button"
          onClick={() => setMode(mode === "login" ? "register" : "login")}
        >
          {mode === "login"
            ? "Need an account? Register"
            : "Already have an account? Sign in"}
        </button>
      </form>
    </div>
  );
}

export default function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(
    Boolean(localStorage.getItem("nextalk_token"))
  );

  useEffect(() => {
    if (!localStorage.getItem("nextalk_token")) {
      setLoading(false);
      return;
    }

    api("/api/me")
      .then(setUser)
      .catch(() => localStorage.removeItem("nextalk_token"))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="loading">NexTalk</div>;
  if (!user) return <Auth onDone={setUser} />;

  return (
    <Chat
      user={user}
      onLogout={() => {
        localStorage.removeItem("nextalk_token");
        setUser(null);
      }}
    />
  );
}
