import { useEffect, useMemo, useRef, useState } from "react";
import { api, API_URL } from "./api";
import { useVoice } from "./useVoice";

const AVATAR_COLORS = [
  "#3f5f73", "#6b5b73", "#5f6d52", "#765b4f",
  "#4e637d", "#6e6450", "#516c69", "#725969",
];

function avatarStyle(name = "") {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return { backgroundColor: AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length] };
}

function Icon({ name, size = 18 }) {
  const common = { width: size, height: size, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 1.8, strokeLinecap: "round", strokeLinejoin: "round", "aria-hidden": true };
  const paths = {
    hash: <><path d="M5 9h14M5 15h14M10 3 8 21M16 3l-2 18" /></>,
    volume: <><path d="M11 5 6 9H3v6h3l5 4V5Z" /><path d="M15.5 8.5a5 5 0 0 1 0 7" /><path d="M18 5.5a9 9 0 0 1 0 13" /></>,
    users: <><path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="8.5" cy="7" r="4" /><path d="M20 21v-2.5a4 4 0 0 0-3-3.7M15.5 3.3a4 4 0 0 1 0 7.4" /></>,
    mic: <><rect x="9" y="2" width="6" height="12" rx="3" /><path d="M5 10v1a7 7 0 0 0 14 0v-1M12 18v4M8 22h8" /></>,
    micOff: <><path d="m3 3 18 18" /><path d="M9 9v2a3 3 0 0 0 4.5 2.6M15 9V5a3 3 0 0 0-5.8-1" /><path d="M5 10v1a7 7 0 0 0 11.2 5.6M19 10v1a7 7 0 0 1-.4 2.4M12 18v4M8 22h8" /></>,
    headphones: <><path d="M3 18v-6a9 9 0 0 1 18 0v6" /><path d="M21 19a2 2 0 0 1-2 2h-2v-7h4v5ZM3 19a2 2 0 0 0 2 2h2v-7H3v5Z" /></>,
    phoneOff: <><path d="m3 3 18 18" /><path d="M7.4 7.4c-.2.7-.2 1.4 0 2.1a15 15 0 0 0 7.1 7.1c.7.2 1.4.2 2.1 0l2.1-1.1a1.5 1.5 0 0 1 1.7.3l1.1 1.1a2 2 0 0 1 .2 2.6c-1 1.4-2.5 2.1-4.2 2a19.5 19.5 0 0 1-15-15c-.1-1.7.6-3.2 2-4.2a2 2 0 0 1 2.6.2l.9.9" /></>,
    logout: <><path d="M10 17l5-5-5-5M15 12H3M21 3v18h-6" /></>,
    plus: <><path d="M12 5v14M5 12h14" /></>,
    send: <><path d="m22 2-7 20-4-9-9-4 20-7Z" /><path d="M22 2 11 13" /></>,
    menu: <><path d="M4 7h16M4 12h16M4 17h16" /></>,
    close: <><path d="m6 6 12 12M18 6 6 18" /></>,
    info: <><circle cx="12" cy="12" r="9" /><path d="M12 11v5M12 8h.01" /></>,
  };
  return <svg {...common}>{paths[name]}</svg>;
}

