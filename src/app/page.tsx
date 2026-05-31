"use client";

import React, { useState, useEffect } from "react";
import Header from "@/components/Header";
import MainLayout from "@/components/MainLayout";
import { Play, Pause, Heart } from "lucide-react";
import { ref, onValue } from "firebase/database";
import { db } from "@/lib/firebase";
import { Song } from "@/types";
import { usePlayer } from "@/context/PlayerContext";
import { useAuth } from "@/context/AuthContext";
import { cn } from "@/lib/utils";

export default function Home() {
  const [songs, setSongs] = useState<Song[]>([]);
  const [loading, setLoading] = useState(true);
  const { currentSong, isPlaying, playSong, togglePlay } = usePlayer();
  const { profile, toggleLike } = useAuth();

  useEffect(() => {
    const songsRef = ref(db, "songs");
    const unsubscribe = onValue(songsRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const songList = Object.keys(data).map(key => ({
          id: key,
          ...data[key]
        }));
        setSongs(songList);
      } else {
        setSongs([]);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const handlePlay = (song: Song) => {
    if (currentSong?.id === song.id) {
      togglePlay();
    } else {
      playSong(song);
    }
  };

  const trendingSongs = [...songs].sort((a, b) => (b.playCount || 0) - (a.playCount || 0)).slice(0, 10);
  const recentSongs = [...songs].sort((a, b) => b.createdAt - a.createdAt).slice(0, 10);

  return (
    <MainLayout>
      <Header />
      <div className="px-6 py-4">
        <h1 className="text-3xl font-bold mb-6">Trending Now</h1>
        
        {/* Trending Section */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-6 mb-12">
          {trendingSongs.map((song) => (
            <div 
              key={song.id}
              className="group bg-card/40 hover:bg-card transition p-4 rounded-xl cursor-pointer"
              onClick={() => handlePlay(song)}
            >
              <div className="relative aspect-square mb-4 shadow-2xl rounded-md overflow-hidden">
                <img src={song.coverUrl} alt="" className="w-full h-full object-cover" />
                <div className={cn(
                  "absolute bottom-2 right-2 p-3 bg-primary rounded-full shadow-xl translate-y-2 opacity-0 group-hover:translate-y-0 group-hover:opacity-100 transition duration-300",
                  currentSong?.id === song.id && "opacity-100 translate-y-0"
                )}>
                  {currentSong?.id === song.id && isPlaying ? (
                    <Pause size={24} fill="black" className="text-black" />
                  ) : (
                    <Play size={24} fill="black" className="text-black" />
                  )}
                </div>
              </div>
              <span className="font-bold block truncate">{song.title}</span>
              <span className="text-xs text-text-muted block truncate mt-1">{song.artist}</span>
              <div className="flex items-center gap-x-1 mt-1 text-[10px] text-text-muted">
                <span>By {song.uploaderName || "Unknown"}</span>
                <span>•</span>
                <span>{song.playCount || 0} plays</span>
              </div>
            </div>
          ))}
          {loading && [1, 2, 3, 4, 5].map(i => (
            <div key={i} className="bg-white/5 animate-pulse rounded-xl aspect-square" />
          ))}
        </div>

        <h2 className="text-2xl font-bold mb-6">Recently Added</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-6">
          {recentSongs.map((song) => (
            <div 
              key={song.id}
              className="group bg-card/40 hover:bg-card transition p-4 rounded-xl cursor-pointer"
              onClick={() => handlePlay(song)}
            >
              <div className="relative aspect-square mb-4 shadow-2xl rounded-md overflow-hidden">
                <img src={song.coverUrl} alt="" className="w-full h-full object-cover" />
                <div className={cn(
                  "absolute bottom-2 right-2 p-3 bg-primary rounded-full shadow-xl translate-y-2 opacity-0 group-hover:translate-y-0 group-hover:opacity-100 transition duration-300",
                  currentSong?.id === song.id && "opacity-100 translate-y-0"
                )}>
                  {currentSong?.id === song.id && isPlaying ? (
                    <Pause size={24} fill="black" className="text-black" />
                  ) : (
                    <Play size={24} fill="black" className="text-black" />
                  )}
                </div>
              </div>
              <span className="font-bold block truncate">{song.title}</span>
              <span className="text-xs text-text-muted block truncate mt-1">{song.artist}</span>
            </div>
          ))}
        </div>
      </div>
      <div className="h-20" />
    </MainLayout>
  );
}
