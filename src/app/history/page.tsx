"use client";

import React, { useState, useEffect } from "react";
import MainLayout from "@/components/MainLayout";
import Header from "@/components/Header";
import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";
import { ref, onValue } from "firebase/database";
import { db } from "@/lib/firebase";
import { Song } from "@/types";
import { History, Music, Play, Pause, Clock, Plus, X, Heart } from "lucide-react";
import { usePlayer } from "@/context/PlayerContext";
import { cn } from "@/lib/utils";
import { Playlist } from "@/types";
import { set } from "firebase/database";
import toast from "react-hot-toast";

const HistoryPage = () => {
  const { profile, loading: authLoading, toggleLike } = useAuth();
  const router = useRouter();
  const [historySongs, setHistorySongs] = useState<(Song & { playedAt: number })[]>([]);
  const [loading, setLoading] = useState(true);
  const [userPlaylists, setUserPlaylists] = useState<Playlist[]>([]);
  const [showPlaylistModal, setShowPlaylistModal] = useState(false);
  const [selectedSongId, setSelectedSongId] = useState<string | null>(null);

  const { currentSong, isPlaying, playSong, togglePlay } = usePlayer();

  useEffect(() => {
    if (!authLoading && !profile) {
      router.push("/auth");
      return;
    }

    if (profile) {
      const historyRef = ref(db, `users/${profile.uid}/history`);
      const songsRef = ref(db, "songs");
      const playlistsRef = ref(db, "playlists");

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
          });
        }
      });

      // Fetch Playlists
      onValue(playlistsRef, (snapshot) => {
        const data = snapshot.val();
        if (data) {
          const allPlaylists = Object.keys(data).map(key => ({ id: key, ...data[key] }));
          setUserPlaylists(allPlaylists.filter(p => p.ownerId === profile.uid));
        }
        setLoading(false);
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

  const addToPlaylist = async (playlistId: string) => {
    if (!selectedSongId) return;
    try {
      await set(ref(db, `playlists/${playlistId}/songs/${selectedSongId}`), true);
      toast.success("Added to playlist");
      setShowPlaylistModal(false);
    } catch (error) {
      toast.error("Failed to add to playlist");
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
            <div className="flex justify-end pr-4">
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

                <div className="flex items-center gap-x-4 px-2 justify-end">
                  <span className="text-[10px] text-text-muted hidden sm:block">{song.playCount || 0} plays</span>
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedSongId(song.id);
                      setShowPlaylistModal(true);
                    }}
                    className="p-1 text-text-muted hover:text-white transition opacity-0 group-hover:opacity-100"
                    title="Add to playlist"
                  >
                    <Plus size={18} />
                  </button>
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleLike(song.id);
                    }}
                    className="hover:scale-110 transition active:scale-90"
                  >
                    <Heart 
                      size={18} 
                      className={cn(
                        profile?.likedSongs?.[song.id] ? "text-primary fill-primary" : "text-text-muted hover:text-white"
                      )} 
                    />
                  </button>
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

      {/* Playlist Modal */}
      {showPlaylistModal && (
        <div className="fixed inset-0 bg-black/80 z-[100] flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-card w-full max-w-md rounded-xl p-6 border border-white/10 shadow-2xl animate-in fade-in zoom-in duration-200">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold">Add to Playlist</h3>
              <button onClick={() => setShowPlaylistModal(false)} className="text-text-muted hover:text-white">
                <X size={24} />
              </button>
            </div>
            <div className="space-y-2 max-h-[300px] overflow-y-auto custom-scrollbar pr-2">
              {userPlaylists.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-text-muted mb-4">You don&apos;t have any playlists yet.</p>
                </div>
              ) : (
                userPlaylists.map(p => (
                  <button
                    key={p.id}
                    onClick={() => addToPlaylist(p.id)}
                    className="w-full flex items-center gap-x-3 p-3 rounded-lg hover:bg-white/10 transition text-left group"
                  >
                    <div className="w-10 h-10 bg-neutral-800 rounded flex items-center justify-center flex-shrink-0 group-hover:bg-neutral-700 transition">
                      {p.iconUrl ? <img src={p.iconUrl} alt="" className="w-full h-full object-cover rounded" /> : <Music size={20} className="text-text-muted" />}
                    </div>
                    <span className="font-medium truncate">{p.name}</span>
                  </button>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      <div className="h-32" />
    </MainLayout>
  );
};

export default HistoryPage;