export default function Chat({ user, onLogout }) {
  const [workspace, setWorkspace] = useState({ server: { name: "NexTalk" }, channels: [], members: [] });
  const [online, setOnline] = useState([]);
  const [activeChannel, setActiveChannel] = useState(null);
  const [messages, setMessages] = useState([]);
  const [message, setMessage] = useState("");
  const [socketState, setSocketState] = useState("connecting");
  const [navOpen, setNavOpen] = useState(false);
  const [membersOpen, setMembersOpen] = useState(false);

  const socketRef = useRef(null);
  const reconnectRef = useRef(null);
  const activeChannelRef = useRef(null);
  const messagesEndRef = useRef(null);

  const voice = useVoice({ userId: user.id, socketRef, online });

  useEffect(() => { activeChannelRef.current = activeChannel; }, [activeChannel]);

  useEffect(() => {
    api("/api/state")
      .then((data) => {
        const channels = data.channels || [];
        setWorkspace({ server: data.server || { name: "NexTalk" }, channels, members: data.members || [] });
        setOnline(data.online || []);
        setActiveChannel(channels.find((c) => c.type === "text") || null);
      })
      .catch(console.error);
  }, []);

  useEffect(() => {
    if (!activeChannel) return;
    api(`/api/channels/${activeChannel.id}/messages`)
      .then((data) => {
        setMessages(data.messages || []);
        requestAnimationFrame(() => messagesEndRef.current?.scrollIntoView());
      })
      .catch(console.error);
  }, [activeChannel]);

  useEffect(() => {
    let cancelled = false;
    let retry = 1000;

    function connect() {
      if (cancelled) return;
      setSocketState("connecting");
      const token = localStorage.getItem("nextalk_token");
      const ws = new WebSocket(`${API_URL.replace(/^http/, "ws")}/ws?token=${encodeURIComponent(token)}`);
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
            setMessages((old) => old.some((m) => m.id === data.id) ? old : [...old, data]);
            setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }), 40);
          }
          if (data.type === "presence") setOnline(data.users || []);
          if (data.type === "voice_signal") voice.handleSignal(data.from, data.signal);
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
    ws.send(JSON.stringify({ type: "chat", channel_id: activeChannel.id, text }));
    setMessage("");
  }

  const onlineIds = useMemo(() => new Set(online.map((p) => p.id)), [online]);
  const textChannels = workspace.channels.filter((c) => c.type === "text");
  const voiceChannels = workspace.channels.filter((c) => c.type === "voice");
  const sortedMembers = useMemo(() => [...workspace.members].sort((a, b) => Number(onlineIds.has(b.id)) - Number(onlineIds.has(a.id))), [workspace.members, onlineIds]);

  const displayName = user.display_name || user.username;
  const activeVoiceUsers = voice.channel ? online.filter((p) => p.voice_room === voice.channel.id) : [];

  return (
    <div className={`nextalk-shell ${navOpen ? "nav-open" : ""}`}>
      <button className="mobile-scrim" aria-label="Close navigation" onClick={() => setNavOpen(false)} />

      <aside className="nt-sidebar">
        <div className="nt-brand">
          <div className="nt-brand-mark">N</div>
          <div>
            <strong>{workspace.server?.name || "NexTalk"}</strong>
            <span>{socketState === "online" ? "Connected" : socketState === "connecting" ? "Connecting…" : "Offline"}</span>
          </div>
          <button className="mobile-close" onClick={() => setNavOpen(false)} aria-label="Close"><Icon name="close" /></button>
        </div>

        <div className="nt-nav-scroll">
          <section className="nt-section">
            <div className="nt-section-label">Chats</div>
            {textChannels.map((channel) => (
              <button
                key={channel.id}
                className={`nt-room-row ${activeChannel?.id === channel.id ? "active" : ""}`}
                onClick={() => { setActiveChannel(channel); setNavOpen(false); }}
              >
                <span className="nt-room-icon"><Icon name="hash" size={16} /></span>
                <span>{channel.name}</span>
              </button>
            ))}
          </section>

          <section className="nt-section">
            <div className="nt-section-label">Voice</div>
            {voiceChannels.map((channel) => {
              const roomMembers = online.filter((p) => p.voice_room === channel.id);
              const current = voice.channel?.id === channel.id;
              return (
                <div key={channel.id} className="nt-voice-group">
                  <button
                    className={`nt-room-row voice ${current ? "active" : ""}`}
                    onClick={() => { voice.join(channel); setNavOpen(false); }}
                  >
                    <span className="nt-room-icon"><Icon name="volume" size={16} /></span>
                    <span>{channel.name}</span>
                    {roomMembers.length > 0 && <span className="nt-room-count">{roomMembers.length}</span>}
                  </button>
                  {roomMembers.length > 0 && (
                    <div className="nt-voice-people">
                      {roomMembers.map((person) => (
                        <div className="nt-voice-person" key={person.id}>
                          <span className="mini-avatar" style={avatarStyle(person.display_name || person.username)}>
                            {(person.display_name || person.username || "?")[0].toUpperCase()}
                          </span>
                          <span>{person.display_name || person.username}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </section>
        </div>

        <div className="nt-account">
          <div className="nt-account-main">
            <div className="avatar" style={avatarStyle(displayName)}>{displayName?.[0]?.toUpperCase() || "U"}</div>
            <div className="nt-account-text">
              <strong>{displayName}</strong>
              <span>@{user.username}</span>
            </div>
          </div>
          <button className="icon-button" title="Sign out" onClick={onLogout}><Icon name="logout" /></button>
        </div>
      </aside>

      <main className="nt-main">
        <header className="nt-topbar">
          <div className="nt-topbar-title">
            <button className="mobile-menu" onClick={() => setNavOpen(true)} aria-label="Open navigation"><Icon name="menu" /></button>
            <div>
              <strong>{activeChannel?.name || "general"}</strong>
              <span>{onlineIds.size} online</span>
            </div>
          </div>
          <button className={`icon-button ${membersOpen ? "active" : ""}`} title="People" onClick={() => setMembersOpen((v) => !v)}>
            <Icon name="users" />
          </button>
        </header>

        {voice.channel && (
          <div className="nt-callbar">
            <div className="nt-callbar-main">
              <span className="call-live-dot" />
              <div>
                <strong>{voice.channel.name}</strong>
                <span>{activeVoiceUsers.length} in call</span>
              </div>
            </div>
            <div className="nt-call-actions">
              <button className={`call-button ${voice.muted ? "danger" : ""}`} onClick={voice.toggleMute} title={voice.muted ? "Unmute" : "Mute"}>
                <Icon name={voice.muted ? "micOff" : "mic"} />
              </button>
              <button className={`call-button ${voice.deafened ? "danger" : ""}`} onClick={voice.toggleDeafen} title={voice.deafened ? "Undeafen" : "Deafen"}>
                <Icon name="headphones" />
              </button>
              <button className="call-button danger" onClick={() => voice.leave(true)} title="Leave voice">
                <Icon name="phoneOff" />
              </button>
            </div>
          </div>
        )}

        {voice.error && <div className="voice-error">{voice.error}</div>}

        <section className="nt-messages">
          <div className="nt-channel-intro">
            <div className="intro-symbol"><Icon name="hash" size={20} /></div>
            <div>
              <h1>{activeChannel?.name || "general"}</h1>
              <p>Start of the conversation.</p>
            </div>
          </div>

          {messages.map((item, idx) => {
            const own = item.author_id === user.id || item.author === displayName || item.author === user.username;
            const prev = messages[idx - 1];
            const consecutive = prev && prev.author_id === item.author_id && (new Date(item.sent_at) - new Date(prev.sent_at) < 180000);
            const author = item.author || "Unknown";
            const time = new Date(item.sent_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

            return (
              <article className={`nt-message ${consecutive ? "compact" : ""}`} key={item.id}>
                {!consecutive ? (
                  <div className="message-avatar" style={avatarStyle(author)}>{author[0]?.toUpperCase()}</div>
                ) : <div className="message-avatar-spacer" />}
                <div className="message-body">
                  {!consecutive && (
                    <div className="message-meta">
                      <strong>{author}</strong>
                      {own && <span className="you-label">you</span>}
                      <span>{time}</span>
                    </div>
                  )}
                  <p>{item.text}</p>
                </div>
              </article>
            );
          })}
          <div ref={messagesEndRef} />
        </section>

        <div className="nt-composer-wrap">
          <form className="nt-composer" onSubmit={send}>
            <button type="button" className="composer-plus" title="Add"><Icon name="plus" size={19} /></button>
            <input
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              maxLength={4000}
              placeholder={`Message ${activeChannel?.name || "general"}`}
              aria-label="Message"
            />
            <button className={`composer-send ${message.trim() ? "ready" : ""}`} disabled={!message.trim()} title="Send">
              <Icon name="send" size={18} />
            </button>
          </form>
        </div>

        {membersOpen && (
          <>
            <button className="drawer-scrim" aria-label="Close people" onClick={() => setMembersOpen(false)} />
            <aside className="people-drawer">
              <div className="people-head">
                <div>
                  <strong>People</strong>
                  <span>{onlineIds.size} online</span>
                </div>
                <button className="icon-button" onClick={() => setMembersOpen(false)}><Icon name="close" /></button>
              </div>

              <div className="people-list">
                {sortedMembers.map((member) => {
                  const live = online.find((p) => p.id === member.id);
                  const isOnline = onlineIds.has(member.id);
                  return (
                    <div className={`person-row ${isOnline ? "" : "offline"}`} key={member.id}>
                      <div className="person-avatar-wrap">
                        <div className="avatar small" style={avatarStyle(member.display_name || member.username)}>
                          {(member.display_name || member.username || "?")[0].toUpperCase()}
                        </div>
                        <span className={`presence-dot ${isOnline ? "online" : ""}`} />
                      </div>
                      <div className="person-text">
                        <strong>{member.display_name || member.username}{member.id === user.id ? " · you" : ""}</strong>
                        <span>{live?.voice_room ? "In voice" : isOnline ? "Available" : "Offline"}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </aside>
          </>
        )}
      </main>
    </div>
  );
}
