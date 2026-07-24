import { Helmet } from 'react-helmet-async';
import { useForm } from 'react-hook-form';
import Navbar from '../components/layout/Navbar';
import Footer from '../components/layout/Footer';
import SectionTitle from '../components/ui/SectionTitle';
import Button from '../components/ui/Button';

type ContactForm = {
  name: string;
  email: string;
  message: string;
};

export default function ContactPage() {
  const { register, handleSubmit, reset, formState: { errors } } = useForm<ContactForm>();

  const onSubmit = () => {
    reset();
  };

  return (
    <div className="min-h-screen bg-[#050816] text-slate-100">
      <Helmet>
        <title>Contact Dream Spex</title>
      </Helmet>
      <Navbar />
      <main className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <SectionTitle eyebrow="Contact" title="Get in touch" description="Reach us for styling support, orders, and retail enquiries." />
        <div className="mt-10 grid gap-8 lg:grid-cols-[0.95fr_1.05fr]">
          <div className="rounded-[24px] border border-white/10 bg-white/5 p-8 backdrop-blur-xl">
            <p className="text-sm font-semibold uppercase tracking-[0.3em] text-cyan-400">Visit us</p>
            <p className="mt-4 text-sm leading-8 text-slate-400">House 22, New York Avenue<br />Northgate, London<br />hello@dreamspex.com<br />+44 20 5555 0202</p>
          </div>
          <div className="rounded-[24px] border border-white/10 bg-white/5 p-8 backdrop-blur-xl">
            <form className="space-y-4" onSubmit={handleSubmit(onSubmit)}>
              <input className="w-full rounded-[16px] border border-white/10 bg-[#060b17] px-4 py-3 text-sm text-white outline-none" placeholder="Your name" {...register('name', { required: 'Your name is required' })} />
              {errors.name ? <p className="text-sm text-rose-400">{errors.name.message}</p> : null}
              <input className="w-full rounded-[16px] border border-white/10 bg-[#060b17] px-4 py-3 text-sm text-white outline-none" placeholder="Email address" {...register('email', { required: 'Email is required', pattern: { value: /.+@.+\..+/, message: 'Please enter a valid email' } })} />
              {errors.email ? <p className="text-sm text-rose-400">{errors.email.message}</p> : null}
              <textarea className="min-h-32 w-full rounded-[16px] border border-white/10 bg-[#060b17] px-4 py-3 text-sm text-white outline-none" placeholder="Your message" {...register('message', { required: 'A message is required' })} />
              {errors.message ? <p className="text-sm text-rose-400">{errors.message.message}</p> : null}
              <Button fullWidth>Send enquiry</Button>
            </form>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
