"use client";

import React, { createContext, useContext, useState, useRef, useEffect } from "react";
import { Song } from "@/types";
import { useAuth } from "./AuthContext";
import { db } from "@/lib/firebase";
import { ref, update, push, runTransaction } from "firebase/database";

interface PlayerContextType {
  currentSong: Song | null;
  isPlaying: boolean;
  volume: number;
  progress: number;
  duration: number;
  isAutoplay: boolean;
  playSong: (song: Song) => void;
  togglePlay: () => void;
  setVolume: (volume: number) => void;
  seek: (time: number) => void;
  toggleAutoplay: () => void;
}

const PlayerContext = createContext<PlayerContextType | undefined>(undefined);

export const PlayerProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [currentSong, setCurrentSong] = useState<Song | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [volume, setVolumeState] = useState(0.7);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isAutoplay, setIsAutoplay] = useState(false);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const playPromiseRef = useRef<Promise<void> | null>(null);
  const currentSongRef = useRef<Song | null>(null);
  const isAutoplayRef = useRef(false);

  // Sync refs with state
  useEffect(() => {
    currentSongRef.current = currentSong;
  }, [currentSong]);

  useEffect(() => {
    isAutoplayRef.current = isAutoplay;
  }, [isAutoplay]);

  useEffect(() => {
    audioRef.current = new Audio();
    const audio = audioRef.current;

    const handleTimeUpdate = () => setProgress(audio.currentTime);
    const handleDurationChange = () => setDuration(audio.duration);
    
    const handleEnded = async () => {
      setIsPlaying(false);
      const song = currentSongRef.current;
      if (song) {
        const songRef = ref(db, `songs/${song.id}/playCount`);
        runTransaction(songRef, (currentCount) => {
          return (currentCount || 0) + 1;
        });

        if (user) {
          const historyRef = ref(db, `users/${user.uid}/history`);
          push(historyRef, {
            songId: song.id,
            playedAt: Date.now()
          });
        }

        // Handle Autoplay Popular
        if (isAutoplayRef.current) {
          const { get, ref: dbRef } = await import("firebase/database");
          const songsRef = dbRef(db, "songs");
          const snapshot = await get(songsRef);
          const data = snapshot.val();
          
          if (data) {
            const allSongs: Song[] = Object.keys(data)
              .map(key => ({ id: key, ...data[key] }))
              .filter(s => s.id !== song.id); // Don't play the same song again
            
            if (allSongs.length > 0) {
              // Sort by playCount descending and pick the top one
              const popularSong = allSongs.sort((a, b) => (b.playCount || 0) - (a.playCount || 0))[0];
              
              // Add a small delay for better UX
              setTimeout(() => {
                playSong(popularSong);
              }, 1000);
            }
          }
        }
      }
    };

    audio.addEventListener("timeupdate", handleTimeUpdate);
    audio.addEventListener("durationchange", handleDurationChange);
    audio.addEventListener("ended", handleEnded);

    return () => {
      audio.removeEventListener("timeupdate", handleTimeUpdate);
      audio.removeEventListener("durationchange", handleDurationChange);
      audio.removeEventListener("ended", handleEnded);
      audio.pause();
      audio.src = "";
    };
  }, [user]); // Only recreate if user changes (for history tracking)

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = volume;
    }
  }, [volume]);

  const playSong = async (song: Song) => {
    if (!audioRef.current) return;

    try {
      if (currentSongRef.current?.id !== song.id) {
        audioRef.current.pause();
        audioRef.current.src = song.songUrl;
        audioRef.current.load();
        setCurrentSong(song);
      }

      playPromiseRef.current = audioRef.current.play();
      await playPromiseRef.current;
      setIsPlaying(true);
    } catch (error: any) {
      if (error.name !== "AbortError") {
        console.error("Playback failed:", error);
      }
    }
  };

  const togglePlay = async () => {
    if (!audioRef.current || !currentSong) return;

    try {
      if (isPlaying) {
        audioRef.current.pause();
        setIsPlaying(false);
      } else {
        playPromiseRef.current = audioRef.current.play();
        await playPromiseRef.current;
        setIsPlaying(true);
      }
    } catch (error: any) {
      if (error.name !== "AbortError") {
        console.error("Toggle play failed:", error);
      }
    }
  };

  const setVolume = (v: number) => {
    setVolumeState(v);
  };

  const seek = (time: number) => {
    if (audioRef.current) {
      audioRef.current.currentTime = time;
      setProgress(time);
    }
  };

  const toggleAutoplay = () => {
    setIsAutoplay(!isAutoplay);
  };

  return (
    <PlayerContext.Provider value={{ 
      currentSong, 
      isPlaying, 
      volume, 
      progress, 
      duration, 
      isAutoplay,
      playSong, 
      togglePlay, 
      setVolume, 
      seek,
      toggleAutoplay
    }}>
      {children}
    </PlayerContext.Provider>
  );
};

export const usePlayer = () => {
  const context = useContext(PlayerContext);
  if (context === undefined) {
    throw new Error("usePlayer must be used within a PlayerProvider");
  }
  return context;
};
