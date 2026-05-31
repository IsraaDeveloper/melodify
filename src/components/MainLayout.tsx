"use client";

import React, { useState } from "react";
import Sidebar from "@/components/Sidebar";
import Player from "@/components/Player";

const MainLayout = ({ children }: { children: React.ReactNode }) => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  return (
    <div className="flex h-screen bg-black overflow-hidden relative">
      <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />
      
      {/* Overlay for mobile sidebar */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/60 z-[90] md:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      <main className="flex-1 h-full overflow-y-auto relative custom-scrollbar">
        {/* Pass menu toggle to children or wrap children with it */}
        {React.Children.map(children, child => {
          if (React.isValidElement(child) && 
              typeof child.type !== 'string' && 
              'name' in child.type && 
              child.type.name === 'Header') {
            return React.cloneElement(child as React.ReactElement<{ onMenuClick?: () => void }>, { 
              onMenuClick: () => setIsSidebarOpen(true) 
            });
          }
          return child;
        })}
      </main>
      <Player />
    </div>
  );
};

export default MainLayout;
