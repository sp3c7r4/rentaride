import { Navbar } from "@/components/landing/navbar";
import { Hero } from "@/components/landing/hero";
import { VehicleCategories } from "@/components/landing/vehicle-categories";
import { HowItWorks } from "@/components/landing/how-it-works";
import { Features } from "@/components/landing/features";
import { OwnerCta } from "@/components/landing/owner-cta";
import { Testimonials } from "@/components/landing/testimonials";
import { TrustBar } from "@/components/landing/trust-bar";
import { FinalCta } from "@/components/landing/final-cta";
import { Footer } from "@/components/landing/footer";

export default function Home() {
  return (
    <>
      <Navbar />
      <main>
        <Hero />
        <VehicleCategories />
        <HowItWorks />
        <Features />
        <OwnerCta />
        <Testimonials />
        <TrustBar />
        <FinalCta />
      </main>
      <Footer />
    </>
  );
}
