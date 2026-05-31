"use client";

import React from "react";
import { 
  Play, 
  Pause, 
  SkipBack, 
  SkipForward, 
  Repeat, 
  Shuffle, 
  Volume2,
  ListMusic,
  Heart
} from "lucide-react";
import { usePlayer } from "@/context/PlayerContext";
import { useAuth } from "@/context/AuthContext";
import { cn } from "@/lib/utils";

const Player = () => {
  const { 
    currentSong, 
    isPlaying, 
    togglePlay, 
    progress, 
    duration, 
    volume, 
    setVolume, 
    seek,
    isAutoplay,
    toggleAutoplay
  } = usePlayer();

  const { profile, toggleLike } = useAuth();

  if (!currentSong) return null;

  const formatTime = (time: number) => {
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, "0")}`;
  };

  const handleSeek = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const percentage = x / rect.width;
    seek(percentage * duration);
  };

  const handleVolumeChange = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const percentage = x / rect.width;
    setVolume(Math.max(0, Math.min(1, percentage)));
  };

  return (
    <div className="fixed bottom-0 left-0 right-0 h-[80px] md:h-[90px] bg-black border-t border-white/10 px-4 flex items-center justify-between z-50">
      {/* Current Song Info */}
      <div className="flex items-center gap-x-3 md:gap-x-4 w-[40%] md:w-[30%]">
        <img 
          src={currentSong.coverUrl} 
          alt={currentSong.title} 
          className="w-10 h-10 md:w-14 md:h-14 bg-card rounded-md flex-shrink-0 object-cover" 
        />
        <div className="flex flex-col truncate">
          <span className="text-xs md:text-sm font-medium hover:underline cursor-pointer truncate">
            {currentSong.title}
          </span>
          <span className="text-[10px] md:text-xs text-text-muted hover:underline cursor-pointer truncate">
            {currentSong.artist}
          </span>
        </div>
        <button 
          onClick={() => toggleLike(currentSong.id)}
          className="hover:scale-110 transition active:scale-90 ml-2"
        >
          <Heart 
            size={18} 
            className={cn(
              profile?.likedSongs?.[currentSong.id] ? "text-primary fill-primary" : "text-text-muted hover:text-white"
            )} 
          />
        </button>
      </div>

      {/* Controls */}
      <div className="flex flex-col items-center flex-1 md:max-w-[40%] w-full gap-y-1 md:gap-y-2">
        <div className="flex items-center gap-x-4 md:gap-x-6 text-text-muted">
          <button 
            onClick={toggleAutoplay}
            title="Autoplay Popular Songs"
            className={cn(
              "hidden md:block transition cursor-pointer hover:text-white",
              isAutoplay ? "text-primary" : "text-text-muted"
            )}
          >
            <Shuffle size={16} />
          </button>
          <SkipBack size={20} className="hover:text-white transition cursor-pointer fill-current" />
          <button 
            onClick={togglePlay}
            className="bg-white text-black p-1.5 md:p-2 rounded-full hover:scale-105 transition cursor-pointer"
          >
            {isPlaying ? <Pause size={22} fill="currentColor" /> : <Play size={22} fill="currentColor" />}
          </button>
          <SkipForward size={20} className="hover:text-white transition cursor-pointer fill-current" />
          <Repeat size={16} className="hidden md:block hover:text-white transition cursor-pointer" />
        </div>
        <div className="hidden md:flex items-center gap-x-2 w-full">
          <span className="text-[10px] text-text-muted w-10 text-right">{formatTime(progress)}</span>
          <div 
            className="h-1 flex-1 bg-white/10 rounded-full group cursor-pointer relative"
            onClick={handleSeek}
          >
            <div 
              className="absolute top-0 left-0 h-full bg-white group-hover:bg-primary rounded-full" 
              style={{ width: `${(progress / duration) * 100}%` }}
            />
          </div>
          <span className="text-[10px] text-text-muted w-10">{formatTime(duration || 0)}</span>
        </div>
      </div>

      {/* Volume/Misc */}
      <div className="hidden md:flex items-center justify-end gap-x-4 w-[30%]">
        <ListMusic size={18} className="text-text-muted hover:text-white cursor-pointer" />
        <div className="flex items-center gap-x-2 w-32">
          <Volume2 size={18} className="text-text-muted" />
          <div 
            className="h-1 flex-1 bg-white/10 rounded-full group cursor-pointer relative"
            onClick={handleVolumeChange}
          >
            <div 
              className="absolute top-0 left-0 h-full bg-white group-hover:bg-primary rounded-full" 
              style={{ width: `${volume * 100}%` }}
            />
          </div>
        </div>
      </div>
      
      {/* Mobile Progress Bar */}
      <div 
        className="absolute top-0 left-0 w-full h-[2px] bg-white/10 md:hidden"
        onClick={handleSeek}
      >
        <div 
          className="h-full bg-primary" 
          style={{ width: `${(progress / duration) * 100}%` }}
        />
      </div>
    </div>
  );
};

export default Player;
