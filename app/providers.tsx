"use client";
import { ReactNode } from "react";
import { MotionConfig } from "motion/react";
import { ThemeProvider } from "@/components/theme-provider";
import { AuthProvider } from "@/contexts/AuthContext";
import { PageMorphProvider } from "@/components/page-morph";

export default function Providers({ children }: { children: ReactNode }) {
  return (
    <ThemeProvider
      attribute="class"
      forcedTheme="dark"
      disableTransitionOnChange
    >
      <AuthProvider>
        {/* Springs default to critically damped; transforms are dropped for reduced-motion users */}
        <MotionConfig reducedMotion="user" transition={{ type: "spring", bounce: 0, duration: 0.4 }}>
          <PageMorphProvider>{children}</PageMorphProvider>
        </MotionConfig>
      </AuthProvider>
    </ThemeProvider>
  );
}


