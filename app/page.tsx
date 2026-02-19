import { SiteHeader } from "@/components/landing/site-header";
import { Hero } from "@/components/landing/hero";
import { Features } from "@/components/landing/features";
import { PublishSection } from "@/components/landing/publish-section";
import { Faq } from "@/components/landing/faq";
import { Footer } from "@/components/landing/footer";
import { SmoothScrollProvider } from "@/providers/smooth-scroll-provider";

export default function LandingPage() {
  return (
    <SmoothScrollProvider>
      <div className="relative min-h-screen flex flex-col font-sans selection:bg-blue-500/30">
        <SiteHeader />
        <main className="flex-1">
          <Hero />
          <Features />
          <PublishSection />
          <Faq />
        </main>
        <Footer />
      </div>
    </SmoothScrollProvider>
  );
}
