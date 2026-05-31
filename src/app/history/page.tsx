"use client";

import React, { useState, useEffect } from "react";
import MainLayout from "@/components/MainLayout";
import Header from "@/components/Header";
import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";
import { ref, onValue } from "firebase/database";
import { db } from "@/lib/firebase";
import { Song } from "@/types";
import { History, Music, Play, Pause, Clock } from "lucide-react";
import { usePlayer } from "@/context/PlayerContext";
import { cn } from "@/lib/utils";

const HistoryPage = () => {
  const { profile, loading: authLoading } = useAuth();
  const router = useRouter();
  const [historySongs, setHistorySongs] = useState<(Song & { playedAt: number })[]>([]);
  const [loading, setLoading] = useState(true);
  const { currentSong, isPlaying, playSong, togglePlay } = usePlayer();

  useEffect(() => {
    if (!authLoading && !profile) {
      router.push("/auth");
      return;
    }

    if (profile) {
      const historyRef = ref(db, `users/${profile.uid}/history`);
      const songsRef = ref(db, "songs");

      onValue(songsRef, (songsSnapshot) => {
        const allSongs = songsSnapshot.val();
        if (allSongs) {
          onValue(historyRef, (historySnapshot) => {
            const historyData = historySnapshot.val();
            if (historyData) {
              const list = Object.values(historyData) as { songId: string; playedAt: number }[];
              const mapped = list
                .filter(item => allSongs[item.songId])
                .map(item => ({
                  ...allSongs[item.songId],
                  id: item.songId,
                  playedAt: item.playedAt
                }))
                .sort((a, b) => b.playedAt - a.playedAt);
              setHistorySongs(mapped);
            } else {
              setHistorySongs([]);
            }
            setLoading(false);
          });
        } else {
          setLoading(false);
        }
      });
    }
  }, [profile, authLoading, router]);

  const handlePlay = (song: Song) => {
    if (currentSong?.id === song.id) {
      togglePlay();
    } else {
      playSong(song);
    }
  };

  if (authLoading || loading) return (
    <MainLayout>
      <div className="flex-1 flex items-center justify-center">
        <History className="w-12 h-12 animate-pulse text-primary" />
      </div>
    </MainLayout>
  );

  return (
    <MainLayout>
      <Header />
      <div className="px-6 py-8">
        <div className="flex items-center gap-x-4 mb-8">
          <div className="w-16 h-16 bg-primary/20 rounded-xl flex items-center justify-center text-primary">
            <History size={32} />
          </div>
          <div>
            <h1 className="text-3xl font-bold">Listening History</h1>
            <p className="text-text-muted">Songs you've played from start to finish</p>
          </div>
        </div>

        <div className="bg-card/20 rounded-2xl border border-white/5 overflow-hidden">
          <div className="grid grid-cols-[16px_1fr_1fr_auto] gap-x-4 px-6 py-4 text-text-muted text-xs uppercase font-bold tracking-widest border-b border-white/5">
            <span>#</span>
            <span>Title</span>
            <span>Played At</span>
            <div className="flex justify-end pr-1">
              <Clock size={16} />
            </div>
          </div>

          <div className="flex flex-col">
            {historySongs.map((song, index) => (
              <div 
                key={`${song.id}-${song.playedAt}`}
                onClick={() => handlePlay(song)}
                className="group grid grid-cols-[16px_1fr_1fr_auto] gap-x-4 px-6 py-3 hover:bg-white/5 transition cursor-pointer items-center"
              >
                <span className="text-sm text-text-muted group-hover:hidden">{index + 1}</span>
                <Play size={14} fill="white" className="hidden group-hover:block text-white" />
                
                <div className="flex items-center gap-x-3 truncate">
                  <img src={song.coverUrl} alt="" className="w-10 h-10 object-cover rounded shadow-lg" />
                  <div className="flex flex-col truncate">
                    <span className={cn(
                      "font-medium text-sm truncate",
                      currentSong?.id === song.id ? "text-primary" : "text-white"
                    )}>
                      {song.title}
                    </span>
                    <span className="text-xs text-text-muted truncate">{song.artist}</span>
                  </div>
                </div>

                <span className="text-sm text-text-muted">
                  {new Date(song.playedAt).toLocaleString()}
                </span>

                <div className="text-xs text-text-muted px-2">
                  {song.playCount || 0} plays
                </div>
              </div>
            ))}

            {historySongs.length === 0 && (
              <div className="flex flex-col items-center justify-center py-20 text-text-muted opacity-20">
                <Music size={64} className="mb-4" />
                <p className="text-xl font-bold">No history yet</p>
              </div>
            )}
          </div>
        </div>
      </div>
      <div className="h-20" />
    </MainLayout>
  );
};

export default HistoryPage;