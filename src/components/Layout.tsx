import React from "react";
import { Target, Settings } from "lucide-react";
import { cn } from "@/src/lib/utils";

interface LayoutProps {
  children: React.ReactNode;
  activeTab: string;
  onTabChange: (tab: string) => void;
}

export default function Layout({ children, activeTab, onTabChange }: LayoutProps) {
  const tabs = [
    { id: "planner", icon: Target,   label: "Progression Planner" },
    { id: "acquisition", icon: Target, label: "Acquisition Planner" },
    { id: "sync",    icon: Settings, label: "Data Fetch & Sync"   },
  ];

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      {/* Sidebar */}
      <nav className="w-16 md:w-60 border-r border-surface-accent flex flex-col bg-surface z-50">
        <div className="p-4 flex items-center gap-3 border-b border-surface-accent">
          <div className="w-9 h-9 bg-brand-primary rounded-lg flex items-center justify-center shadow-[0_0_15px_rgba(255,77,0,0.4)] flex-shrink-0">
            <Target className="text-white" size={20} />
          </div>
          <div className="hidden md:block">
            <div className="font-display text-sm font-bold tracking-tight text-white">GPIP</div>
            <div className="text-[10px] text-brand-primary font-mono">Offline · v3.0</div>
          </div>
        </div>

        <div className="flex-1 mt-4 px-2 space-y-1">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={cn(
                "w-full flex items-center gap-3 px-3 py-3 rounded-xl transition-all duration-200",
                activeTab === tab.id
                  ? "bg-brand-primary/10 text-brand-primary border border-brand-primary/20"
                  : "text-zinc-500 hover:bg-surface-accent hover:text-zinc-200 border border-transparent"
              )}
            >
              <tab.icon size={18} />
              <span className="hidden md:block font-medium text-sm">{tab.label}</span>
            </button>
          ))}
        </div>

        <div className="p-3 border-t border-surface-accent">
          <div className="hidden md:block p-2 rounded-lg bg-zinc-900 border border-zinc-800 text-center">
            <div className="text-[9px] font-mono text-zinc-600">Genshin Impact</div>
            <div className="text-[9px] font-mono text-zinc-600">Progression Intelligence Platform</div>
          </div>
        </div>
      </nav>

      {/* Main */}
      <main className="flex-1 overflow-y-auto">
        <header className="sticky top-0 h-14 border-b border-surface-accent bg-background/80 backdrop-blur-md z-40 px-6 flex items-center justify-between">
          <span className="text-zinc-500 text-xs font-mono tracking-widest uppercase">
            {tabs.find(t => t.id === activeTab)?.label}
          </span>
          <div className="flex items-center gap-2 px-3 py-1 bg-surface rounded-full border border-surface-accent">
            <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
            <span className="text-[10px] font-mono text-green-400 uppercase">Offline Ready</span>
          </div>
        </header>
        <div className="p-4 md:p-6">
          {children}
        </div>
      </main>
    </div>
  );
}
