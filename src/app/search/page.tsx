"use client";

import React, { useState, useEffect } from "react";
import MainLayout from "@/components/MainLayout";
import Header from "@/components/Header";
import { Search as SearchIcon, Play, Pause, Music, Heart, User, Plus, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { ref, onValue, set } from "firebase/database";
import { db } from "@/lib/firebase";
import { Song, UserProfile, Playlist } from "@/types";
import { usePlayer } from "@/context/PlayerContext";
import { useAuth } from "@/context/AuthContext";
import { cn } from "@/lib/utils";
import toast from "react-hot-toast";

const SearchPage = () => {
  const router = useRouter();
  const [searchTerm, setSearchTerm] = useState("");
  const [songs, setSongs] = useState<Song[]>([]);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [filteredSongs, setFilteredSongs] = useState<Song[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<UserProfile[]>([]);
  const [filteredPlaylists, setFilteredPlaylists] = useState<Playlist[]>([]);
  const [loading, setLoading] = useState(true);
  const [userPlaylists, setUserPlaylists] = useState<Playlist[]>([]);
  const [showPlaylistModal, setShowPlaylistModal] = useState(false);
  const [selectedSongId, setSelectedSongId] = useState<string | null>(null);
  
  const { currentSong, isPlaying, playSong, togglePlay } = usePlayer();
  const { profile, toggleLike } = useAuth();

  useEffect(() => {
    // Fetch Songs
    const songsRef = ref(db, "songs");
    const unsubscribeSongs = onValue(songsRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        setSongs(Object.keys(data).map(key => ({ id: key, ...data[key] })));
      }
    });

    // Fetch Users
    const usersRef = ref(db, "users");
    const unsubscribeUsers = onValue(usersRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        setUsers(Object.keys(data).map(key => ({ uid: key, ...data[key] })));
      }
    });

    // Fetch Playlists
    const playlistsRef = ref(db, "playlists");
    const unsubscribePlaylists = onValue(playlistsRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const allPlaylists = Object.keys(data).map(key => ({ id: key, ...data[key] }));
        setPlaylists(allPlaylists);
        if (profile) {
          setUserPlaylists(allPlaylists.filter(p => p.ownerId === profile.uid));
        }
      }
      setLoading(false);
    });

    return () => {
      unsubscribeSongs();
      unsubscribeUsers();
      unsubscribePlaylists();
    };
  }, [profile]);

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

  useEffect(() => {
    if (!searchTerm) {
      setFilteredSongs([]);
      setFilteredUsers([]);
      setFilteredPlaylists([]);
      return;
    }

    const term = searchTerm.toLowerCase();
    
    setFilteredSongs(songs
      .filter(song => 
        song.title.toLowerCase().includes(term) ||
        song.artist.toLowerCase().includes(term) ||
        song.album.toLowerCase().includes(term)
      )
      .sort((a, b) => (b.playCount || 0) - (a.playCount || 0)) // Trending algorithm: sort by playCount
    );

    setFilteredUsers(users.filter(u => 
      u.displayName?.toLowerCase().includes(term) || 
      u.email?.toLowerCase().includes(term)
    ));

    setFilteredPlaylists(playlists.filter(p => 
      p.isPublic && p.name.toLowerCase().includes(term)
    ));
  }, [searchTerm, songs, users, playlists]);

  const handlePlay = (song: Song) => {
    if (currentSong?.id === song.id) {
      togglePlay();
    } else {
      playSong(song);
    }
  };

  return (
    <MainLayout>
      <Header />
      <div className="px-6 py-4">
        <div className="relative max-w-md mb-8">
          <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" size={20} />
          <input 
            type="text"
            placeholder="What do you want to listen to?"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-card-hover border-none rounded-full py-3 pl-10 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-white/20 transition"
          />
        </div>

        {searchTerm && (
          <div className="space-y-8">
            {/* Songs Results */}
            {filteredSongs.length > 0 && (
              <div>
                <h2 className="text-2xl font-bold mb-4">Songs</h2>
                <div className="space-y-2">
                  {filteredSongs.map((song) => (
                    <div 
                      key={song.id}
                      className="group flex items-center gap-x-4 p-2 rounded-md hover:bg-white/10 transition cursor-pointer"
                    >
                      <div className="flex items-center flex-1 gap-x-4 min-w-0" onClick={() => handlePlay(song)}>
                        <div className="relative w-12 h-12 flex-shrink-0">
                          <img src={song.coverUrl} alt="" className="w-full h-full object-cover rounded shadow-lg" />
                          <div className={cn(
                            "absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 transition",
                            currentSong?.id === song.id && "opacity-100"
                          )}>
                            {currentSong?.id === song.id && isPlaying ? (
                              <Pause size={20} fill="white" className="text-white" />
                            ) : (
                              <Play size={20} fill="white" className="text-white" />
                            )}
                          </div>
                        </div>
                        <div className="flex flex-col flex-1 truncate">
                          <span className={cn(
                            "font-medium truncate",
                            currentSong?.id === song.id ? "text-primary" : "text-white"
                          )}>
                            {song.title}
                          </span>
                          <div className="flex items-center gap-x-2 text-xs text-text-muted truncate">
                            <span>{song.artist}</span>
                            <span>•</span>
                            <span className="hover:text-white transition" onClick={(e) => {
                              e.stopPropagation();
                              router.push(`/profile/${song.uploadedBy}`);
                            }}>
                              By {song.uploaderName || "Unknown"}
                            </span>
                            <span>•</span>
                            <span>{song.playCount || 0} plays</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-x-2 px-4">
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedSongId(song.id);
                            setShowPlaylistModal(true);
                          }}
                          className="p-2 text-text-muted hover:text-white transition"
                          title="Add to playlist"
                        >
                          <Plus size={20} />
                        </button>
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleLike(song.id);
                          }}
                          className="hover:scale-110 transition active:scale-90"
                        >
                          <Heart 
                            size={20} 
                            className={cn(
                              profile?.likedSongs?.[song.id] ? "text-primary fill-primary" : "text-text-muted hover:text-white"
                            )} 
                          />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Playlists Results */}
            {filteredPlaylists.length > 0 && (
              <div>
                <h2 className="text-2xl font-bold mb-4">Playlists</h2>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                  {filteredPlaylists.map((p) => (
                    <div 
                      key={p.id}
                      onClick={() => router.push(`/playlist/${p.id}`)}
                      className="bg-card/40 hover:bg-card transition p-4 rounded-xl cursor-pointer group flex flex-col items-center text-center"
                    >
                      <div className="relative w-full aspect-square mb-4 shadow-2xl rounded-md overflow-hidden bg-neutral-800">
                        {p.iconUrl ? (
                          <img src={p.iconUrl} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-text-muted">
                            <Music size={60} />
                          </div>
                        )}
                      </div>
                      <span className="font-bold block truncate w-full mb-1">
                        {p.name}
                      </span>
                      <span className="text-xs text-text-muted truncate w-full">
                        By {p.ownerName}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Profiles Results */}
            {filteredUsers.length > 0 && (
              <div>
                <h2 className="text-2xl font-bold mb-4">Profiles</h2>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                  {filteredUsers.map((u) => (
                    <div 
                      key={u.uid}
                      onClick={() => router.push(`/profile/${u.uid}`)}
                      className="bg-card/40 hover:bg-card transition p-4 rounded-xl cursor-pointer group flex flex-col items-center text-center"
                    >
                      <div className="relative w-full aspect-square mb-4 shadow-2xl rounded-full overflow-hidden bg-neutral-800">
                        {u.photoURL ? (
                          <img src={u.photoURL} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-text-muted">
                            <User size={60} />
                          </div>
                        )}
                      </div>
                      <span className="font-bold block truncate w-full mb-1">
                        {u.displayName || "User"}
                      </span>
                      <span className="text-xs text-text-muted uppercase tracking-wider">Profile</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Playlist Modal */}
        {showPlaylistModal && (
          <div className="fixed inset-0 bg-black/80 z-[100] flex items-center justify-center p-4">
            <div className="bg-card w-full max-w-md rounded-xl p-6 border border-white/10 shadow-2xl">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-bold">Add to Playlist</h3>
                <button onClick={() => setShowPlaylistModal(false)} className="text-text-muted hover:text-white">
                  <X size={24} />
                </button>
              </div>
              <div className="space-y-2 max-h-[300px] overflow-y-auto custom-scrollbar pr-2">
                {userPlaylists.length === 0 ? (
                  <p className="text-center text-text-muted py-8">You don&apos;t have any playlists yet.</p>
                ) : (
                  userPlaylists.map(p => (
                    <button
                      key={p.id}
                      onClick={() => addToPlaylist(p.id)}
                      className="w-full flex items-center gap-x-3 p-3 rounded-lg hover:bg-white/10 transition text-left"
                    >
                      <div className="w-10 h-10 bg-neutral-800 rounded flex items-center justify-center flex-shrink-0">
                        {p.iconUrl ? <img src={p.iconUrl} alt="" className="w-full h-full object-cover" /> : <Music size={20} />}
                      </div>
                      <span className="font-medium truncate">{p.name}</span>
                    </button>
                  ))
                )}
              </div>
            </div>
          </div>
        )}

        {!loading && searchTerm && filteredSongs.length === 0 && filteredUsers.length === 0 && (
            <div className="flex flex-col items-center justify-center py-20 text-text-muted">
              <Music size={48} className="mb-4 opacity-20" />
              <p>No results found for &quot;{searchTerm}&quot;</p>
              <p className="text-sm">Please make sure your words are spelled correctly or use fewer keywords.</p>
            </div>
          )}
      </div>
      <div className="h-32" />
    </MainLayout>
  );
};

export default SearchPage;
