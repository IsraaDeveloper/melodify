"use client";

import React, { useState, useEffect } from "react";
import MainLayout from "@/components/MainLayout";
import Header from "@/components/Header";
import { Play, Music, Heart, Clock, Edit2, Check, X, Trash2, Plus } from "lucide-react";
import { ref, onValue, set, remove, push } from "firebase/database";
import { db } from "@/lib/firebase";
import { Song, Playlist } from "@/types";
import { usePlayer } from "@/context/PlayerContext";
import { useAuth } from "@/context/AuthContext";
import { cn } from "@/lib/utils";
import { useParams, useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { uploadFile } from "@/actions/upload";

const PlaylistPage = () => {
  const { user: currentUser, profile: currentProfile, loading: authLoading, toggleLike } = useAuth();
  const params = useParams();
  const router = useRouter();
  const [songs, setSongs] = useState<Song[]>([]);
  const [playlist, setPlaylist] = useState<Playlist | null>(null);
  const [loading, setLoading] = useState(true);
  
  const [isEditing, setIsEditing] = useState(false);
  const [newName, setNewName] = useState("");
  const [iconFile, setIconFile] = useState<File | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [userPlaylists, setUserPlaylists] = useState<Playlist[]>([]);
  const [showPlaylistModal, setShowPlaylistModal] = useState(false);
  const [selectedSongId, setSelectedSongId] = useState<string | null>(null);

  const { currentSong, isPlaying, playSong, togglePlay } = usePlayer();

  const playlistId = params?.id as string;
  const isLikedSongs = playlistId === "liked";

  useEffect(() => {
    if (!playlistId) return;

    if (isLikedSongs) {
      if (!currentUser) {
        if (!authLoading) router.push("/auth");
        return;
      }
      
      const songsRef = ref(db, "songs");
      const unsubscribe = onValue(songsRef, (snapshot) => {
        const allSongs = snapshot.val();
        if (allSongs && currentProfile?.likedSongs) {
          const likedList = Object.keys(allSongs)
            .filter(id => currentProfile.likedSongs?.[id])
            .map(id => ({ id, ...allSongs[id] }));
          setSongs(likedList);
        } else {
          setSongs([]);
        }
        setLoading(false);
      });
      return () => unsubscribe();
    } else {
      const playlistRef = ref(db, `playlists/${playlistId}`);
      const unsubscribe = onValue(playlistRef, (snapshot) => {
        if (snapshot.exists()) {
          const data = snapshot.val() as Playlist;
          setPlaylist(data);
          setNewName(data.name);
          
          // Fetch songs in playlist
          const songsRef = ref(db, "songs");
          onValue(songsRef, (songsSnapshot) => {
            const allSongs = songsSnapshot.val();
            if (allSongs && data.songs) {
              const playlistSongs = Object.keys(data.songs)
                .filter(id => allSongs[id])
                .map(id => ({ id, ...allSongs[id] }));
              setSongs(playlistSongs);
            } else {
              setSongs([]);
            }
          });
        } else {
          toast.error("Playlist not found");
          router.push("/");
        }
      });

      // Fetch user playlists for the "Add to Playlist" modal
      const playlistsRef = ref(db, "playlists");
      const unsubscribePlaylists = onValue(playlistsRef, (snapshot) => {
        const data = snapshot.val();
        if (data && currentUser) {
          const allPlaylists = Object.keys(data).map(key => ({ id: key, ...data[key] }));
          setUserPlaylists(allPlaylists.filter(p => p.ownerId === currentUser.uid));
        }
        setLoading(false);
      });

      return () => {
        unsubscribe();
        unsubscribePlaylists();
      };
    }
  }, [playlistId, currentUser, currentProfile, authLoading]);

  const addToPlaylist = async (pId: string) => {
    if (!selectedSongId) return;
    try {
      await set(ref(db, `playlists/${pId}/songs/${selectedSongId}`), true);
      toast.success("Added to playlist");
      setShowPlaylistModal(false);
    } catch (error) {
      toast.error("Failed to add to playlist");
    }
  };

  const removeFromPlaylist = async (songId: string) => {
    if (!playlistId || isLikedSongs) return;
    try {
      await remove(ref(db, `playlists/${playlistId}/songs/${songId}`));
      toast.success("Removed from playlist");
    } catch (error) {
      toast.error("Failed to remove song");
    }
  };

  const handlePlay = (song: Song) => {
    if (currentSong?.id === song.id) {
      togglePlay();
    } else {
      playSong(song);
    }
  };

  const handleSaveSettings = async () => {
    if (!currentUser || !playlist || playlist.ownerId !== currentUser.uid) return;
    
    setIsSaving(true);
    const toastId = toast.loading("Saving playlist...");
    try {
      let iconUrl = playlist.iconUrl || "";

      if (iconFile) {
        const formData = new FormData();
        formData.append("file", iconFile);
        const uploadResult = await uploadFile(formData);
        if (uploadResult.success && uploadResult.publicUrl) {
          iconUrl = uploadResult.publicUrl;
        }
      }

      await set(ref(db, `playlists/${playlistId}/name`), newName);
      await set(ref(db, `playlists/${playlistId}/iconUrl`), iconUrl);
      
      setIsEditing(false);
      setIconFile(null);
      toast.success("Playlist updated!", { id: toastId });
    } catch (error: any) {
      toast.error("Failed to update playlist", { id: toastId });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeletePlaylist = async () => {
    if (!currentUser || !playlist || playlist.ownerId !== currentUser.uid) return;
    if (!confirm("Are you sure you want to delete this playlist?")) return;

    try {
      await remove(ref(db, `playlists/${playlistId}`));
      await remove(ref(db, `users/${currentUser.uid}/playlists/${playlistId}`));
      toast.success("Playlist deleted");
      router.push("/");
    } catch (error) {
      toast.error("Failed to delete playlist");
    }
  };

  if (authLoading || loading) return (
    <MainLayout>
      <div className="flex-1 flex items-center justify-center">
        <Music className="w-12 h-12 animate-pulse text-primary" />
      </div>
    </MainLayout>
  );

  const isOwner = currentUser?.uid === playlist?.ownerId;
  const displayName = isLikedSongs ? "Liked Songs" : playlist?.name;
  const displayIcon = isLikedSongs ? null : playlist?.iconUrl;

  return (
    <MainLayout>
      <Header />
      <div className="px-6 py-4">
        <div className="flex flex-col md:flex-row items-center md:items-end gap-x-6 mb-8 mt-4">
          <div className="relative group">
            <div className="w-40 h-40 md:w-52 md:h-52 bg-gradient-to-br from-indigo-700 to-purple-900 shadow-2xl flex items-center justify-center rounded-md overflow-hidden">
              {isLikedSongs ? (
                <Heart size={80} fill="white" className="text-white" />
              ) : displayIcon ? (
                <img src={displayIcon} alt="" className="w-full h-full object-cover" />
              ) : (
                <Music size={80} className="text-white/20" />
              )}
            </div>
            {isOwner && !isLikedSongs && (
              <button 
                onClick={() => setIsEditing(true)}
                className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition rounded-md"
              >
                <Edit2 size={32} />
              </button>
            )}
          </div>

          <div className="flex flex-col gap-y-2 mt-4 md:mt-0 w-full max-w-xl">
            <span className="text-xs font-bold uppercase">Playlist</span>
            
            {isEditing ? (
              <div className="space-y-4">
                <input 
                  type="text" 
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  className="bg-white/10 border-none rounded-lg px-4 py-2 text-2xl font-bold w-full focus:ring-2 focus:ring-primary outline-none"
                />
                <div className="flex gap-x-2">
                  <button onClick={handleSaveSettings} disabled={isSaving} className="bg-primary text-black px-4 py-2 rounded-full font-bold flex items-center gap-x-1">
                    <Check size={16} /> Save
                  </button>
                  <button onClick={() => setIsEditing(false)} className="bg-white/10 px-4 py-2 rounded-full font-bold flex items-center gap-x-1">
                    <X size={16} /> Cancel
                  </button>
                  <button onClick={handleDeletePlaylist} className="bg-red-500/10 text-red-500 px-4 py-2 rounded-full font-bold flex items-center gap-x-1 hover:bg-red-500 hover:text-white transition ml-auto">
                    <Trash2 size={16} /> Delete
                  </button>
                </div>
              </div>
            ) : (
              <>
                <h1 className="text-4xl md:text-7xl font-bold truncate">{displayName}</h1>
                <div className="flex items-center gap-x-2 text-sm font-medium mt-2">
                  <span className="font-bold">{isLikedSongs ? currentProfile?.displayName : playlist?.ownerName}</span>
                  <span className="text-text-muted">• {songs.length} songs</span>
                </div>
              </>
            )}
          </div>
        </div>

        <div className="bg-black/20 backdrop-blur-sm -mx-6 px-6 py-4">
          <div className="grid grid-cols-[16px_1fr_2fr_1fr] gap-x-4 px-4 py-2 text-text-muted text-xs uppercase tracking-wider border-b border-white/5 mb-4">
            <span>#</span>
            <span>Title</span>
            <span className="hidden md:block">Album</span>
            <div className="flex justify-end pr-1">
              <Clock size={16} />
            </div>
          </div>

          <div className="flex flex-col gap-y-1">
            {songs.map((song, index) => (
              <div 
                key={song.id}
                onClick={() => handlePlay(song)}
                className="group grid grid-cols-[16px_1fr_2fr_1fr] gap-x-4 px-4 py-2 rounded-md hover:bg-white/10 transition cursor-pointer items-center"
              >
                <span className="text-sm text-text-muted group-hover:hidden">{index + 1}</span>
                <Play size={14} fill="currentColor" className="hidden group-hover:block text-white" />
                
                <div className="flex items-center gap-x-3 truncate">
                  <img src={song.coverUrl} alt="" className="w-10 h-10 object-cover rounded" />
                  <div className="flex flex-col truncate">
                    <span className={cn("font-medium text-sm truncate", currentSong?.id === song.id && "text-primary")}>
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
                    </div>
                  </div>
                </div>

                <span className="hidden md:block text-sm text-text-muted truncate">{song.album}</span>

                <div className="flex justify-end gap-x-4 items-center">
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
                    <Plus size={16} />
                  </button>
                  <button 
                    onClick={(e) => { e.stopPropagation(); toggleLike(song.id); }}
                    className="hover:scale-110 transition"
                  >
                    <Heart size={16} className={cn(currentProfile?.likedSongs?.[song.id] ? "text-primary fill-primary" : "text-text-muted hover:text-white")} />
                  </button>
                  {isOwner && !isLikedSongs && (
                    <button 
                      onClick={(e) => { e.stopPropagation(); removeFromPlaylist(song.id); }}
                      className="text-text-muted hover:text-red-500 transition opacity-0 group-hover:opacity-100"
                    >
                      <Trash2 size={16} />
                    </button>
                  )}
                </div>
              </div>
            ))}
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

export default PlaylistPage;