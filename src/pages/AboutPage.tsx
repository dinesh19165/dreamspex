import Navbar from '../components/layout/Navbar';
import Footer from '../components/layout/Footer';
import SectionTitle from '../components/ui/SectionTitle';

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-[var(--bg-primary)] text-[var(--text-primary)]">
      <Navbar />
      <main className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <SectionTitle eyebrow="About us" title="A modern eyewear house shaping clarity" description="VisionEye blends premium craftsmanship with contemporary design for a bold everyday experience." />
        <div className="mt-10 grid gap-6 lg:grid-cols-2">
          <div className="rounded-[24px] border border-[var(--border-subtle)] bg-[var(--bg-card)] p-8 backdrop-blur-xl">
            <h3 className="text-xl font-semibold text-[var(--text-primary)]">Our story</h3>
            <p className="mt-3 text-sm leading-8 text-[var(--text-secondary)]">We believe eyewear should feel intentional, expressive, and beautifully functional. From minimal silhouettes to bold sculptural shapes, our collections are built around comfort, clarity, and contemporary luxury.</p>
          </div>
          <div className="rounded-[24px] border border-cyan-400/20 bg-gradient-to-br from-[var(--bg-secondary)] to-[var(--bg-primary)] p-8 text-[var(--text-primary)] shadow-sm">
            <h3 className="text-xl font-semibold">Mission</h3>
            <p className="mt-3 text-sm leading-8 text-[var(--text-secondary)]">To make premium optical design approachable, beautiful, and deeply personal for every customer.</p>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
