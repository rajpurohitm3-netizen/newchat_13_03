"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import Peer from "simple-peer";
import { Buffer } from "buffer";

if (typeof window !== "undefined") {
  (window as any).Buffer = Buffer;
  (window as any).global = window;
  (window as any).process = {
    env: { DEBUG: undefined },
    version: "",
    nextTick: (fn: any) => setTimeout(fn, 0),
  };
}
import {
  Play, Pause, Volume2, VolumeX, Maximize, Minimize, Upload, Youtube, 
  MessageCircle, Send, X, Copy, Users, Video, Mic, MicOff, Camera, CameraOff,
  PhoneOff, ChevronLeft, Settings, Link2, Film, Clock, SkipBack, SkipForward,
  SwitchCamera, Share2, RefreshCw
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { AvatarDisplay } from "@/components/AvatarDisplay";

interface WatchTogetherProps {
  userId: string;
  friendId: string;
  friendProfile: any;
  myProfile: any;
  onClose: () => void;
}

interface RoomMessage {
  id: string;
  user_id: string;
  message: string;
  created_at: string;
}

type VideoSource = "local" | "youtube";

export function WatchTogether({ userId, friendId, friendProfile, myProfile, onClose }: WatchTogetherProps) {
  const [room, setRoom] = useState<any>(null);
  const [roomCode, setRoomCode] = useState("");
  const [joinCode, setJoinCode] = useState("");
  const [isHost, setIsHost] = useState(false);
  const [videoSource, setVideoSource] = useState<VideoSource>("local");
  const [videoUrl, setVideoUrl] = useState("");
  const [videoName, setVideoName] = useState("");
  const [youtubeUrl, setYoutubeUrl] = useState("");
  const [youtubeVideoId, setYoutubeVideoId] = useState("");
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showChat, setShowChat] = useState(true);
  const [messages, setMessages] = useState<RoomMessage[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [partnerJoined, setPartnerJoined] = useState(false);
  const [showVideoCall, setShowVideoCall] = useState(false);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [isCameraOn, setIsCameraOn] = useState(true);
  const [isMicOn, setIsMicOn] = useState(true);
  const [facingMode, setFacingMode] = useState<"user" | "environment">("user");
  const [loading, setLoading] = useState(false);
    const [view, setView] = useState<"menu" | "room">("menu");
    const [needsLocalFile, setNeedsLocalFile] = useState(false);
    const [isConnectingP2P, setIsConnectingP2P] = useState(false);
    const [remoteMovieStream, setRemoteMovieStream] = useState<MediaStream | null>(null);
    const [isP2PConnected, setIsP2PConnected] = useState(false);
    const [p2pError, setP2PError] = useState<string | null>(null);
    const [isSharingStream, setIsSharingStream] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    const [uploadProgress, setUploadProgress] = useState(0);
  const [wakeLock, setWakeLock] = useState<any>(null);

  const videoRef = useRef<HTMLVideoElement>(null);

  const youtubePlayerRef = useRef<any>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const p2pPeerRef = useRef<Peer.Instance | null>(null);
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const channelRef = useRef<any>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const syncTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isSyncingRef = useRef<boolean>(false);
  const heartbeatIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Handle Wake Lock and Media Session
  useEffect(() => {
    const requestWakeLock = async () => {
      if ('wakeLock' in navigator && isPlaying) {
        try {
          const lock = await (navigator as any).wakeLock.request('screen');
          setWakeLock(lock);
          
          lock.addEventListener('release', () => {
            setWakeLock(null);
          });
        } catch (err) {
          console.error(`${err.name}, ${err.message}`);
        }
      }
    };

    if (isPlaying) {
      requestWakeLock();
    } else {
      if (wakeLock) {
        wakeLock.release();
        setWakeLock(null);
      }
    }

    // Media Session API for Lock Screen Controls & Background Play
    if ('mediaSession' in navigator) {
      navigator.mediaSession.playbackState = isPlaying ? 'playing' : 'paused';
      
      navigator.mediaSession.metadata = new MediaMetadata({
        title: videoName || 'Watch Together',
        artist: 'Chatify',
        album: 'Video Stream',
        artwork: [
          { src: 'https://grainy-gradients.vercel.app/noise.svg', sizes: '512x512', type: 'image/svg+xml' }
        ]
      });

      navigator.mediaSession.setActionHandler('play', handlePlay);
      navigator.mediaSession.setActionHandler('pause', handlePause);
      navigator.mediaSession.setActionHandler('seekbackward', () => handleSeek(Math.max(0, currentTime - 10)));
      navigator.mediaSession.setActionHandler('seekforward', () => handleSeek(Math.min(duration, currentTime + 10)));
      navigator.mediaSession.setActionHandler('seekto', (details) => {
        if (details.seekTime !== undefined) {
          handleSeek(details.seekTime);
        }
      });
    }

    return () => {
      if (wakeLock) wakeLock.release();
    };
  }, [isPlaying, videoName, currentTime, duration]);

  // Handle Visibility API to prevent background pause
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden' && isPlaying) {
        // If we are playing, try to keep playing even in background
        if (videoRef.current) {
          videoRef.current.play().catch(() => {
            // Some browsers block background play without user interaction
            console.log("Background play attempt failed");
          });
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [isPlaying]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Start heartbeat if host
  useEffect(() => {
    if (isHost && view === "room" && channelRef.current) {
      heartbeatIntervalRef.current = setInterval(() => {
        const time = videoSource === "local" 
          ? videoRef.current?.currentTime 
          : youtubePlayerRef.current?.getCurrentTime?.();
        
        if (time !== undefined && time !== null) {
          sendSyncMessage("heartbeat", { 
            time, 
            isPlaying, 
            source: videoSource, 
            url: videoUrl,
            videoName 
          });
        }
      }, 8000); // Less frequent heartbeat to reduce spam
    }
    return () => {
      if (heartbeatIntervalRef.current) clearInterval(heartbeatIntervalRef.current);
    };
  }, [isHost, view, videoSource, isPlaying, videoUrl, videoName]);

  useEffect(() => {
    if (localVideoRef.current && localStream) {
      localVideoRef.current.srcObject = localStream;
    }
  }, [localStream]);

  useEffect(() => {
    if (remoteVideoRef.current && remoteStream) {
      remoteVideoRef.current.srcObject = remoteStream;
    }
  }, [remoteStream]);

  const generateRoomCode = () => {
    return Math.random().toString(36).substring(2, 8).toUpperCase();
  };

  const extractYoutubeId = (url: string) => {
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
    const match = url.match(regExp);
    return match && match[2].length === 11 ? match[2] : null;
  };

  const createRoom = async () => {
    setLoading(true);
    const code = generateRoomCode();
    
    const { data, error } = await supabase.from("watch_rooms").insert({
      host_id: userId,
      guest_id: friendId,
      room_code: code,
      status: "waiting"
    }).select().single();

    if (error) {
      toast.error("Failed to create room");
      setLoading(false);
      return;
    }

    setRoom(data);
    setRoomCode(code);
    setIsHost(true);
    setView("room");
    setupRealtimeSync(data.id);
    setLoading(false);
    toast.success("Room created! Share code with friend");
  };

  const joinRoom = async () => {
    if (!joinCode.trim()) {
      toast.error("Enter room code");
      return;
    }

    setLoading(true);
    const { data, error } = await supabase
      .from("watch_rooms")
      .select("*")
      .eq("room_code", joinCode.toUpperCase())
      .single();

    if (error || !data) {
      toast.error("Room not found");
      setLoading(false);
      return;
    }

    if (data.guest_id && data.guest_id !== userId && data.host_id !== userId) {
      toast.error("Room is full");
      setLoading(false);
      return;
    }

    await supabase.from("watch_rooms").update({
      guest_id: userId,
      status: "active"
    }).eq("id", data.id);

    setRoom(data);
    setRoomCode(joinCode.toUpperCase());
    setIsHost(data.host_id === userId);
    setView("room");
    setPartnerJoined(true);
    setupRealtimeSync(data.id);
    setLoading(false);

    if (data.video_url || data.video_type === "local") {
      if (data.video_type === "youtube") {
        setVideoUrl(data.video_url);
        setVideoSource("youtube");
        setYoutubeVideoId(extractYoutubeId(data.video_url) || "");
      } else if (data.video_type === "local") {
        setVideoSource("local");
        setVideoName(data.video_name || "");
        if (!isHost && !remoteMovieStream) {
          setIsConnectingP2P(true);
        }
      }
    }
  };

  useEffect(() => {
    let timeout: NodeJS.Timeout;
    if (isConnectingP2P && !isP2PConnected) {
      timeout = setTimeout(() => {
        setP2PError("Connection taking longer than expected. Please ensure both users are online.");
      }, 20000);
    }
    return () => clearTimeout(timeout);
  }, [isConnectingP2P, isP2PConnected]);

  const setupP2P = useCallback((isInitiator: boolean) => {
    if (p2pPeerRef.current) {
      p2pPeerRef.current.destroy();
    }
    setP2PError(null);
    setIsP2PConnected(false);

    try {
      const peer = new Peer({
        initiator: isInitiator,
        trickle: true,
        config: {
          iceServers: [
            { urls: "stun:stun.l.google.com:19302" },
            { urls: "stun:stun1.l.google.com:19302" },
            { urls: "stun:stun2.l.google.com:19302" },
            { urls: "stun:stun3.l.google.com:19302" },
            { urls: "stun:stun4.l.google.com:19302" },
            { urls: "turn:openrelay.metered.ca:80", username: "openrelayproject", credential: "openrelayproject" }
          ]
        }
      });

      peer.on("signal", (data) => {
        if (channelRef.current) {
          channelRef.current.send({
            type: "broadcast",
            event: "p2p_signal",
            payload: { signal: data, userId }
          });
        }
      });

      peer.on("connect", () => {
        console.log("P2P Connected");
        setIsP2PConnected(true);
        setP2PError(null);
        // Small delay to ensure data channel is stable before adding stream
        setTimeout(() => {
          if (isHost && videoSource === "local" && videoUrl) {
            shareMovieStream();
          }
        }, 1000);
      });

      peer.on("stream", (stream) => {
        console.log("Received P2P Stream", stream.getTracks().length);
        setRemoteMovieStream(stream);
        setNeedsLocalFile(false);
        setIsConnectingP2P(false);
        setIsP2PConnected(true);
        setP2PError(null);
        
        // Ensure the video element plays the new stream
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play().catch(e => console.log("Stream autoplay error:", e));
        }
      });

      peer.on("error", (err) => {
        console.error("P2P Error:", err);
        setIsP2PConnected(false);
        if (err.code === "ERR_DATA_CHANNEL") {
          setP2PError("Data channel failed. Retrying...");
          setTimeout(() => setupP2P(isInitiator), 3000);
        }
      });

      peer.on("close", () => {
        setIsP2PConnected(false);
      });

      p2pPeerRef.current = peer;
    } catch (e) {
      console.error("Failed to initialize Peer:", e);
      setP2PError("Failed to initialize P2P connection.");
    }
  }, [userId, isHost, videoSource, videoUrl]);

  useEffect(() => {
    const el = videoRef.current;
    if (!el) return;

    if (remoteMovieStream) {
      if (el.srcObject !== remoteMovieStream) {
        el.srcObject = remoteMovieStream;
        el.muted = true; // Required for autoplay in most browsers
        el.play().catch(e => console.log("Autoplay blocked:", e));
      }
    } else if (videoUrl && videoSource === "local") {
      if (el.src !== videoUrl) {
        el.srcObject = null;
        el.src = videoUrl;
      }
    }
  }, [remoteMovieStream, videoUrl, videoSource]);

  const shareMovieStream = useCallback(() => {
    if (!isHost || !videoRef.current || !p2pPeerRef.current || isSharingStream) return;
    
    if (!p2pPeerRef.current.connected) {
      console.log("Peer not connected yet, will retry sharing stream later");
      return;
    }

    try {
      // @ts-expect-error: captureStream is not standard in all browsers
      const stream = videoRef.current.captureStream?.() || videoRef.current.mozCaptureStream?.();
      if (stream && stream.getTracks().length > 0) {
        console.log("Sharing movie stream tracks:", stream.getTracks().length);
        
        // Remove existing streams/tracks first to avoid duplicates
        // @ts-expect-error: simple-peer type missing streams property
        if (p2pPeerRef.current.streams) {
          // @ts-expect-error: simple-peer type missing streams property
          p2pPeerRef.current.streams.forEach(s => {
            try {
              // @ts-expect-error: simple-peer type missing removeStream method
              p2pPeerRef.current.removeStream(s);
            } catch (e) {}
          });
        }
        
        p2pPeerRef.current.addStream(stream);
        setIsSharingStream(true);
        toast.info("Streaming movie to friend...");
        setIsConnectingP2P(false);
      } else {
        // If metadata not loaded yet, wait for it
        if (videoRef.current.readyState < 2) {
          videoRef.current.addEventListener("loadedmetadata", () => shareMovieStream(), { once: true });
        } else {
          console.error("No tracks in stream or captureStream failed");
        }
      }
    } catch (e) {
      console.error("Failed to capture stream:", e);
    }
  }, [isHost, isSharingStream]);

  const setupRealtimeSync = (roomId: string) => {
    const channel = supabase.channel(`watch_room_${roomId}`)
      .on("broadcast", { event: "p2p_signal" }, ({ payload }) => {
        if (payload.userId === userId) return;
        if (p2pPeerRef.current && !p2pPeerRef.current.destroyed) {
          p2pPeerRef.current.signal(payload.signal);
        }
      })
      .on("broadcast", { event: "sync" }, ({ payload }) => {
        if (payload.userId === userId) return;
        
        const applySync = (type: string, time?: number, playing?: boolean) => {
          isSyncingRef.current = true;
          
          if (type === "play") {
            setIsPlaying(true);
            if (videoRef.current) {
              videoRef.current.play().catch(e => console.log("Play error:", e));
            }
            if (youtubePlayerRef.current?.playVideo) youtubePlayerRef.current.playVideo();
          } else if (type === "pause") {
            setIsPlaying(false);
            if (videoRef.current) videoRef.current.pause();
            if (youtubePlayerRef.current?.pauseVideo) youtubePlayerRef.current.pauseVideo();
          }
          
          if (time !== undefined) {
            const current = videoSource === "local" 
              ? videoRef.current?.currentTime 
              : youtubePlayerRef.current?.getCurrentTime?.();
            
            if (current === undefined || Math.abs(current - time) > 2.5) { // Increased threshold for drift
              setCurrentTime(time);
              if (videoRef.current) videoRef.current.currentTime = time;
              if (youtubePlayerRef.current?.seekTo) youtubePlayerRef.current.seekTo(time, true);
            }
          }

          setTimeout(() => {
            isSyncingRef.current = false;
          }, 800);
        };

        if (payload.type === "play") {
          applySync("play", payload.time);
        } else if (payload.type === "pause") {
          applySync("pause", payload.time);
        } else if (payload.type === "seek") {
          applySync("", payload.time);
          } else if (payload.type === "heartbeat") {
            if (payload.source !== videoSource || (payload.source === "local" && payload.url && payload.url !== videoUrl)) {
              setVideoSource(payload.source);
              if (payload.source === "youtube") {
                setVideoUrl(payload.url || "");
                setYoutubeVideoId(extractYoutubeId(payload.url || "") || "");
              } else {
                setVideoName(payload.videoName || "");
                if (payload.url) {
                  setVideoUrl(payload.url);
                  setNeedsLocalFile(false);
                  setIsConnectingP2P(false);
                } else if (!isHost && !remoteMovieStream) {
                  setIsConnectingP2P(true);
                }
              }
            }
            applySync(payload.isPlaying ? "play" : "pause", payload.time);
          } else if (payload.type === "request_sync") {
            if (isHost) {
              const time = videoSource === "local" 
                ? videoRef.current?.currentTime 
                : youtubePlayerRef.current?.getCurrentTime?.();
              sendSyncMessage("heartbeat", { 
                time, 
                isPlaying, 
                source: videoSource, 
                url: videoUrl,
                videoName: videoName
              });
              if (videoSource === "local" && !videoUrl) {
                 shareMovieStream();
              }
            }
            } else if (payload.type === "video_change") {
              setVideoSource(payload.source);
              if (payload.source === "youtube") {
                setVideoUrl(payload.url);
                setYoutubeVideoId(extractYoutubeId(payload.url) || "");
                setNeedsLocalFile(false);
                setIsConnectingP2P(false);
              } else if (payload.source === "local") {
                setVideoName(payload.videoName || "");
                setVideoUrl(payload.url || "");
                
                if (!isHost) {
                  if (payload.url) {
                    // Automatic cloud sync
                    setNeedsLocalFile(false);
                    setIsConnectingP2P(false);
                    toast.success("Syncing video from cloud...");
                  } else {
                    // Fallback to local file or P2P
                    setNeedsLocalFile(true);
                    if (remoteMovieStream) {
                      setIsConnectingP2P(false);
                    } else {
                      setIsConnectingP2P(true);
                      setupP2P(false);
                    }
                  }
                }
              }

        } else if (payload.type === "partner_joined") {
          setPartnerJoined(true);
          toast.success(`${friendProfile.username} joined!`);
          if (isHost) {
            setupP2P(true);
            const time = videoSource === "local" 
              ? videoRef.current?.currentTime 
              : youtubePlayerRef.current?.getCurrentTime?.();
            sendSyncMessage("heartbeat", { 
              time, 
              isPlaying, 
              source: videoSource, 
              url: videoUrl,
              videoName: videoName 
            });
            
            if (videoSource === "local" && videoUrl) {
              setTimeout(() => shareMovieStream(), 3000);
            }
          } else {
            setupP2P(false);
          }
        }
      })
      .on("postgres_changes", {
        event: "INSERT",
        schema: "public",
        table: "watch_room_messages",
        filter: `room_id=eq.${roomId}`
      }, (payload) => {
        setMessages(prev => [...prev, payload.new as RoomMessage]);
      })
      .subscribe();

    channelRef.current = channel;

    if (!isHost) {
      channel.send({
        type: "broadcast",
        event: "sync",
        payload: { type: "partner_joined", userId }
      });
    }

    fetchMessages(roomId);
  };

  const fetchMessages = async (roomId: string) => {
    const { data } = await supabase
      .from("watch_room_messages")
      .select("*")
      .eq("room_id", roomId)
      .order("created_at", { ascending: true });
    
    if (data) setMessages(data);
  };

  const sendSyncMessage = (type: string, data: any = {}) => {
    if (channelRef.current) {
      channelRef.current.send({
        type: "broadcast",
        event: "sync",
        payload: { type, userId, ...data }
      });
    }
  };

  const handlePlay = () => {
    if (isSyncingRef.current) return;
    setIsPlaying(true);
    if (videoRef.current) {
      videoRef.current.play().catch(e => console.log("Play failed:", e));
    }
    if (youtubePlayerRef.current?.playVideo) youtubePlayerRef.current.playVideo();
    
    const time = videoSource === "local" 
      ? videoRef.current?.currentTime 
      : youtubePlayerRef.current?.getCurrentTime?.();
    sendSyncMessage("play", { time });
  };

  const handlePause = () => {
    if (isSyncingRef.current) return;
    setIsPlaying(false);
    if (videoRef.current) videoRef.current.pause();
    if (youtubePlayerRef.current?.pauseVideo) youtubePlayerRef.current.pauseVideo();
    
    const time = videoSource === "local" 
      ? videoRef.current?.currentTime 
      : youtubePlayerRef.current?.getCurrentTime?.();
    sendSyncMessage("pause", { time });
  };

  const handleSeek = (time: number) => {
    if (isSyncingRef.current) return;
    setCurrentTime(time);
    if (videoRef.current) {
      videoRef.current.currentTime = time;
    }
    if (youtubePlayerRef.current?.seekTo) {
      youtubePlayerRef.current.seekTo(time, true);
    }
    
    if (syncTimeoutRef.current) {
      clearTimeout(syncTimeoutRef.current);
    }
    syncTimeoutRef.current = setTimeout(() => {
      sendSyncMessage("seek", { time });
    }, 200);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (isHost) {
      setIsUploading(true);
      setUploadProgress(0);
      toast.info("Uploading movie to cloud for sync...");

      try {
        const fileExt = file.name.split(".").pop();
        const fileName = `${Math.random().toString(36).substring(2)}-${Date.now()}.${fileExt}`;
        const filePath = `${room.id}/${fileName}`;

        const { data, error } = await supabase.storage
          .from("watch-movies")
          .upload(filePath, file, {
            cacheControl: "3600",
            upsert: false
          });

        if (error) throw error;

        const { data: { publicUrl } } = supabase.storage
          .from("watch-movies")
          .getPublicUrl(filePath);

        setVideoUrl(publicUrl);
        setVideoName(file.name);
        setVideoSource("local");
        setYoutubeVideoId("");
        
        await supabase.from("watch_rooms").update({
          video_url: publicUrl,
          video_type: "local",
          video_name: file.name
        }).eq("id", room.id);

        sendSyncMessage("video_change", { url: publicUrl, source: "local", videoName: file.name });
        toast.success("Movie uploaded and synced!");
      } catch (err: any) {
        console.error("Upload error:", err);
        toast.error("Upload failed. Switching to P2P streaming.");
        // Fallback to local URL and P2P
        const url = URL.createObjectURL(file);
        setVideoUrl(url);
        setVideoName(file.name);
        setVideoSource("local");
        sendSyncMessage("video_change", { url: "", source: "local", videoName: file.name });
        if (partnerJoined) setTimeout(() => shareMovieStream(), 1000);
      } finally {
        setIsUploading(false);
      }
    } else {
      // Guest manually picking the same file
      const url = URL.createObjectURL(file);
      setVideoUrl(url);
      setVideoName(file.name);
      setVideoSource("local");
      setYoutubeVideoId("");
      setNeedsLocalFile(false);
      setIsConnectingP2P(false);
      toast.success("Local file selected! High quality sync enabled.");
    }
  };

  const handleYoutubeSubmit = () => {
    const videoId = extractYoutubeId(youtubeUrl);
    if (!videoId) {
      toast.error("Invalid YouTube URL");
      return;
    }

    setYoutubeVideoId(videoId);
    setVideoSource("youtube");
    setVideoUrl(youtubeUrl);

    supabase.from("watch_rooms").update({
      video_url: youtubeUrl,
      video_type: "youtube"
    }).eq("id", room.id);

    sendSyncMessage("video_change", { url: youtubeUrl, source: "youtube" });
    toast.success("YouTube video loaded!");
  };

  const sendChatMessage = async () => {
    if (!newMessage.trim() || !room) return;

    await supabase.from("watch_room_messages").insert({
      room_id: room.id,
      user_id: userId,
      message: newMessage.trim()
    });

    setNewMessage("");
  };

  const copyRoomCode = () => {
    navigator.clipboard.writeText(roomCode);
    toast.success("Room code copied!");
  };

  const toggleFullscreen = () => {
    if (!containerRef.current) return;
    
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  const startVideoCall = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user" },
        audio: true
      });
      setLocalStream(stream);
      setShowVideoCall(true);
      
      const pc = new RTCPeerConnection({
        iceServers: [
          { urls: "stun:stun.l.google.com:19302" },
          { urls: "turn:openrelay.metered.ca:80", username: "openrelayproject", credential: "openrelayproject" }
        ]
      });

      stream.getTracks().forEach(track => pc.addTrack(track, stream));

        pc.ontrack = (event) => {
          setRemoteStream(prev => {
            const stream = prev || new MediaStream();
            if (!stream.getTracks().find(t => t.id === event.track.id)) {
              stream.addTrack(event.track);
            }
            return new MediaStream(stream.getTracks());
          });
        };

      pc.onicecandidate = (event) => {
        if (event.candidate && channelRef.current) {
          channelRef.current.send({
            type: "broadcast",
            event: "webrtc",
            payload: { type: "candidate", candidate: event.candidate.toJSON(), userId }
          });
        }
      };

      peerConnectionRef.current = pc;

      channelRef.current?.on("broadcast", { event: "webrtc" }, async ({ payload }: any) => {
        if (payload.userId === userId) return;
        
        if (payload.type === "offer" && pc.signalingState === "stable") {
          await pc.setRemoteDescription(new RTCSessionDescription(payload.sdp));
          const answer = await pc.createAnswer();
          await pc.setLocalDescription(answer);
          channelRef.current?.send({
            type: "broadcast",
            event: "webrtc",
            payload: { type: "answer", sdp: pc.localDescription, userId }
          });
        } else if (payload.type === "answer" && pc.signalingState === "have-local-offer") {
          await pc.setRemoteDescription(new RTCSessionDescription(payload.sdp));
        } else if (payload.type === "candidate" && payload.candidate) {
          try {
            await pc.addIceCandidate(new RTCIceCandidate(payload.candidate));
          } catch (e) {}
        }
      });

      if (isHost) {
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        channelRef.current?.send({
          type: "broadcast",
          event: "webrtc",
          payload: { type: "offer", sdp: pc.localDescription, userId }
        });
      }
    } catch (err) {
      toast.error("Camera access denied");
    }
  };

  const endVideoCall = () => {
    localStream?.getTracks().forEach(t => t.stop());
    peerConnectionRef.current?.close();
    setLocalStream(null);
    setRemoteStream(null);
    setShowVideoCall(false);
  };

  const toggleCamera = () => {
    if (localStream) {
      const videoTrack = localStream.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        setIsCameraOn(videoTrack.enabled);
      }
    }
  };

  const toggleMic = () => {
    if (localStream) {
      const audioTrack = localStream.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setIsMicOn(audioTrack.enabled);
      }
    }
  };

  const flipCamera = async () => {
    if (!localStream) return;
    const newMode = facingMode === "user" ? "environment" : "user";
    setFacingMode(newMode);
    
    try {
      localStream.getVideoTracks().forEach(t => t.stop());
      const newStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: newMode },
        audio: false
      });
      const newVideoTrack = newStream.getVideoTracks()[0];
      
      if (peerConnectionRef.current) {
        const sender = peerConnectionRef.current.getSenders().find(s => s.track?.kind === "video");
        if (sender) await sender.replaceTrack(newVideoTrack);
      }
      
      const audioTrack = localStream.getAudioTracks()[0];
      const updatedStream = new MediaStream([newVideoTrack, audioTrack]);
      setLocalStream(updatedStream);
    } catch (e) {
      toast.error("Could not switch camera");
    }
  };

  const leaveRoom = async () => {
    if (room) {
      if (isHost) {
        await supabase.from("watch_rooms").delete().eq("id", room.id);
      } else {
        await supabase.from("watch_rooms").update({ guest_id: null, status: "waiting" }).eq("id", room.id);
      }
    }
    channelRef.current?.unsubscribe();
    endVideoCall();
    onClose();
  };

  const formatTime = (time: number) => {
    if (isNaN(time)) return "0:00";
    const mins = Math.floor(time / 60);
    const secs = Math.floor(time % 60);
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  useEffect(() => {
    return () => {
      channelRef.current?.unsubscribe();
      localStream?.getTracks().forEach(t => t.stop());
      peerConnectionRef.current?.close();
      if (p2pPeerRef.current) p2pPeerRef.current.destroy();
    };
  }, []);

  useEffect(() => {
    if (videoSource === "youtube" && youtubeVideoId) {
      if (youtubePlayerRef.current) {
        if (youtubePlayerRef.current.loadVideoById) {
          youtubePlayerRef.current.loadVideoById(youtubeVideoId);
        }
        return;
      }

      const tag = document.createElement("script");
      tag.src = "https://www.youtube.com/iframe_api";
      const firstScriptTag = document.getElementsByTagName("script")[0];
      firstScriptTag.parentNode?.insertBefore(tag, firstScriptTag);

      const initPlayer = () => {
        youtubePlayerRef.current = new (window as any).YT.Player("youtube-player", {
          videoId: youtubeVideoId,
          playerVars: {
            autoplay: 0,
            controls: 0,
            modestbranding: 1,
            rel: 0,
            disablekb: 1,
            iv_load_policy: 3
          },
          events: {
            onReady: (event: any) => {
              setDuration(event.target.getDuration());
              if (!isHost) {
                sendSyncMessage("request_sync");
              }
            },
            onStateChange: (event: any) => {
              if (isSyncingRef.current) return;
              
              const time = event.target.getCurrentTime();
              if (event.data === (window as any).YT.PlayerState.PLAYING) {
                setIsPlaying(true);
                sendSyncMessage("play", { time });
              } else if (event.data === (window as any).YT.PlayerState.PAUSED) {
                setIsPlaying(false);
                sendSyncMessage("pause", { time });
              }
            }
          }
        });
      };

      if ((window as any).YT && (window as any).YT.Player) {
        initPlayer();
      } else {
        (window as any).onYouTubeIframeAPIReady = initPlayer;
      }

      const interval = setInterval(() => {
        if (youtubePlayerRef.current?.getCurrentTime) {
          const time = youtubePlayerRef.current.getCurrentTime();
          setCurrentTime(time);
          if (youtubePlayerRef.current.getDuration) {
            setDuration(youtubePlayerRef.current.getDuration());
          }
        }
      }, 1000);

      return () => clearInterval(interval);
    }
  }, [youtubeVideoId, videoSource]);

  if (view === "menu") {
    return (
      <div className="h-full flex flex-col bg-[#030303]">
        <div className="p-6 border-b border-white/5 flex items-center gap-4">
          <Button variant="ghost" onClick={onClose} className="text-white/40 hover:text-white">
            <ChevronLeft className="w-5 h-5 mr-2" /> Back
          </Button>
          <h2 className="text-xl font-black uppercase italic">Watch Together</h2>
        </div>

        <div className="flex-1 flex flex-col items-center justify-center p-8 gap-8">
          <div className="flex items-center gap-6 mb-8">
            <AvatarDisplay profile={myProfile} className="w-20 h-20" />
            <div className="flex flex-col items-center">
              <Film className="w-8 h-8 text-indigo-500 mb-2" />
              <span className="text-[10px] font-black uppercase tracking-widest text-white/30">Watch</span>
            </div>
            <AvatarDisplay profile={friendProfile} className="w-20 h-20" />
          </div>

          <div className="w-full max-w-md space-y-6">
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={createRoom}
              disabled={loading}
              className="w-full p-8 bg-gradient-to-br from-indigo-600 to-purple-600 rounded-3xl flex flex-col items-center gap-4 hover:from-indigo-500 hover:to-purple-500 transition-all disabled:opacity-50"
            >
              <Video className="w-12 h-12" />
              <span className="text-lg font-black uppercase">Create Room</span>
              <span className="text-xs text-white/60">Start a watch party</span>
            </motion.button>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-white/10" />
              </div>
              <div className="relative flex justify-center">
                <span className="bg-[#030303] px-4 text-[10px] font-black uppercase tracking-widest text-white/30">Or</span>
              </div>
            </div>

            <div className="p-6 bg-white/[0.02] border border-white/5 rounded-3xl space-y-4">
              <h3 className="font-black uppercase text-sm text-center">Join Room</h3>
              <input
                type="text"
                placeholder="Enter Room Code"
                value={joinCode}
                onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                className="w-full bg-black/30 border border-white/10 rounded-xl py-4 px-5 text-center text-2xl font-black uppercase tracking-[0.3em] outline-none focus:border-indigo-500/50"
                maxLength={6}
              />
              <Button
                onClick={joinRoom}
                disabled={loading || !joinCode.trim()}
                className="w-full bg-emerald-600 hover:bg-emerald-700 py-6 text-sm font-black uppercase"
              >
                Join Room
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div ref={containerRef} className="h-full flex flex-col bg-black relative">
      <div className="absolute top-0 left-0 right-0 z-30 bg-gradient-to-b from-black/80 to-transparent p-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={leaveRoom} size="icon" className="text-white/60 hover:text-white">
            <X className="w-5 h-5" />
          </Button>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 px-3 py-1.5 bg-white/10 rounded-lg">
              <Link2 className="w-4 h-4 text-indigo-400" />
              <span className="font-bold text-sm">{roomCode}</span>
              <Button variant="ghost" size="icon" onClick={copyRoomCode} className="h-6 w-6 text-white/40 hover:text-white">
                <Copy className="w-3 h-3" />
              </Button>
            </div>
            {partnerJoined ? (
              <div className="flex items-center gap-2 px-3 py-1.5 bg-emerald-500/20 rounded-lg">
                <Users className="w-4 h-4 text-emerald-400" />
                <span className="text-[10px] font-bold text-emerald-400 uppercase">Connected</span>
              </div>
            ) : (
              <div className="flex items-center gap-2 px-3 py-1.5 bg-amber-500/20 rounded-lg">
                <Clock className="w-4 h-4 text-amber-400 animate-pulse" />
                <span className="text-[10px] font-bold text-amber-400 uppercase">Waiting...</span>
              </div>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setShowChat(!showChat)}
            className={`text-white/60 hover:text-white ${showChat ? "bg-white/10" : ""}`}
          >
            <MessageCircle className="w-5 h-5" />
          </Button>
          <Button
              variant="ghost"
              size="icon"
              onClick={showVideoCall ? endVideoCall : startVideoCall}
              className={`text-white/60 hover:text-white ${showVideoCall ? "bg-indigo-500/20 text-indigo-400 animate-pulse" : ""}`}
            >
              <Video className="w-5 h-5" />
            </Button>
          <Button variant="ghost" size="icon" onClick={toggleFullscreen} className="text-white/60 hover:text-white">
            {isFullscreen ? <Minimize className="w-5 h-5" /> : <Maximize className="w-5 h-5" />}
          </Button>
        </div>
      </div>

        <div className="flex-1 flex relative overflow-hidden">
            <div className={`flex-1 flex flex-col transition-all duration-500 ${showChat ? "pr-80" : ""} ${showVideoCall ? "lg:pl-80" : ""}`}>
                {isConnectingP2P ? (
                <div className="flex-1 flex flex-col items-center justify-center gap-8 p-8 text-center relative overflow-hidden">
                  <div className="absolute inset-0 bg-gradient-to-br from-indigo-900/20 via-transparent to-purple-900/20 pointer-events-none" />
                  
                  <motion.div 
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="relative z-10"
                  >
                    <div className="absolute -inset-20 bg-indigo-500/10 blur-[120px] animate-pulse rounded-full" />
                    <div className="p-12 bg-white/[0.03] border border-white/10 rounded-[4rem] backdrop-blur-3xl relative overflow-hidden group">
                      <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/5 to-purple-500/5" />
                      
                      <div className="relative mb-10">
                        <motion.div
                          animate={{ 
                            rotate: 360,
                            scale: [1, 1.05, 1],
                            borderColor: ["rgba(99, 102, 241, 0.2)", "rgba(99, 102, 241, 0.8)", "rgba(99, 102, 241, 0.2)"]
                          }}
                          transition={{ 
                            rotate: { duration: 8, repeat: Infinity, ease: "linear" },
                            scale: { duration: 2, repeat: Infinity, ease: "easeInOut" },
                            borderColor: { duration: 2, repeat: Infinity, ease: "easeInOut" }
                          }}
                          className="w-32 h-32 border-2 border-dashed rounded-full mx-auto flex items-center justify-center"
                        >
                          <div className="w-24 h-24 border-t-2 border-indigo-500 rounded-full animate-spin" />
                        </motion.div>
                        <Film className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-10 h-10 text-indigo-400" />
                      </div>

                      <div className="space-y-4">
                        <h3 className="text-3xl font-black uppercase italic tracking-tighter text-white">
                          Establishing <span className="text-indigo-500">Uplink</span>
                        </h3>
                        <div className="flex flex-col items-center gap-2">
                          <p className="text-white/40 font-bold text-[10px] uppercase tracking-[0.4em]">
                            {p2pError ? "Signal Interrupted" : "Synchronizing Stream Buffer..."}
                          </p>
                          {p2pError && (
                            <motion.p 
                              initial={{ opacity: 0 }}
                              animate={{ opacity: 1 }}
                              className="text-red-400 text-[10px] font-black uppercase tracking-wider max-w-xs mx-auto"
                            >
                              {p2pError}
                            </motion.p>
                          )}
                        </div>
                      </div>

                      <div className="mt-10 pt-8 border-t border-white/5 flex flex-col gap-4">
                        <Button
                          onClick={() => setupP2P(false)}
                          variant="ghost"
                          className="text-[10px] font-black uppercase tracking-[0.3em] text-indigo-400 hover:text-white flex items-center gap-2 mx-auto"
                        >
                          <RefreshCw className="w-3 h-3" />
                          Retry Connection
                        </Button>
                      </div>
                    </div>
                  </motion.div>

                  <div className="z-10 mt-12 space-y-6 w-full max-w-xs">
                    <div className="relative">
                      <div className="absolute inset-0 flex items-center">
                        <div className="w-full border-t border-white/5" />
                      </div>
                      <div className="relative flex justify-center">
                        <span className="bg-black px-4 text-[9px] font-black uppercase tracking-[0.4em] text-white/20">Alternative</span>
                      </div>
                    </div>

                    <Button
                      variant="outline"
                      onClick={() => fileInputRef.current?.click()}
                      className="w-full border-white/5 hover:bg-white/5 hover:border-white/20 text-[10px] font-black uppercase tracking-[0.3em] py-7 rounded-2xl transition-all"
                    >
                      Use Local File
                    </Button>
                  </div>

                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="video/*"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                </div>
              ) : needsLocalFile ? (
                <div className="flex-1 flex flex-col items-center justify-center gap-8 p-8 text-center">
                  <div className="p-8 bg-indigo-500/10 border border-indigo-500/20 rounded-[3rem] backdrop-blur-3xl relative">
                    <div className="absolute inset-0 bg-indigo-500/10 blur-3xl rounded-full" />
                    <Film className="w-16 h-16 text-indigo-500 relative mx-auto mb-6" />
                    <h3 className="text-2xl font-black uppercase italic mb-2">Host is watching a local file</h3>
                    <p className="text-white/60 font-medium mb-8 max-w-md">
                      To sync with better quality, you can select the same file: <br />
                      <span className="text-indigo-400 font-bold mt-2 block">{videoName}</span>
                    </p>
                    <div className="flex flex-col gap-4">
                      <Button
                        onClick={() => fileInputRef.current?.click()}
                        className="bg-indigo-600 hover:bg-indigo-700 py-6 px-10 text-sm font-black uppercase rounded-2xl"
                      >
                        Select File
                      </Button>
                      <Button
                        variant="ghost"
                        onClick={() => setNeedsLocalFile(false)}
                        className="text-[10px] font-black uppercase tracking-widest text-white/30 hover:text-white"
                      >
                        Wait for Stream
                      </Button>
                    </div>
                  </div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="video/*"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                </div>
              ) : !videoUrl && !youtubeVideoId && !remoteMovieStream ? (
            <div className="flex-1 flex flex-col items-center justify-center gap-8 p-8">
              <Film className="w-24 h-24 text-white/10" />
                <h3 className="text-2xl font-black uppercase">Select Video</h3>
                
                {isUploading ? (
                  <div className="flex flex-col items-center gap-6 p-12 bg-white/5 border border-white/10 rounded-3xl w-full max-w-md">
                    <div className="relative">
                      <div className="w-20 h-20 border-4 border-indigo-500/20 rounded-full animate-pulse" />
                      <div className="absolute inset-0 border-t-4 border-indigo-500 rounded-full animate-spin" />
                    </div>
                    <div className="text-center space-y-2">
                      <p className="font-black uppercase italic text-lg">Uploading Movie</p>
                      <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-white/30 animate-pulse">Syncing with cloud matrix...</p>
                    </div>
                  </div>
                ) : (
                  <div className="flex gap-4">
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => fileInputRef.current?.click()}
                      className="p-8 bg-white/5 border border-white/10 rounded-3xl flex flex-col items-center gap-4 hover:bg-white/10 transition-all"
                    >
                      <Upload className="w-12 h-12 text-indigo-400" />
                      <span className="font-bold uppercase text-sm">Upload File</span>
                    </motion.button>

                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => setVideoSource("youtube")}
                      className="p-8 bg-white/5 border border-white/10 rounded-3xl flex flex-col items-center gap-4 hover:bg-white/10 transition-all"
                    >
                      <Youtube className="w-12 h-12 text-red-500" />
                      <span className="font-bold uppercase text-sm">YouTube</span>
                    </motion.button>
                  </div>
                )}

              <input
                ref={fileInputRef}
                type="file"
                accept="video/*"
                onChange={handleFileUpload}
                className="hidden"
              />

              {videoSource === "youtube" && !youtubeVideoId && (
                <div className="w-full max-w-lg mt-4">
                  <div className="flex gap-3">
                    <input
                      type="text"
                      placeholder="Paste YouTube URL..."
                      value={youtubeUrl}
                      onChange={(e) => setYoutubeUrl(e.target.value)}
                      className="flex-1 bg-white/5 border border-white/10 rounded-xl py-4 px-5 outline-none focus:border-red-500/50"
                    />
                    <Button onClick={handleYoutubeSubmit} className="bg-red-600 hover:bg-red-700 px-6">
                      Load
                    </Button>
                  </div>
                </div>
              )}
            </div>
            ) : (
              <div className="flex-1 relative">
                  {videoSource === "local" && (videoUrl || remoteMovieStream) && (
                      <video
                        ref={videoRef}
                        autoPlay={!!remoteMovieStream}
                        playsInline
                        muted={!!remoteMovieStream} // Mute by default for remote streams to allow autoplay
                        className="w-full h-full object-contain bg-black"
                        onTimeUpdate={(e) => {
                          if (!remoteMovieStream && !isSyncingRef.current) {
                            setCurrentTime(e.currentTarget.currentTime);
                          }
                        }}
                        onLoadedMetadata={(e) => {
                          if (!remoteMovieStream) {
                            setDuration(e.currentTarget.duration);
                          }
                        }}
                          onPlay={() => {
                            if (!isSyncingRef.current) {
                              setIsPlaying(true);
                              sendSyncMessage("play", { time: videoRef.current?.currentTime });
                            }
                          }}
                          onPause={() => {
                            if (!isSyncingRef.current) {
                              setIsPlaying(false);
                              sendSyncMessage("pause", { time: videoRef.current?.currentTime });
                            }
                          }}
                      />
                  )}

              {videoSource === "youtube" && youtubeVideoId && (
                <div className="w-full h-full flex items-center justify-center bg-black">
                  <div id="youtube-player" className="w-full h-full" />
                </div>
              )}

                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/90 to-transparent p-6 space-y-4">
                  <div className="w-full h-1.5 bg-white/20 rounded-full overflow-hidden cursor-pointer group" onClick={(e) => {
                    const rect = e.currentTarget.getBoundingClientRect();
                    const x = e.clientX - rect.left;
                    const percent = x / rect.width;
                    handleSeek(percent * duration);
                  }}>
                    <div 
                      className="h-full bg-indigo-500 rounded-full transition-all group-hover:bg-indigo-400"
                      style={{ width: `${(currentTime / duration) * 100}%` }}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleSeek(Math.max(0, currentTime - 10))}
                        className="text-white/60 hover:text-white"
                      >
                        <SkipBack className="w-5 h-5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={isPlaying ? handlePause : handlePlay}
                        className="h-14 w-14 bg-white/10 text-white hover:bg-white/20 rounded-2xl"
                      >
                        {isPlaying ? <Pause className="w-6 h-6" /> : <Play className="w-6 h-6 ml-0.5" />}
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleSeek(Math.min(duration, currentTime + 10))}
                        className="text-white/60 hover:text-white"
                      >
                        <SkipForward className="w-5 h-5" />
                      </Button>
                      <span className="text-sm font-mono text-white/60">
                        {formatTime(currentTime)} / {formatTime(duration)}
                      </span>
                    </div>

                  <div className="flex items-center gap-4">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => {
                        if (videoRef.current) {
                          videoRef.current.muted = !videoRef.current.muted;
                          setIsMuted(videoRef.current.muted);
                        }
                        if (youtubePlayerRef.current) {
                          if (youtubePlayerRef.current.isMuted()) {
                            youtubePlayerRef.current.unMute();
                            setIsMuted(false);
                          } else {
                            youtubePlayerRef.current.mute();
                            setIsMuted(true);
                          }
                        }
                      }}
                      className="text-white/60 hover:text-white"
                    >
                      {isMuted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
                    </Button>
                    <input
                      type="range"
                      min="0"
                      max="1"
                      step="0.1"
                      value={volume}
                      onChange={(e) => {
                        const vol = parseFloat(e.target.value);
                        setVolume(vol);
                        if (videoRef.current) videoRef.current.volume = vol;
                        if (youtubePlayerRef.current?.setVolume) youtubePlayerRef.current.setVolume(vol * 100);
                      }}
                      className="w-24 accent-indigo-500"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        <AnimatePresence>
          {showChat && (
            <motion.div
              initial={{ x: 320, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: 320, opacity: 0 }}
              className="absolute top-0 right-0 bottom-0 w-80 bg-[#0a0a0a] border-l border-white/5 flex flex-col z-20"
            >
              <div className="p-4 border-b border-white/5">
                <h3 className="font-black uppercase text-sm">Chat</h3>
              </div>

              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {messages.map((msg) => (
                  <div key={msg.id} className={`flex gap-3 ${msg.user_id === userId ? "flex-row-reverse" : ""}`}>
                    <AvatarDisplay 
                      profile={msg.user_id === userId ? myProfile : friendProfile} 
                      className="w-8 h-8 shrink-0" 
                    />
                    <div className={`max-w-[70%] px-4 py-2 rounded-2xl ${
                      msg.user_id === userId 
                        ? "bg-indigo-600 rounded-tr-sm" 
                        : "bg-white/10 rounded-tl-sm"
                    }`}>
                      <p className="text-sm">{msg.message}</p>
                    </div>
                  </div>
                ))}
                <div ref={chatEndRef} />
              </div>

              <div className="p-4 border-t border-white/5">
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Type a message..."
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && sendChatMessage()}
                    className="flex-1 bg-white/5 border border-white/10 rounded-xl py-3 px-4 text-sm outline-none focus:border-indigo-500/50"
                  />
                  <Button onClick={sendChatMessage} size="icon" className="bg-indigo-600 hover:bg-indigo-700 rounded-xl">
                    <Send className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

          <AnimatePresence>
            {showVideoCall && (
              <motion.div
                initial={{ x: -320, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                exit={{ x: -320, opacity: 0 }}
                className="absolute top-0 left-0 bottom-0 w-80 bg-black border-r border-white/5 flex flex-col z-40"
              >
                <div className="p-4 border-b border-white/5 flex items-center justify-between">
                  <h3 className="text-xs font-black uppercase tracking-widest text-indigo-400">Signal Relay</h3>
                  <Button variant="ghost" size="icon" onClick={endVideoCall} className="h-8 w-8 text-white/20 hover:text-white">
                    <X className="w-4 h-4" />
                  </Button>
                </div>

                <div className="flex-1 flex flex-col p-4 gap-4 overflow-y-auto custom-scrollbar">
                  {/* Remote Video (Face to Face) */}
                  <div className="relative aspect-[3/4] bg-zinc-900 rounded-3xl overflow-hidden border border-white/5 group">
                    {remoteStream ? (
                      <video
                        ref={remoteVideoRef}
                        autoPlay
                        playsInline
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex flex-col items-center justify-center gap-4">
                        <div className="relative">
                          <div className="absolute inset-0 bg-indigo-500/20 blur-2xl animate-pulse rounded-full" />
                          <AvatarDisplay profile={friendProfile} className="w-20 h-20 relative" />
                        </div>
                        <p className="text-[10px] font-black uppercase tracking-widest text-white/20">Waiting for Signal...</p>
                      </div>
                    )}
                    <div className="absolute bottom-4 left-4">
                      <p className="text-[10px] font-black uppercase tracking-widest bg-black/60 backdrop-blur-md px-3 py-1 rounded-full border border-white/10">
                        {friendProfile.username}
                      </p>
                    </div>
                  </div>

                  {/* Local Video */}
                  <div className="relative aspect-[3/4] bg-zinc-900 rounded-3xl overflow-hidden border border-white/5">
                    {localStream ? (
                      <video
                        ref={localVideoRef}
                        autoPlay
                        playsInline
                        muted
                        className="w-full h-full object-cover"
                        style={{ transform: facingMode === "user" ? "scaleX(-1)" : "none" }}
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-zinc-800">
                         <AvatarDisplay profile={myProfile} className="w-16 h-16 opacity-20" />
                      </div>
                    )}
                    <div className="absolute bottom-4 left-4">
                      <p className="text-[10px] font-black uppercase tracking-widest bg-black/60 backdrop-blur-md px-3 py-1 rounded-full border border-white/10">
                        You
                      </p>
                    </div>
                  </div>
                </div>

                <div className="p-4 border-t border-white/5 grid grid-cols-4 gap-2">
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={toggleMic}
                    className={`h-12 w-full rounded-2xl ${!isMicOn ? "bg-red-500/20 text-red-500" : "bg-white/5 text-white/40"}`}
                  >
                    {isMicOn ? <Mic className="w-4 h-4" /> : <MicOff className="w-4 h-4" />}
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={toggleCamera}
                    className={`h-12 w-full rounded-2xl ${!isCameraOn ? "bg-red-500/20 text-red-500" : "bg-white/5 text-white/40"}`}
                  >
                    {isCameraOn ? <Camera className="w-4 h-4" /> : <CameraOff className="w-4 h-4" />}
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={flipCamera}
                    className="h-12 w-full rounded-2xl bg-white/5 text-white/40"
                  >
                    <SwitchCamera className="w-4 h-4" />
                  </Button>
                  <Button
                    size="icon"
                    onClick={endVideoCall}
                    className="h-12 w-full rounded-2xl bg-red-600 hover:bg-red-700 text-white"
                  >
                    <PhoneOff className="w-4 h-4" />
                  </Button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
      </div>
    </div>
  );
}
