"use client";

import React, { useState, useEffect } from "react";
import Header from "@/components/Header";
import MainLayout from "@/components/MainLayout";
import { Play, Pause, Heart, Plus, X, Music } from "lucide-react";
import { ref, onValue, set } from "firebase/database";
import { db } from "@/lib/firebase";
import { Song, Playlist } from "@/types";
import { usePlayer } from "@/context/PlayerContext";
import { useAuth } from "@/context/AuthContext";
import { cn } from "@/lib/utils";
import toast from "react-hot-toast";

export default function Home() {
  const [songs, setSongs] = useState<Song[]>([]);
  const [loading, setLoading] = useState(true);
  const [userPlaylists, setUserPlaylists] = useState<Playlist[]>([]);
  const [showPlaylistModal, setShowPlaylistModal] = useState(false);
  const [selectedSongId, setSelectedSongId] = useState<string | null>(null);

  const { currentSong, isPlaying, playSong, togglePlay } = usePlayer();
  const { profile, toggleLike } = useAuth();

  useEffect(() => {
    const songsRef = ref(db, "songs");
    const unsubscribeSongs = onValue(songsRef, (snapshot) => {
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

    // Fetch Playlists
    const playlistsRef = ref(db, "playlists");
    const unsubscribePlaylists = onValue(playlistsRef, (snapshot) => {
      const data = snapshot.val();
      if (data && profile) {
        const allPlaylists = Object.keys(data).map(key => ({ id: key, ...data[key] }));
        setUserPlaylists(allPlaylists.filter(p => p.ownerId === profile.uid));
      }
    });

    return () => {
      unsubscribeSongs();
      unsubscribePlaylists();
    };
  }, [profile]);

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
              <div className="flex items-center justify-between mt-1">
                <div className="flex items-center gap-x-1 text-[10px] text-text-muted truncate flex-1">
                  <span>By {song.uploaderName || "Unknown"}</span>
                  <span>•</span>
                  <span>{song.playCount || 0} plays</span>
                </div>
                <div className="flex items-center gap-x-2 ml-2">
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedSongId(song.id);
                      setShowPlaylistModal(true);
                    }}
                    className="p-1 text-text-muted hover:text-white transition"
                    title="Add to playlist"
                  >
                    <Plus size={16} />
                  </button>
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleLike(song.id);
                    }}
                    className="hover:scale-110 transition active:scale-90"
                  >
                    <Heart 
                      size={16} 
                      className={cn(
                        profile?.likedSongs?.[song.id] ? "text-primary fill-primary" : "text-text-muted hover:text-white"
                      )} 
                    />
                  </button>
                </div>
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
              <div className="flex items-center justify-between mt-1">
                <div className="flex items-center gap-x-1 text-[10px] text-text-muted truncate flex-1">
                  <span>By {song.uploaderName || "Unknown"}</span>
                  <span>•</span>
                  <span>{song.playCount || 0} plays</span>
                </div>
                <div className="flex items-center gap-x-2 ml-2">
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedSongId(song.id);
                      setShowPlaylistModal(true);
                    }}
                    className="p-1 text-text-muted hover:text-white transition"
                    title="Add to playlist"
                  >
                    <Plus size={16} />
                  </button>
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleLike(song.id);
                    }}
                    className="hover:scale-110 transition active:scale-90"
                  >
                    <Heart 
                      size={16} 
                      className={cn(
                        profile?.likedSongs?.[song.id] ? "text-primary fill-primary" : "text-text-muted hover:text-white"
                      )} 
                    />
                  </button>
                </div>
              </div>
            </div>
          ))}
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
}
