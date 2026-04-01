"use client";

import { motion, AnimatePresence } from "motion/react";
import { useEffect, useState, useRef } from "react";
import { Terminal } from "lucide-react";

// Beautiful inline SVGs for the frameworks
const Icons: Record<string, any> = {
  nextjs: (p: any) => <svg viewBox="0 0 24 24" fill="currentColor" {...p}><path d="M12 22C6.477 22 2 17.523 2 12S6.477 2 12 2s10 4.477 10 10-4.477 10-10 10zm-1.89-6.31h1.373L16 9.471h-1.579l-2.031 4.545-2.03-4.545H8.78l4.133 8.356z"/></svg>,
  react: (p: any) => <svg viewBox="-11.5 -10.232 23 20.463" fill="currentColor" {...p}><circle cx="0" cy="0" r="2.05"/><g stroke="currentColor" strokeWidth="1" fill="none"><ellipse rx="11" ry="4.2"/><ellipse rx="11" ry="4.2" transform="rotate(60)"/><ellipse rx="11" ry="4.2" transform="rotate(120)"/></g></svg>,
  vue: (p: any) => <svg viewBox="0 0 24 24" fill="currentColor" {...p}><path d="M2 3h4.5l5.5 10 5.5-10H22L12 21 2 3zm4.5 0h4L12 5.5 13.5 3h4L12 11 6.5 3z"/></svg>,
  nuxt: (p: any) => <svg viewBox="0 0 24 24" fill="currentColor" {...p}><path d="M15.4 7L21 17H10L15.4 7zM9 11l4.5 8H4l5-8z"/></svg>,
  svelte: (p: any) => <svg viewBox="0 0 24 24" fill="currentColor" {...p}><path d="M8.5 2h7c3 0 5 2 5 5 0 2-1 4-3 4.5 1.5.5 3 2.5 3 5 0 3-2 5-5 5h-7c-3 0-5-2-5-5 0-2 1-4 3-4.5C5 8.5 3.5 6.5 3.5 4 3.5 1 5.5 2 8.5 2z"/></svg>,
  sveltekit: (p: any) => <svg viewBox="0 0 24 24" fill="currentColor" {...p}><path d="M8.5 2h7c3 0 5 2 5 5 0 2-1 4-3 4.5 1.5.5 3 2.5 3 5 0 3-2 5-5 5h-7c-3 0-5-2-5-5 0-2 1-4 3-4.5C5 8.5 3.5 6.5 3.5 4 3.5 1 5.5 2 8.5 2z"/></svg>,
  astro: (p: any) => <svg viewBox="0 0 24 24" fill="currentColor" {...p}><path d="M12 2L4 20h3.5l2-4h5l2 4H20L12 2z"/></svg>,
  vite: (p: any) => <svg viewBox="0 0 24 24" fill="currentColor" {...p}><path d="M22 2L13 13h5L8 22l4-9H7l7-11h8z"/></svg>,
  angular: (p: any) => <svg viewBox="0 0 24 24" fill="currentColor" {...p}><path d="M12 2L2 5.5 3.5 17c.5 3 3.5 5 8.5 7 5-2 8-4 8.5-7L22 5.5 12 2zm0 3.5L18 16h-2.5l-1.5-3.5h-4L8.5 16H6l6-10.5h0z"/></svg>,
  remix: (p: any) => <svg viewBox="0 0 24 24" fill="currentColor" {...p}><path d="M12 2c5.52 0 10 4.48 10 10s-4.48 10-10 10S2 17.52 2 12 6.48 2 12 2zm0 4a6 6 0 100 12 6 6 0 000-12zm0 2a4 4 0 110 8 4 4 0 010-8z" /></svg>,
  gatsby: (p: any) => <svg viewBox="0 0 24 24" fill="currentColor" {...p}><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm5.5 14H12v-2h3.5c-.5 1-1.5 1.5-3 1.5-2.5 0-4.5-2-4.5-4.5S10 6.5 12.5 6.5c1.5 0 2.5.5 3 1.5l1.5-1.5C16.5 5 14.5 4 12.5 4 8 4 4 8 4 12.5S8 21 12.5 21C16 21 18 19 18 16v-2h-5v2h4.5z"/></svg>,
  expo: (p: any) => <svg viewBox="0 0 24 24" fill="currentColor" {...p}><path d="M12 2L3 12l9 10 9-10L12 2zm0 4.5l5.5 6-5.5 6-5.5-6L12 6.5z"/></svg>,
  solid: (p: any) => <svg viewBox="0 0 24 24" fill="currentColor" {...p}><path d="M16.5 6h-9l-3 5.5h9l3-5.5zm0 6h-9l-3 5.5h9l3-5.5z" /></svg>,
  qwik: (p: any) => <svg viewBox="0 0 24 24" fill="currentColor" {...p}><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 14h-2l3-6H9l3-6h2l-3 6h3l-3 6z"/></svg>,
};

