"use client";

import React, { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";
import MainLayout from "@/components/MainLayout";
import Header from "@/components/Header";
import { Plus, Music, Trash2, Loader2, UploadCloud } from "lucide-react";
import { ref, push, set, onValue, remove } from "firebase/database";
import { db } from "@/lib/firebase";
import { Song } from "@/types";
import { uploadFile } from "@/actions/upload";
import toast from "react-hot-toast";

const UploadPage = () => {
  const { profile, loading: authLoading } = useAuth();
  const router = useRouter();
  
  const [songs, setSongs] = useState<Song[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  
  const [formData, setFormData] = useState({
    title: "",
    artist: "",
    album: "",
  });
  const [musicFile, setMusicFile] = useState<File | null>(null);
  const [coverFile, setCoverFile] = useState<File | null>(null);

  useEffect(() => {
    if (!authLoading && !profile) {
      router.push("/auth");
    }
  }, [profile, authLoading, router]);

  useEffect(() => {
    if (!profile) return;

    const songsRef = ref(db, "songs");
    const unsubscribe = onValue(songsRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const songList = Object.keys(data)
          .map(key => ({
            id: key,
            ...data[key]
          }))
          .filter(song => song.uploadedBy === profile.uid);
        setSongs(songList);
      } else {
        setSongs([]);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, [profile]);

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!musicFile || !coverFile || !formData.title || !formData.artist) {
      toast.error("Semua field harus diisi!");
      return;
    }

    // Max 20MB check
    const MAX_SIZE = 20 * 1024 * 1024;
    if (musicFile.size > MAX_SIZE) {
      toast.error("Ukuran file musik tidak boleh lebih dari 20MB!");
      return;
    }

    setUploading(true);
    const toastId = toast.loading("Uploading music and cover...");

    try {
      // 1. Upload music via Server Action
      const musicFormData = new FormData();
      musicFormData.append("file", musicFile);
      const musicResult = await uploadFile(musicFormData);
      
      if (!musicResult.success || !musicResult.publicUrl) {
        throw new Error(musicResult.error || "Gagal upload musik");
      }
      
      // 2. Upload cover via Server Action
      const coverFormData = new FormData();
      coverFormData.append("file", coverFile);
      const coverResult = await uploadFile(coverFormData);

      if (!coverResult.success || !coverResult.publicUrl) {
        throw new Error(coverResult.error || "Gagal upload cover");
      }

      // 3. Save to Firebase Realtime Database
      const songsRef = ref(db, "songs");
      const newSongRef = push(songsRef);
      
      const newSong: Omit<Song, 'id'> = {
        title: formData.title,
        artist: formData.artist,
        album: formData.album,
        songUrl: musicResult.publicUrl,
        coverUrl: coverResult.publicUrl,
        duration: 0,
        createdAt: Date.now(),
        uploadedBy: profile?.uid || "unknown",
        uploaderName: profile?.displayName || profile?.email?.split('@')[0] || "Unknown",
        playCount: 0,
      };

      await set(newSongRef, newSong);

      toast.success("Music berhasil diupload!", { id: toastId });
      setFormData({ title: "", artist: "", album: "" });
      setMusicFile(null);
      setCoverFile(null);
    } catch (error) {
      console.error(error);
      const errorMessage = error instanceof Error ? error.message : "Upload gagal";
      toast.error(errorMessage, { id: toastId });
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm("Yakin mau hapus lagu ini?")) {
      try {
        await remove(ref(db, `songs/${id}`));
        toast.success("Lagu berhasil dihapus");
      } catch (error) {
        toast.error("Gagal menghapus lagu");
      }
    }
  };

  if (authLoading || loading) {
    return (
      <MainLayout>
        <div className="flex-1 flex items-center justify-center">
          <Loader2 className="w-10 h-10 animate-spin text-primary" />
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <Header />
      <div className="px-6 py-4">
        <h1 className="text-3xl font-bold mb-8">Upload Your Music</h1>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
          {/* Upload Form */}
          <div className="bg-card/40 p-6 rounded-xl border border-white/5">
            <h2 className="text-xl font-bold mb-6 flex items-center gap-x-2">
              <UploadCloud size={24} className="text-primary" />
              New Song
            </h2>
            <form onSubmit={handleUpload} className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-bold text-text-muted uppercase">Title</label>
                <input 
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({...formData, title: e.target.value})}
                  className="w-full bg-black/40 border border-white/10 rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-primary/50 transition"
                  placeholder="Song title"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-bold text-text-muted uppercase">Artist</label>
                <input 
                  type="text"
                  value={formData.artist}
                  onChange={(e) => setFormData({...formData, artist: e.target.value})}
                  className="w-full bg-black/40 border border-white/10 rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-primary/50 transition"
                  placeholder="Artist name"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-bold text-text-muted uppercase">Album</label>
                <input 
                  type="text"
                  value={formData.album}
                  onChange={(e) => setFormData({...formData, album: e.target.value})}
                  className="w-full bg-black/40 border border-white/10 rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-primary/50 transition"
                  placeholder="Album name (optional)"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-text-muted uppercase">Music File (.mp3)</label>
                  <div className="relative border-2 border-dashed border-white/10 rounded-lg p-4 text-center hover:border-primary/50 transition cursor-pointer h-24 flex flex-col items-center justify-center">
                    <input 
                      type="file" 
                      accept="audio/mpeg" 
                      onChange={(e) => setMusicFile(e.target.files?.[0] || null)}
                      className="absolute inset-0 opacity-0 cursor-pointer"
                    />
                    <Music size={20} className={`mb-1 ${musicFile ? "text-primary" : "text-text-muted"}`} />
                    <span className="text-xs text-text-muted truncate max-w-full px-2">
                      {musicFile ? musicFile.name : "Select MP3"}
                    </span>
                  </div>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-text-muted uppercase">Cover Art</label>
                  <div className="relative border-2 border-dashed border-white/10 rounded-lg p-4 text-center hover:border-primary/50 transition cursor-pointer h-24 flex flex-col items-center justify-center">
                    <input 
                      type="file" 
                      accept="image/*" 
                      onChange={(e) => setCoverFile(e.target.files?.[0] || null)}
                      className="absolute inset-0 opacity-0 cursor-pointer"
                    />
                    <Plus size={20} className={`mb-1 ${coverFile ? "text-primary" : "text-text-muted"}`} />
                    <span className="text-xs text-text-muted truncate max-w-full px-2">
                      {coverFile ? coverFile.name : "Select Image"}
                    </span>
                  </div>
                </div>
              </div>

              <button 
                type="submit"
                disabled={uploading}
                className="w-full bg-primary text-black font-bold py-3 rounded-full mt-4 hover:scale-[1.02] transition active:scale-[0.98] disabled:opacity-50 disabled:scale-100 flex items-center justify-center gap-x-2"
              >
                {uploading ? (
                  <>
                    <Loader2 size={20} className="animate-spin" />
                    Uploading...
                  </>
                ) : (
                  "Upload Song"
                )}
              </button>
            </form>
          </div>

          {/* Your Songs List */}
          <div>
            <h2 className="text-xl font-bold mb-6 flex items-center gap-x-2">
              <Music size={24} className="text-primary" />
              Your Uploaded Songs
            </h2>
            <div className="space-y-3 max-h-[600px] overflow-y-auto pr-2 custom-scrollbar">
              {loading ? (
                <div className="flex justify-center py-10">
                  <Loader2 className="animate-spin text-primary" />
                </div>
              ) : songs.length === 0 ? (
                <div className="text-center py-10 bg-card/20 rounded-xl border border-white/5">
                  <Music size={40} className="mx-auto mb-2 opacity-20" />
                  <p className="text-text-muted">You haven&apos;t uploaded any songs yet.</p>
                </div>
              ) : (
                songs.map((song) => (
                  <div key={song.id} className="bg-card/30 p-3 rounded-lg flex items-center gap-x-4 border border-white/5 hover:border-white/10 transition group">
                    <img src={song.coverUrl} alt="" className="w-12 h-12 object-cover rounded shadow-lg" />
                    <div className="flex-1 min-w-0">
                      <h3 className="font-medium truncate">{song.title}</h3>
                      <p className="text-xs text-text-muted truncate">{song.artist} • {song.album || "Single"}</p>
                    </div>
                    <button 
                      onClick={() => handleDelete(song.id)}
                      className="p-2 text-text-muted hover:text-red-500 transition opacity-0 group-hover:opacity-100"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
      <div className="h-20" />
    </MainLayout>
  );
};

export default UploadPage;
