"use client";

import { useState, useEffect } from "react";
import Navigation from "@/components/navigation";
import RecordingInterface from "./(root)/record-screen/components/recording-interface";
import RecordingLibrary from "./(root)/record-screen/components/recording-library";

type View = "record" | "library";

const Page = () => {
  const [currentView, setCurrentView] = useState<View>("record");
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
        <Navigation
          currentView={currentView}
          onViewChange={setCurrentView}
          isDark={isDark}
          onThemeToggle={setIsDark}
        />

        {currentView === "record" ? (
          <RecordingInterface />
        ) : (
          <RecordingLibrary />
        )}
      </div>
    </div>
  );
};

export default Page;









































































// "use client";
// import { authClient } from "@/lib/auth-client";
// import { useRouter } from "next/navigation";
// import { useState } from "react";

// export default function Home() {
//   const [loading, setLoading] = useState(false);
//   const [error, setError] = useState("");
//   const router = useRouter();
//   const handleGoogleSignIn = async () => {
//     setLoading(true);
//     setError("");

//     try {
//       const { error } = await authClient.signIn.social(
//         {
//           provider: "google",
//           callbackURL: "/record-screen",
//         },
//         {
//           onRequest: () => setLoading(true),
//           onSuccess: () => router.push("/record-screen"),
//           onError: (ctx) => setError(ctx.error.message || "Sign in failed"),
//         }
//       );

//       if (error) {
//         setError(error.message || "Sign in failed");
//       }
//     } catch {
//       setError("An unexpected error occurred");
//     } finally {
//       setLoading(false);
//     }
//   };
//   return (
//     <div
//       className="min-h-screen flex items-center justify-center p-4"
//       style={{
//         backgroundImage: "url('/images/gradient-background.jpg')",
//         backgroundSize: "cover",
//         backgroundPosition: "center",
//         backgroundRepeat: "no-repeat",
//       }}
//     >
//       <div
//         className="absolute inset-0 opacity-0"
//         style={{
//           background: "rgba(0, 0, 0, 0.15)",
//         }}
//       ></div>

//       {/* Floating glass orbs for visual interest */}
//       <div className="absolute inset-0 overflow-hidden pointer-events-none">
//         <div
//           className="absolute top-1/4 left-1/4 w-32 h-32 rounded-full opacity-50 animate-pulse"
//           style={{
//             background: "rgba(255, 255, 255, 0.15)",
//             backdropFilter: "blur(20px) saturate(180%)",
//             border: "2px solid rgba(255, 255, 255, 0.3)",
//             boxShadow:
//               "0 8px 32px rgba(255, 255, 255, 0.2), inset 0 1px 0 rgba(255, 255, 255, 0.4)",
//           }}
//         ></div>
//         <div
//           className="absolute top-3/4 right-1/4 w-24 h-24 rounded-full opacity-40 animate-pulse delay-1000"
//           style={{
//             background: "rgba(255, 255, 255, 0.15)",
//             backdropFilter: "blur(20px) saturate(180%)",
//             border: "2px solid rgba(255, 255, 255, 0.3)",
//             boxShadow:
//               "0 8px 32px rgba(255, 255, 255, 0.2), inset 0 1px 0 rgba(255, 255, 255, 0.4)",
//           }}
//         ></div>
//         <div
//           className="absolute top-1/2 right-1/3 w-16 h-16 rounded-full opacity-45 animate-pulse delay-500"
//           style={{
//             background: "rgba(255, 255, 255, 0.15)",
//             backdropFilter: "blur(20px) saturate(180%)",
//             border: "2px solid rgba(255, 255, 255, 0.3)",
//             boxShadow:
//               "0 8px 32px rgba(255, 255, 255, 0.2), inset 0 1px 0 rgba(255, 255, 255, 0.4)",
//           }}
//         ></div>
//       </div>

//       <div className="border-4 w-76 h-50 flex items-center justify-center p-6 rounded-2xl glass-effect relative z-10">
//         <button
//           onClick={handleGoogleSignIn}
//           disabled={loading}
//           className="md:w-75 glass-effect border-white/30 hover-lift ripple-effect text-[#1e1e1e] hover:bg-white/20 font-sans transition-all duration-300 py-2 px-2 cursor-pointer rounded-lg flex items-center justify-center"
//         >
//           <div className="flex items-center justify-center">
//             <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
//               <path
//                 fill="#4285F4"
//                 d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
//               />
//               <path
//                 fill="#34A853"
//                 d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
//               />
//               <path
//                 fill="#FBBC05"
//                 d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
//               />
//               <path
//                 fill="#EA4335"
//                 d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
//               />
//             </svg>
//             Continue with Google
//           </div>
//         </button>
//       </div>
//     </div>
//   );
// }