const FRAMEWORKS = [
  { id: "nextjs", name: "Next.js", color: "#ffffff", cmd: "npm run build" },
  { id: "react", name: "React", color: "#61dafb", cmd: "npm run build" },
  { id: "vue", name: "Vue", color: "#4fc08d", cmd: "npm run build" },
  { id: "nuxt", name: "Nuxt", color: "#00c58e", cmd: "npm run generate" },
  { id: "svelte", name: "Svelte", color: "#ff3e00", cmd: "npm run build" },
  { id: "sveltekit", name: "SvelteKit", color: "#ff3e00", cmd: "npm run build" },
  { id: "astro", name: "Astro", color: "#ff5a03", cmd: "npm run build" },
  { id: "vite", name: "Vite", color: "#646cff", cmd: "npm run build" },
  { id: "angular", name: "Angular", color: "#dd0031", cmd: "ng build" },
  { id: "remix", name: "Remix", color: "#319DFB", cmd: "npm run build" },
  { id: "gatsby", name: "Gatsby", color: "#663399", cmd: "npm run build" },
  { id: "expo", name: "Expo Web", color: "#c1c1c1", cmd: "npx expo export" },
  { id: "solid", name: "SolidJS", color: "#2c4f7c", cmd: "npm run build" },
  { id: "qwik", name: "Qwik", color: "#18b6f6", cmd: "npm run build" },
];

