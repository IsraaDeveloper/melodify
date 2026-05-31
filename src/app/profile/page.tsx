"use client";

import React, { useState, useEffect } from "react";
import MainLayout from "@/components/MainLayout";
import Header from "@/components/Header";
import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";
import { ref, update } from "firebase/database";
import { db } from "@/lib/firebase";
import { Camera, Loader2, Save, User } from "lucide-react";
import { uploadFile } from "@/actions/upload";
import toast from "react-hot-toast";

const ProfileEditPage = () => {
  const { profile, loading: authLoading } = useAuth();
  const router = useRouter();
  const [displayName, setDisplayName] = useState("");
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && !profile) {
      router.push("/auth");
      return;
    }
    if (profile) {
      setDisplayName(profile.displayName || "");
      setPreviewUrl(profile.photoURL || null);
    }
  }, [profile, authLoading, router]);

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setPhotoFile(file);
      setPreviewUrl(URL.createObjectURL(file));
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) return;

    setIsSaving(true);
    const toastId = toast.loading("Updating profile...");

    try {
      let photoURL = profile.photoURL || "";

      if (photoFile) {
        const formData = new FormData();
        formData.append("file", photoFile);
        const result = await uploadFile(formData);
        if (result.success && result.publicUrl) {
          photoURL = result.publicUrl;
        } else {
          throw new Error(result.error || "Failed to upload photo");
        }
      }

      const updates: any = {
        displayName: displayName,
        photoURL: photoURL,
      };

      await update(ref(db, `users/${profile.uid}`), updates);
      toast.success("Profile updated successfully!", { id: toastId });
    } catch (error: any) {
      toast.error(error.message || "Failed to update profile", { id: toastId });
    } finally {
      setIsSaving(false);
    }
  };

  if (authLoading) return null;

  return (
    <MainLayout>
      <Header />
      <div className="px-6 py-10 max-w-2xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">Edit Profile</h1>
        
        <form onSubmit={handleSave} className="space-y-8 bg-card/40 p-8 rounded-2xl border border-white/5">
          <div className="flex flex-col items-center gap-y-4">
            <div className="relative group">
              <div className="w-32 h-32 rounded-full overflow-hidden bg-neutral-800 border-4 border-white/5 shadow-2xl">
                {previewUrl ? (
                  <img src={previewUrl} alt="Preview" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-text-muted">
                    <User size={64} />
                  </div>
                )}
              </div>
              <label className="absolute inset-0 flex items-center justify-center bg-black/60 rounded-full opacity-0 group-hover:opacity-100 transition cursor-pointer">
                <Camera size={32} className="text-white" />
                <input type="file" accept="image/*" onChange={handlePhotoChange} className="hidden" />
              </label>
            </div>
            <p className="text-sm text-text-muted">Click to change profile picture</p>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-bold text-text-muted uppercase tracking-wider">Display Name</label>
            <input 
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="Your name"
              className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-primary/50 transition"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-bold text-text-muted uppercase tracking-wider">Email Address</label>
            <input 
              type="email"
              value={profile?.email || ""}
              disabled
              className="w-full bg-white/5 border border-white/5 rounded-xl px-4 py-3 text-text-muted cursor-not-allowed"
            />
            <p className="text-xs text-text-muted">Email cannot be changed.</p>
          </div>

          <button 
            type="submit"
            disabled={isSaving}
            className="w-full bg-primary text-black font-bold py-4 rounded-full hover:scale-[1.02] transition active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-x-2"
          >
            {isSaving ? <Loader2 className="animate-spin" /> : <Save size={20} />}
            Save Changes
          </button>
        </form>
      </div>
    </MainLayout>
  );
};

export default ProfileEditPage;