import { useEffect, useMemo, useRef, useState } from "react";
import { api, API_URL } from "./api";
import { useVoice } from "./useVoice";

export default function Chat({ user, onLogout }) {
  const [workspace, setWorkspace] = useState({
    server: { name: "NexTalk" },
    channels: [],
    members: [],
  });
  const [online, setOnline] = useState([]);
  const [activeChannel, setActiveChannel] = useState(null);
  const [messages, setMessages] = useState([]);
  const [message, setMessage] = useState("");
  const [socketState, setSocketState] = useState("connecting");

  const socketRef = useRef(null);
  const reconnectRef = useRef(null);
  const activeChannelRef = useRef(null);

  const voice = useVoice({ userId: user.id, socketRef, online });

  useEffect(() => {
    activeChannelRef.current = activeChannel;
  }, [activeChannel]);

  useEffect(() => {
    api("/api/state")
      .then((data) => {
        setWorkspace({
          server: data.server,
          channels: data.channels || [],
          members: data.members || [],
        });
        setOnline(data.online || []);
        const firstText = (data.channels || []).find((c) => c.type === "text");
        if (firstText) setActiveChannel(firstText);
      })
      .catch(console.error);
  }, []);

  useEffect(() => {
    if (!activeChannel) return;
    api(`/api/channels/${activeChannel.id}/messages`)
      .then((data) => setMessages(data.messages || []))
      .catch(console.error);
  }, [activeChannel]);

  useEffect(() => {
    let cancelled = false;
    let retry = 1000;

    function connect() {
      if (cancelled) return;

      setSocketState("connecting");
      const token = localStorage.getItem("nextalk_token");
      const wsBase = API_URL.replace(/^http/, "ws");
      const ws = new WebSocket(`${wsBase}/ws?token=${encodeURIComponent(token)}`);
      socketRef.current = ws;

      ws.onopen = () => {
        retry = 1000;
        setSocketState("online");
        voice.rejoin();
      };

      ws.onerror = () => setSocketState("offline");

      ws.onclose = () => {
        setSocketState("offline");
        if (!cancelled) {
          reconnectRef.current = setTimeout(connect, retry);
          retry = Math.min(retry * 2, 10000);
        }
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);

          if (data.type === "chat" && data.channel_id === activeChannelRef.current?.id) {
            setMessages((old) => (
              old.some((item) => item.id === data.id) ? old : [...old, data]
            ));
          }

          if (data.type === "presence") {
            setOnline(data.users || []);
          }

          if (data.type === "voice_signal") {
            voice.handleSignal(data.from, data.signal);
          }
        } catch (err) {
          console.error(err);
        }
      };
    }

    connect();

    return () => {
      cancelled = true;
      clearTimeout(reconnectRef.current);
      socketRef.current?.close();
    };
  }, [voice.handleSignal, voice.rejoin]);

  function send(event) {
    event.preventDefault();
    const text = message.trim();
    const ws = socketRef.current;

    if (!text || !activeChannel || !ws || ws.readyState !== WebSocket.OPEN) return;

    ws.send(JSON.stringify({
      type: "chat",
      channel_id: activeChannel.id,
      text,
    }));
    setMessage("");
  }

  const onlineIds = useMemo(
    () => new Set(online.map((item) => item.id)),
    [online]
  );

  const textChannels = workspace.channels.filter((c) => c.type === "text");
  const voiceChannels = workspace.channels.filter((c) => c.type === "voice");
  const voiceUsers = online.filter((p) => p.voice_room === voice.channel?.id);

  return (
    <div className="app-shell">
      <aside className="server-rail">
        <button className="server active">N</button>
      </aside>

      <aside className="sidebar">
        <div className="workspace-head">
          <div>
            <strong>{workspace.server?.name || "NexTalk"}</strong>
            <span>Private server</span>
          </div>
          <span className={`connection-pill ${socketState}`}>{socketState}</span>
        </div>

        <div className="channel-block">
          <div className="section-title">TEXT CHANNELS</div>
          {textChannels.map((channel) => (
            <button
              key={channel.id}
              className={`channel ${activeChannel?.id === channel.id ? "selected" : ""}`}
              onClick={() => setActiveChannel(channel)}
            >
              <span>#</span>
              {channel.name}
            </button>
          ))}
        </div>

        <div className="channel-block">
          <div className="section-title">VOICE CHANNELS</div>
          {voiceChannels.map((channel) => {
            const count = online.filter((p) => p.voice_room === channel.id).length;
            return (
              <button
                key={channel.id}
                className={`channel ${voice.channel?.id === channel.id ? "selected" : ""}`}
                onClick={() => voice.join(channel)}
              >
                <span>◖</span>
                {channel.name}
                <small>{count || ""}</small>
              </button>
            );
          })}
        </div>

        {voice.channel && (
          <div className="voice-panel">
            <div className="voice-copy">
              <strong>Voice Connected</strong>
              <span>{voice.channel.name} · {voiceUsers.length} online</span>
            </div>

            <div className="voice-actions">
              <button className={voice.muted ? "active" : ""} onClick={voice.toggleMute}>
                {voice.muted ? "Unmute" : "Mute"}
              </button>
              <button className={voice.deafened ? "active" : ""} onClick={voice.toggleDeafen}>
                {voice.deafened ? "Undeafen" : "Deafen"}
              </button>
              <button onClick={() => voice.leave(true)}>Leave</button>
            </div>
          </div>
        )}

        {voice.error && <div className="error voice-error">{voice.error}</div>}

        <div className="user-panel">
          <div className="avatar">
            {(user.display_name || user.username || "U")[0].toUpperCase()}
          </div>
          <div className="user-copy">
            <strong>{user.display_name || user.username}</strong>
            <span className={`status ${socketState}`}>{socketState}</span>
          </div>
          <button title="Logout" onClick={onLogout}>↪</button>
        </div>
      </aside>

      <main className="chat">
        <header className="chat-head">
          <div>
            <span className="hash">#</span>
            <strong>{activeChannel?.name || "general"}</strong>
          </div>
          <div className="head-actions">
            <span>{onlineIds.size} online</span>
          </div>
        </header>

        <section className="message-list">
          <div className="channel-hero">
            <div className="hero-icon">#</div>
            <h2>Welcome to #{activeChannel?.name || "general"}</h2>
            <p>Messages are stored and synchronized in real time.</p>
          </div>

          {messages.map((item) => (
            <article className="message" key={item.id}>
              <div className="msg-avatar">
                {(item.author || "U")[0].toUpperCase()}
              </div>
              <div>
                <div className="msg-meta">
                  <strong>{item.author}</strong>
                  <span>
                    {new Date(item.sent_at).toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                </div>
                <p>{item.text}</p>
              </div>
            </article>
          ))}
        </section>

        <form className="composer" onSubmit={send}>
          <input
            maxLength={4000}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder={`Message #${activeChannel?.name || "general"}`}
          />
          <button type="submit">Send</button>
        </form>
      </main>

      <aside className="members">
        <div className="members-title">MEMBERS — {workspace.members.length}</div>

        {workspace.members.map((member) => {
          const isOnline = onlineIds.has(member.id);
          const live = online.find((p) => p.id === member.id);

          return (
            <div className={`member ${isOnline ? "online" : "offline"}`} key={member.id}>
              <div className="avatar small">
                {(member.display_name || member.username)[0].toUpperCase()}
              </div>
              <div>
                <strong>{member.display_name || member.username}</strong>
                <span>
                  {live?.voice_room ? "In voice" : isOnline ? "Online" : "Offline"}
                </span>
              </div>
            </div>
          );
        })}
      </aside>
    </div>
  );
}
