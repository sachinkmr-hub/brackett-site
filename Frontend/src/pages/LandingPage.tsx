import React from 'react';
import { Navigation } from '../components/Navigation';
import { Hero } from '../components/Hero';
import { ProblemSection } from '../components/ProblemSection';
import { HowItWorks } from '../components/HowItWorks';
import { ProductPreview } from '../components/ProductPreview';
import { SocialProof } from '../components/SocialProof';
import { PricingSection } from '../components/PricingSection';
import { LegalSection } from '../components/LegalSection';
import { Footer } from '../components/Footer';

import Lenis from 'lenis';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

export const LandingPage: React.FC = () => {
  React.useEffect(() => {
    const lenisInstance = new Lenis({
      duration: 1.2,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      autoRaf: false,
    });

    (window as any).lenis = lenisInstance;

    lenisInstance.on('scroll', ScrollTrigger.update);
    const tick = (time: number) => {
      lenisInstance.raf(time * 1000);
    };
    gsap.ticker.add(tick);
    gsap.ticker.lagSmoothing(0);

    return () => {
      gsap.ticker.remove(tick);
      lenisInstance.destroy();
      delete (window as any).lenis;
    };
  }, []);

  return (
    <div className="min-h-screen bg-bg-main selection:bg-tile-accent selection:text-white relative editorial-bg" id="brackett-landing-canvas">
      {/* 1. Sticky Navbar */}
      <Navigation />

      {/* Main content body stacked linearly */}
      <main id="brackett-main-content">
        {/* 2. Hero Section */}
        <Hero />

        {/* 3. Section 2: How-it-works standard cards layout ('How brackett works') */}
        <HowItWorks />

        {/* 4. Section 3: Problem Section ('The problem we're built for') */}
        <ProblemSection />

        {/* 5. Section 4: Product interface preview dashboard and corner captions  */}
        <ProductPreview />

        {/* 6. Section 5: Social proof trust logo wall and testimonials */}
        <SocialProof />

        {/* 7. Section 6: Pricing standard tiered blocks ('Start small') */}
        <PricingSection />

        {/* 8. Public launch policy surface */}
        <LegalSection />
      </main>

      {/* 9. Footer block containing wordmark and copyright anchors */}
      <Footer />
    </div>
  );
};
