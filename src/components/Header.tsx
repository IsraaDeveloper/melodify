"use client";

import React, { useState, useRef, useEffect } from "react";
import { ChevronLeft, ChevronRight, User, Menu, LogOut, Upload, Library, History, UserCircle, ChevronDown } from "lucide-react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import { cn } from "@/lib/utils";

interface HeaderProps {
  className?: string;
  onMenuClick?: () => void;
}

const Header = ({ className, onMenuClick }: HeaderProps) => {
  const router = useRouter();
  const { profile, logout } = useAuth();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const menuItems = [
    { label: "Upload Music", icon: Upload, href: "/upload" },
    { label: "My Library", icon: Library, href: "/playlist/liked" },
    { label: "History", icon: History, href: "/history" },
    { label: "Edit Profile", icon: UserCircle, href: "/profile" },
  ];

  return (
    <header className={cn("h-16 flex items-center justify-between px-4 md:px-6 sticky top-0 bg-black/50 backdrop-blur-md z-40", className)}>
      <div className="flex items-center gap-x-2">
        <button 
          onClick={onMenuClick}
          className="md:hidden bg-black/40 rounded-full p-1.5 hover:bg-black/60 transition mr-2"
        >
          <Menu size={24} />
        </button>
        <div className="hidden md:flex items-center gap-x-2">
          <button 
            onClick={() => router.back()}
            className="bg-black/40 rounded-full p-1.5 hover:bg-black/60 transition"
          >
            <ChevronLeft size={24} />
          </button>
          <button 
            onClick={() => router.forward()}
            className="bg-black/40 rounded-full p-1.5 hover:bg-black/60 transition"
          >
            <ChevronRight size={24} />
          </button>
        </div>
      </div>

      <div className="flex items-center gap-x-4">
        {profile ? (
          <div className="relative" ref={dropdownRef}>
            <button
              onClick={() => setIsDropdownOpen(!isDropdownOpen)}
              className="bg-black/60 p-1 rounded-full flex items-center gap-x-2 pr-3 cursor-pointer hover:bg-card-hover transition border border-white/5"
            >
              {profile.photoURL ? (
                <img src={profile.photoURL} alt="User" className="w-7 h-7 rounded-full object-cover" />
              ) : (
                <div className="bg-neutral-800 p-1 rounded-full">
                  <User size={18} />
                </div>
              )}
              <span className="text-sm font-medium truncate max-w-[80px] md:max-w-[120px]">
                {profile.displayName || profile.email?.split('@')[0]}
              </span>
              <ChevronDown size={16} className={cn("transition-transform", isDropdownOpen && "rotate-180")} />
            </button>

            {isDropdownOpen && (
              <div className="absolute right-0 mt-2 w-52 bg-card border border-white/10 rounded-md shadow-2xl py-1 z-50 overflow-hidden animate-in fade-in zoom-in duration-200">
                {menuItems.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setIsDropdownOpen(false)}
                    className="flex items-center gap-x-3 px-4 py-3 text-sm text-text-muted hover:text-white hover:bg-white/10 transition"
                  >
                    <item.icon size={18} />
                    {item.label}
                  </Link>
                ))}
                <div className="h-[1px] bg-white/10 my-1" />
                <button
                  onClick={() => {
                    logout();
                    setIsDropdownOpen(false);
                  }}
                  className="w-full flex items-center gap-x-3 px-4 py-3 text-sm text-red-500 hover:bg-red-500/10 transition"
                >
                  <LogOut size={18} />
                  Log out
                </button>
              </div>
            )}
          </div>
        ) : (
          <div className="flex items-center gap-x-4 md:gap-x-8">
            <Link 
              href="/auth"
              className="text-text-muted text-sm md:text-base font-bold hover:scale-105 hover:text-white transition"
            >
              Sign up
            </Link>
            <Link 
              href="/auth"
              className="bg-white text-black px-4 md:px-8 py-2 md:py-3 rounded-full text-sm md:text-base font-bold hover:scale-105 transition active:scale-95"
            >
              Log in
            </Link>
          </div>
        )}
      </div>
    </header>
  );
};

export default Header;
