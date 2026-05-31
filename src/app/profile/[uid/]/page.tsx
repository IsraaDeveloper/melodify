"use client";

import React, { useState, useEffect } from "react";
import MainLayout from "@/components/MainLayout";
import Header from "@/components/Header";
import { useParams, useRouter } from "next/navigation";
import { ref, onValue } from "firebase/database";
import { db } from "@/lib/firebase";
import { UserProfile, Playlist } from "@/types";
import { Music, User as UserIcon } from "lucide-react";

const UserProfilePage = () => {
  const params = useParams();
  const router = useRouter();
  const [targetUser, setTargetUser] = useState<UserProfile | null>(null);
  const [userPlaylists, setUserPlaylists] = useState<Playlist[]>([]);
  const [loading, setLoading] = useState(true);

  const uid = params?.uid as string;

  useEffect(() => {
    if (!uid) return;

    const userRef = ref(db, `users/${uid}`);
    const playlistsRef = ref(db, "playlists");

    onValue(userRef, (snapshot) => {
      if (snapshot.exists()) {
        setTargetUser(snapshot.val());
        
        onValue(playlistsRef, (pSnapshot) => {
          const allPlaylists = pSnapshot.val();
          if (allPlaylists) {
            const list = Object.keys(allPlaylists)
              .map(id => ({ id, ...allPlaylists[id] }))
              .filter(p => p.ownerId === uid && p.isPublic);
            setUserPlaylists(list);
          }
          setLoading(false);
        });
      } else {
        setLoading(false);
      }
    });
  }, [uid]);

  if (loading) return null;
  if (!targetUser) return (
    <MainLayout>
      <Header />
      <div className="flex-1 flex items-center justify-center text-text-muted">
        User not found
      </div>
    </MainLayout>
  );

  return (
    <MainLayout>
      <Header />
      <div className="px-6 py-8">
        <div className="flex flex-col md:flex-row items-center gap-x-8 mb-12">
          <div className="w-40 h-40 md:w-52 md:h-52 rounded-full overflow-hidden bg-neutral-800 shadow-2xl flex-shrink-0">
            {targetUser.photoURL ? (
              <img src={targetUser.photoURL} alt="" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-text-muted">
                <UserIcon size={80} />
              </div>
            )}
          </div>
          <div className="flex flex-col gap-y-2 text-center md:text-left mt-4 md:mt-0">
            <span className="text-xs font-bold uppercase tracking-widest text-text-muted">Profile</span>
            <h1 className="text-4xl md:text-7xl font-bold">{targetUser.displayName || targetUser.email?.split('@')[0]}</h1>
            <p className="text-text-muted font-medium">{userPlaylists.length} Public Playlists</p>
          </div>
        </div>

        <div>
          <h2 className="text-2xl font-bold mb-6">Public Playlists</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-6">
            {userPlaylists.map((p) => (
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
                <span className="font-bold block truncate w-full mb-1">{p.name}</span>
              </div>
            ))}

            {userPlaylists.length === 0 && (
              <div className="col-span-full py-10 text-center text-text-muted bg-white/5 rounded-xl border border-white/5">
                <p>No public playlists found.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </MainLayout>
  );
};

export default UserProfilePage;