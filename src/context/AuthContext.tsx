"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { 
  onAuthStateChanged, 
  User, 
  signInWithPopup, 
  GoogleAuthProvider, 
  signOut
} from "firebase/auth";
import { ref, set, onValue } from "firebase/database";
import { auth, db } from "@/lib/firebase";
import { UserProfile } from "@/types";

interface AuthContextType {
  user: User | null;
  profile: UserProfile | null;
  loading: boolean;
  loginWithGoogle: () => Promise<void>;
  logout: () => Promise<void>;
  toggleLike: (songId: string) => Promise<void>;
  createPlaylist: (name: string) => Promise<string>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchProfile = (uid: string) => {
    const userRef = ref(db, `users/${uid}`);
    
    // Use onValue for real-time profile updates (including likes)
    const unsubscribe = onValue(userRef, async (snapshot) => {
      if (snapshot.exists()) {
        setProfile(snapshot.val() as UserProfile);
      } else {
        const newProfile: UserProfile = {
          uid,
          email: auth.currentUser?.email || null,
          displayName: auth.currentUser?.displayName || null,
          photoURL: auth.currentUser?.photoURL || null,
          role: 'user',
        };
        await set(userRef, newProfile);
        setProfile(newProfile);
      }
    });

    return unsubscribe;
  };

  useEffect(() => {
    let unsubscribeProfile: (() => void) | undefined;

    const unsubscribeAuth = onAuthStateChanged(auth, async (user) => {
      setUser(user);
      if (user) {
        unsubscribeProfile = fetchProfile(user.uid);
      } else {
        if (unsubscribeProfile) unsubscribeProfile();
        setProfile(null);
      }
      setLoading(false);
    });

    return () => {
      unsubscribeAuth();
      if (unsubscribeProfile) unsubscribeProfile();
    };
  }, []);

  const loginWithGoogle = async () => {
    const provider = new GoogleAuthProvider();
    try {
      await signInWithPopup(auth, provider);
    } catch (error) {
      console.error("Login failed:", error);
      throw error;
    }
  };

  const logout = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error("Logout failed:", error);
    }
  };

  const createPlaylist = async (name: string): Promise<string> => {
    if (!user || !profile) throw new Error("Unauthorized");
    
    const { push, ref: dbRef } = await import("firebase/database");
    const playlistsRef = dbRef(db, "playlists");
    const newPlaylistRef = push(playlistsRef);
    const playlistId = newPlaylistRef.key as string;

    const newPlaylist = {
      id: playlistId,
      name,
      ownerId: user.uid,
      ownerName: profile.displayName || profile.email || "User",
      createdAt: Date.now(),
      isPublic: true,
    };

    await set(newPlaylistRef, newPlaylist);
    
    // Add to user's playlists list
    await set(dbRef(db, `users/${user.uid}/playlists/${playlistId}`), true);
    
    return playlistId;
  };

  const toggleLike = async (songId: string) => {
    if (!user || !profile) return;
    
    const isLiked = profile.likedSongs?.[songId];
    const likeRef = ref(db, `users/${user.uid}/likedSongs/${songId}`);
    
    try {
      if (isLiked) {
        await set(likeRef, null); // Remove like
      } else {
        await set(likeRef, true); // Add like
      }
    } catch (error) {
      console.error("Error toggling like:", error);
    }
  };

  const value = {
    user,
    profile,
    loading,
    loginWithGoogle,
    logout,
    toggleLike,
    createPlaylist,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
