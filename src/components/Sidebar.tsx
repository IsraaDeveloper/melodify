import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Home, Search, Heart, Settings, X, Plus, Music, History } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/context/AuthContext";
import { ref, onValue } from "firebase/database";
import { db } from "@/lib/firebase";
import { Playlist } from "@/types";
import toast from "react-hot-toast";

interface SidebarProps {
  isOpen?: boolean;
  onClose?: () => void;
}

const Sidebar = ({ isOpen, onClose }: SidebarProps) => {
  const pathname = usePathname();
  const router = useRouter();
  const { profile, createPlaylist } = useAuth();
  const [userPlaylists, setUserPlaylists] = useState<Playlist[]>([]);

  useEffect(() => {
    if (!profile?.uid) {
      setUserPlaylists([]);
      return;
    }

    const playlistsRef = ref(db, "playlists");
    const unsubscribe = onValue(playlistsRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const list = Object.keys(data)
          .map(key => ({ id: key, ...data[key] }))
          .filter(p => p.ownerId === profile.uid);
        setUserPlaylists(list.sort((a, b) => b.createdAt - a.createdAt));
      } else {
        setUserPlaylists([]);
      }
    });

    return () => unsubscribe();
  }, [profile?.uid]);

  const handleCreatePlaylist = async () => {
    if (!profile) {
      toast.error("Please login to create a playlist");
      return;
    }

    try {
      const name = `My Playlist #${userPlaylists.length + 1}`;
      const id = await createPlaylist(name);
      toast.success("Playlist created!");
      router.push(`/playlist/${id}`);
      if (onClose) onClose();
    } catch (error) {
      toast.error("Failed to create playlist");
    }
  };

  const routes = [
    {
      label: "Home",
      icon: Home,
      href: "/",
      active: pathname === "/",
    },
    {
      label: "Search",
      icon: Search,
      href: "/search",
      active: pathname === "/search",
    },
    {
      label: "History",
      icon: History,
      href: "/history",
      active: pathname === "/history",
    },
  ];

  return (
    <div className={cn(
      "flex flex-col h-full w-[240px] bg-black p-4 gap-y-4 fixed md:relative z-[100] transition-transform duration-300",
      isOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
    )}>
      <div className="flex items-center justify-between px-2 mb-6">
        <Link href="/" className="flex items-center gap-x-2">
          <div className="bg-primary p-1.5 rounded-full">
            <div className="w-6 h-6 bg-black rounded-full flex items-center justify-center">
              <div className="w-3 h-3 bg-primary rotate-45" />
            </div>
          </div>
          <span className="font-bold text-xl tracking-tight text-white">Melodify</span>
        </Link>
        <button onClick={onClose} className="md:hidden text-text-muted hover:text-white">
          <X size={24} />
        </button>
      </div>

      <div className="flex flex-col gap-y-2">
        {routes.map((route) => (
          <Link
            key={route.href}
            href={route.href}
            onClick={onClose}
            className={cn(
              "flex items-center gap-x-4 px-3 py-3 text-sm font-medium rounded-lg transition-all duration-200",
              route.active 
                ? "bg-card text-white" 
                : "text-text-muted hover:text-white hover:bg-card/50"
            )}
          >
            <route.icon size={22} />
            {route.label}
          </Link>
        ))}
      </div>

      <div className="mt-4 flex-1 flex flex-col min-h-0">
        <div className="flex items-center justify-between px-3 mb-2">
          <p className="text-xs font-semibold text-text-muted uppercase tracking-wider">
            Your Library
          </p>
          <button 
            onClick={handleCreatePlaylist}
            className="text-text-muted hover:text-white transition"
            title="Create Playlist"
          >
            <Plus size={20} />
          </button>
        </div>
        
        <div className="flex flex-col gap-y-1 overflow-y-auto custom-scrollbar pr-1">
          <Link
            href="/playlist/liked"
            onClick={onClose}
            className={cn(
              "flex items-center gap-x-4 px-3 py-2 text-sm font-medium rounded-lg transition-all duration-200",
              pathname === "/playlist/liked" 
                ? "bg-card text-white" 
                : "text-text-muted hover:text-white hover:bg-card/50"
            )}
          >
            <div className="w-8 h-8 bg-gradient-to-br from-indigo-700 to-purple-400 rounded flex items-center justify-center">
              <Heart size={16} fill="white" className="text-white" />
            </div>
            Liked Songs
          </Link>

          {userPlaylists.map((playlist) => (
            <Link
              key={playlist.id}
              href={`/playlist/${playlist.id}`}
              onClick={onClose}
              className={cn(
                "flex items-center gap-x-4 px-3 py-2 text-sm font-medium rounded-lg transition-all duration-200",
                pathname === `/playlist/${playlist.id}`
                  ? "bg-card text-white" 
                  : "text-text-muted hover:text-white hover:bg-card/50"
              )}
            >
              <div className="w-8 h-8 bg-neutral-800 rounded flex items-center justify-center overflow-hidden flex-shrink-0">
                {playlist.iconUrl ? (
                  <img src={playlist.iconUrl} alt="" className="w-full h-full object-cover" />
                ) : (
                  <Music size={16} className="text-text-muted" />
                )}
              </div>
              <span className="truncate">{playlist.name}</span>
            </Link>
          ))}
        </div>
      </div>

      <div className="mt-auto pt-4 border-t border-white/5">
        <Link
          href="/upload"
          onClick={onClose}
          className={cn(
            "flex items-center gap-x-4 px-3 py-3 text-sm font-medium rounded-lg transition-all duration-200",
            pathname === "/upload" 
              ? "bg-card text-white" 
              : "text-text-muted hover:text-white hover:bg-card/50"
          )}
        >
          <Settings size={22} />
          Upload Music
        </Link>
      </div>
    </div>
  );
};

export default Sidebar;
