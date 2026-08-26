import { Navbar }     from "@/components/landing/navbar";
import { Hero }       from "@/components/landing/hero";
import { About }      from "@/components/landing/about";
import { HowItWorks } from "@/components/landing/how-it-works";
import { Templates }  from "@/components/landing/templates";
import { Pricing }    from "@/components/landing/pricing";
import { Contact }    from "@/components/landing/contact";
import { Footer }     from "@/components/landing/footer";

export default function LandingPage() {
  return (
    <>
      <Navbar />
      <main id="main-content">
        <Hero />
        <About />
        <HowItWorks />
        <Templates />
        <Pricing />
        <Contact />
      </main>
      <Footer />
    </>
  );
}
