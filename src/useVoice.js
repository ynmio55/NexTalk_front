import { useCallback, useEffect, useRef, useState } from "react";
import { RTC_CONFIG } from "./api";

export function useVoice({ userId, socketRef, online }) {
  const [channel, setChannel] = useState(null);
  const [muted, setMuted] = useState(false);
  const [deafened, setDeafened] = useState(false);
  const [error, setError] = useState("");

  const channelRef = useRef(null);
  const streamRef = useRef(null);
  const peersRef = useRef(new Map());
  const audioRef = useRef(new Map());
  const deafenedRef = useRef(false);

  const sendSignal = useCallback((target, signal) => {
    const ws = socketRef.current;
    if (ws?.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ type: "voice_signal", target, signal }));
    }
  }, [socketRef]);

  const closePeer = useCallback((peerID) => {
    peersRef.current.get(peerID)?.close();
    peersRef.current.delete(peerID);

    const audio = audioRef.current.get(peerID);
    if (audio) {
      audio.srcObject = null;
      audio.remove();
      audioRef.current.delete(peerID);
    }
  }, []);

  const attachRemoteAudio = useCallback((peerID, stream) => {
    let audio = audioRef.current.get(peerID);
    if (!audio) {
      audio = document.createElement("audio");
      audio.autoplay = true;
      audio.playsInline = true;
      audio.dataset.peer = peerID;
      audio.style.display = "none";
      document.body.appendChild(audio);
      audioRef.current.set(peerID, audio);
    }
    audio.srcObject = stream;
    audio.muted = deafenedRef.current;
  }, []);

  const ensurePeer = useCallback(async (peerID, initiator) => {
    if (peersRef.current.has(peerID)) return peersRef.current.get(peerID);

    const pc = new RTCPeerConnection(RTC_CONFIG);
    peersRef.current.set(peerID, pc);

    streamRef.current?.getTracks().forEach((track) => {
      pc.addTrack(track, streamRef.current);
    });

    pc.onicecandidate = (event) => {
      if (event.candidate) sendSignal(peerID, { candidate: event.candidate });
    };

    pc.ontrack = (event) => {
      if (event.streams?.[0]) attachRemoteAudio(peerID, event.streams[0]);
    };

    pc.onconnectionstatechange = () => {
      if (["failed", "closed", "disconnected"].includes(pc.connectionState)) {
        closePeer(peerID);
      }
    };

    if (initiator) {
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      sendSignal(peerID, { description: pc.localDescription });
    }

    return pc;
  }, [attachRemoteAudio, closePeer, sendSignal]);

  const handleSignal = useCallback(async (from, signal) => {
    if (!channelRef.current || !streamRef.current) return;

    try {
      const pc = await ensurePeer(from, false);

      if (signal?.description) {
        await pc.setRemoteDescription(signal.description);

        if (signal.description.type === "offer") {
          const answer = await pc.createAnswer();
          await pc.setLocalDescription(answer);
          sendSignal(from, { description: pc.localDescription });
        }
      } else if (signal?.candidate) {
        await pc.addIceCandidate(signal.candidate);
      }
    } catch (err) {
      console.error("voice signal error", err);
    }
  }, [ensurePeer, sendSignal]);

  const syncPeers = useCallback(async (presence) => {
    const room = channelRef.current?.id;
    if (!room || !streamRef.current) return;

    const wanted = new Set(
      presence
        .filter((p) => p.id !== userId && p.voice_room === room)
        .map((p) => p.id)
    );

    for (const peerID of peersRef.current.keys()) {
      if (!wanted.has(peerID)) closePeer(peerID);
    }

    for (const peerID of wanted) {
      if (!peersRef.current.has(peerID) && userId < peerID) {
        try {
          await ensurePeer(peerID, true);
        } catch (err) {
          console.error("voice peer error", err);
        }
      }
    }
  }, [closePeer, ensurePeer, userId]);

  useEffect(() => {
    syncPeers(online || []);
  }, [online, syncPeers]);

  const join = useCallback(async (nextChannel) => {
    setError("");

    try {
      if (!navigator.mediaDevices?.getUserMedia) {
        throw new Error("Microphone is not available in this browser");
      }

      if (channelRef.current?.id !== nextChannel.id) {
        for (const peerID of [...peersRef.current.keys()]) closePeer(peerID);
        streamRef.current?.getTracks().forEach((track) => track.stop());
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true },
        video: false,
      });

      streamRef.current = stream;
      stream.getAudioTracks().forEach((track) => {
        track.enabled = !muted;
      });

      channelRef.current = nextChannel;
      setChannel(nextChannel);

      const ws = socketRef.current;
      if (ws?.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ type: "voice_join", channel_id: nextChannel.id }));
      }
    } catch (err) {
      setError(err.message || "Unable to access microphone");
    }
  }, [closePeer, muted, socketRef]);

  const leave = useCallback((notify = true) => {
    if (notify && socketRef.current?.readyState === WebSocket.OPEN) {
      socketRef.current.send(JSON.stringify({ type: "voice_leave" }));
    }

    for (const peerID of [...peersRef.current.keys()]) closePeer(peerID);
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    channelRef.current = null;
    setChannel(null);
  }, [closePeer, socketRef]);

  const rejoin = useCallback(() => {
    const current = channelRef.current;
    const ws = socketRef.current;
    if (current && ws?.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ type: "voice_join", channel_id: current.id }));
    }
  }, [socketRef]);

  const toggleMute = useCallback(() => {
    setMuted((old) => {
      const next = !old;
      streamRef.current?.getAudioTracks().forEach((track) => {
        track.enabled = !next;
      });
      return next;
    });
  }, []);

  const toggleDeafen = useCallback(() => {
    setDeafened((old) => {
      const next = !old;
      deafenedRef.current = next;
      for (const audio of audioRef.current.values()) audio.muted = next;
      return next;
    });
  }, []);

  useEffect(() => () => {
    for (const peerID of [...peersRef.current.keys()]) closePeer(peerID);
    streamRef.current?.getTracks().forEach((track) => track.stop());
  }, [closePeer]);

  return {
    channel,
    muted,
    deafened,
    error,
    join,
    leave,
    rejoin,
    toggleMute,
    toggleDeafen,
    handleSignal,
  };
}