export function FrameworksAutoDetect() {
  const [activeIndex, setActiveIndex] = useState(0);
  const [isHovered, setIsHovered] = useState(false);
  const [logs, setLogs] = useState<{ text: string, type: 'info' | 'success' | 'cmd', special?: boolean }[]>([]);
  const timeoutRef = useRef<ReturnType<typeof setTimeout>[]>([]);
  
  // Spotlight effect
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const gridRef = useRef<HTMLDivElement>(null);

  const handleMouseMove = (e: React.MouseEvent) => {
    if (gridRef.current) {
      const rect = gridRef.current.getBoundingClientRect();
      setMousePos({
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      });
    }
  };

  const clearTimers = () => {
    timeoutRef.current.forEach(clearTimeout);
    timeoutRef.current = [];
  };

  const runDetectionSequence = (index: number) => {
    clearTimers();
    setActiveIndex(index);
    setLogs([]);
    
    timeoutRef.current.push(setTimeout(() => setLogs([{ text: "Analyzing repository structure...", type: 'info' }]), 150));
    timeoutRef.current.push(setTimeout(() => setLogs(p => [...p, { text: "Scanning for package.json...", type: 'info' }]), 550));
    timeoutRef.current.push(setTimeout(() => setLogs(p => [...p, { text: `Found configuration for ${FRAMEWORKS[index].name}.`, type: 'info' }]), 1000));
    timeoutRef.current.push(setTimeout(() => setLogs(p => [...p, { text: `Detected ${FRAMEWORKS[index].name} deployment.`, type: 'success', special: true }]), 1600));
    timeoutRef.current.push(setTimeout(() => setLogs(p => [...p, { text: `Assigning optimal build command`, type: 'info' }]), 2200));
    timeoutRef.current.push(setTimeout(() => setLogs(p => [...p, { text: FRAMEWORKS[index].cmd, type: 'cmd' }]), 2800));
  };

  useEffect(() => {
    if (!isHovered) {
      runDetectionSequence(activeIndex);
      const intervalId = setInterval(() => {
        const nextIndex = (activeIndex + 1) % FRAMEWORKS.length;
        runDetectionSequence(nextIndex);
      }, 5500);
      timeoutRef.current.push(intervalId as any);
      return () => {
         clearTimers();
         clearInterval(intervalId);
      };
    }
    return clearTimers;
  }, [activeIndex, isHovered]);

  const activeFw = FRAMEWORKS[activeIndex];

  return (
    <section className="w-full py-24 relative overflow-hidden border-b border-border/50 bg-[#050505]">
      
      {/* Immersive background glow */}
      <div 
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] rounded-full blur-[140px] opacity-10 pointer-events-none transition-colors duration-1000"
        style={{ backgroundColor: activeFw.color }}
      />
      
      <div className="container mx-auto px-6 max-w-6xl relative z-10">
        
        <div className="text-center mb-16">
          <h2 className="text-3xl tracking-tight font-bold mb-4 text-foreground">
            Zero Configuration. <span className="text-muted-foreground">We detect your stack.</span>
          </h2>
          <p className="text-muted-foreground max-w-xl mx-auto text-sm">
            Pushly automatically analyzes your repository, detects your framework natively, and configures the exact build mechanics. It just works.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          
          {/* Left: Terminal */}
          <div className="bg-[#0a0a0a] rounded-2xl border border-white/10 p-5 shadow-2xl h-[320px] flex flex-col relative group overflow-hidden">
            <div className="flex items-center gap-2 mb-6">
              <div className="w-3 h-3 rounded-full bg-red-500/80" />
              <div className="w-3 h-3 rounded-full bg-yellow-500/80" />
              <div className="w-3 h-3 rounded-full bg-green-500/80" />
              <span className="ml-auto text-[10px] font-mono font-bold text-muted-foreground uppercase flex items-center gap-2 tracking-widest">
                <Terminal size={12} /> Auto-Detect CLI
              </span>
            </div>

            <div className="flex-1 font-mono text-sm flex flex-col gap-3">
              <AnimatePresence>
                {logs.map((log, idx) => {
                   if (log.type === 'cmd') {
                     return (
                      <motion.div key={idx} initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="mt-4 p-4 bg-black/50 rounded-xl border border-white/5 relative overflow-hidden group/cmd">
                        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent -translate-x-full group-hover/cmd:translate-x-full transition-transform duration-1000" />
                        <div className="text-[10px] text-muted-foreground uppercase tracking-wider mb-2">Build Command</div>
                        <div className="flex justify-between items-center text-blue-400 font-bold">
                          <span>$ {log.text}</span>
                        </div>
                      </motion.div>
                     )
                   }
                   if (log.special) {
                     return (
                      <motion.div key={idx} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} className="flex items-center gap-2 text-white">
                        <span className="text-green-400">✓</span> 
                        Detected <strong style={{ color: activeFw.color }}>{activeFw.name}</strong>
                      </motion.div>
                     )
                   }
                   return (
                    <motion.div key={idx} initial={{ opacity: 0, x: -5 }} animate={{ opacity: 1, x: 0 }} className="text-muted-foreground/80 flex gap-2">
                       <span className="text-primary/70">❯</span> {log.text}
                    </motion.div>
                   )
                })}
              </AnimatePresence>
              
              <AnimatePresence>
                {logs.length > 0 && logs.length < 6 && (
                  <motion.div 
                    initial={{ opacity: 0 }} animate={{ opacity: [0, 1, 0] }} transition={{ repeat: Infinity, duration: 1 }} 
                    className="w-2 h-4 bg-muted ml-6"
                  />
                )}
              </AnimatePresence>
            </div>
          </div>

          {/* Right: Interactive Glow Grid */}
          <div 
            ref={gridRef}
            onMouseMove={handleMouseMove}
            onMouseLeave={() => setIsHovered(false)}
            onMouseEnter={() => setIsHovered(true)}
            className="grid grid-cols-4 sm:grid-cols-5 md:grid-cols-7 lg:grid-cols-5 gap-3 lg:gap-4 relative group/grid"
          >
            {/* Spotlight radial gradient following cursor */}
            <div 
              className="absolute pointer-events-none -inset-px rounded-xl opacity-0 transition-opacity duration-300 group-hover/grid:opacity-100 z-50 mix-blend-screen"
              style={{
                background: `radial-gradient(400px circle at ${mousePos.x}px ${mousePos.y}px, rgba(255,255,255,0.08), transparent 40%)`
              }}
            />

            {FRAMEWORKS.map((fw, i) => {
              const isActive = i === activeIndex && logs.length > 3; // Highlights immediately when 'detected' log fires
              const Icon = Icons[fw.id];
              return (
                <div 
                  key={fw.id}
                  onClick={() => runDetectionSequence(i)}
                  onMouseEnter={() => {
                     if (activeIndex !== i) {
                        runDetectionSequence(i);
                     }
                     setIsHovered(true);
                  }}
                  className="aspect-square relative rounded-xl border border-white/5 bg-white/[0.015] flex flex-col items-center justify-center transition-all duration-500 overflow-hidden cursor-crosshair group/card z-10"
                  style={{
                    borderColor: isActive ? fw.color : "rgba(255,255,255,0.05)",
                    backgroundColor: isActive ? `${fw.color}15` : "rgba(255,255,255,0.015)",
                    transform: isActive ? "scale(1.05)" : "scale(1)",
                    zIndex: isActive ? 40 : 10
                  }}
                >
                  {isActive && (
                    <motion.div layoutId="fw-glow" className="absolute inset-0 blur-[25px] opacity-40 pointer-events-none" style={{ backgroundColor: fw.color }} />
                  )}
                  
                  {/* Icon Render */}
                  <div 
                    className="w-6 h-6 md:w-8 md:h-8 mb-2 transition-all duration-300 drop-shadow-md z-10"
                    style={{ 
                      color: isActive ? fw.color : "rgba(255,255,255,0.3)",
                      filter: isActive ? `drop-shadow(0 0 10px ${fw.color}60)` : "none"
                    }}
                  >
                    {Icon ? <Icon /> : <span className="font-bold">{fw.name[0]}</span>}
                  </div>

                  <span className="text-[8px] md:text-[9px] font-mono opacity-80 uppercase tracking-widest text-center px-1 z-10 transition-colors"
                    style={{ color: isActive ? "#ffffff" : "rgba(255,255,255,0.3)" }}>
                    {fw.name}
                  </span>
                  
                  {/* Subtle hover inset border */}
                  <div className="absolute inset-0 border border-white/0 group-hover/card:border-white/10 rounded-xl transition-colors pointer-events-none" />
                </div>
              );
            })}
          </div>

        </div>
      </div>
    </section>
  );
}
