import { Navbar } from "@/components/sections/navbar";
import { Hero } from "@/components/sections/hero";
import { Philosophy } from "@/components/sections/philosophy";
import { Departments } from "@/components/sections/departments";
import { Footer } from "@/components/sections/footer";

export default function Home() {
  return (
    <main className="min-h-screen">
      <Navbar />
      <Hero />
      <Philosophy />
      <Departments />
      <Footer />
    </main>
  );
}
