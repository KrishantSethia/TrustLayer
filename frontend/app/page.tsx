import LandingNav from "@/components/landing/nav";
import Hero from "@/components/landing/hero";
import Problem from "@/components/landing/problem";
import Stats from "@/components/landing/stats";
import HowItWorks from "@/components/landing/how-it-works";
import Features from "@/components/landing/features";
import ForEmployers from "@/components/landing/for-employers";
import ForFreelancers from "@/components/landing/for-freelancers";
import FAQ from "@/components/landing/faq";
import CTA from "@/components/landing/cta";
import Footer from "@/components/landing/footer";

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-white text-slate-900">
      <LandingNav />
      <Hero />
      <Problem />
      <Stats />
      <HowItWorks />
      <Features />
      <ForEmployers />
      <ForFreelancers />
      <FAQ />
      <CTA />
      <Footer />
    </div>
  );
}
