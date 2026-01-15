"use client";

import { useState, useEffect } from "react";
import RecordingInterface from "./(root)/record-screen/components/recording-interface";


const Page = () => {

  const [isDark, setIsDark] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true)
    // Check system preference on mount
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches
    setIsDark(prefersDark)
  }, [])

  if (!mounted) return null
  return (
    <div className={isDark ? "dark" : ""}>
      <div className="min-h-screen bg-background text-foreground transition-colors duration-200">

        <RecordingInterface />

      </div>
    </div>
  );
};

export default Page;

