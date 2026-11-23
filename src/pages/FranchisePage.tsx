import { useLayoutEffect, useRef, useState, type FormEvent, type ReactNode } from 'react';
import { Helmet } from 'react-helmet-async';
import {
  ArrowDown,
  ArrowRight,
  Building2,
  CheckCircle2,
  ChevronDown,
  GraduationCap,
  Headset,
  Lightbulb,
  Loader2,
  MapPin,
  Megaphone,
  Monitor,
  Package,
  Send,
  Store,
  TrendingUp,
  Users,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import Navbar from '../components/layout/Navbar';
import Footer from '../components/layout/Footer';
import Button from '../components/ui/Button';
import { franchiseApplicationService } from '../services/franchiseApplicationService';
import {
  validateFranchiseEnquiry,
  type FranchiseEnquiryDraft,
  type FranchiseEnquiryFieldErrors,
} from '../utils/franchiseApplicationValidation';

const initialDraft: FranchiseEnquiryDraft = {
  fullName: '',
  mobileNumber: '',
  email: '',
  preferredCity: '',
  state: '',
  currentOccupation: '',
  availableInvestmentRange: '',
  preferredStoreLocation: '',
  ownsCommercialProperty: '',
  additionalMessage: '',
};

const heroImage = 'https://thumb.wikimedia.org/wikipedia/commons/thumb/2/25/A_wide_range_of_eyeglasses_in_different_shapes.jpg/1920px-A_wide_range_of_eyeglasses_in_different_shapes.jpg';
const inputClassName = 'mt-2 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-[#78BE20] focus:ring-4 focus:ring-[#78BE20]/15';

type IconContent = { title: string; description: string; icon: LucideIcon };

const benefits: IconContent[] = [
  {
    title: 'A distinct brand identity',
    description: 'Explore a customer-facing eyewear brand with a clear point of view across frames and eye care.',
    icon: Store,
  },
  {
    title: 'A growing category',
    description: 'Bring vision care and personal style together in a category customers return to.',
    icon: TrendingUp,
  },
  {
    title: 'Technology in the journey',
    description: 'Discuss how the Dream Spex digital storefront and retail tools can support your customer experience.',
    icon: Monitor,
  },
  {
    title: 'A considered partnership',
    description: 'Understand the business, location and support expectations before deciding to move forward.',
    icon: Headset,
  },
];

const opportunityDetails = [
  'Franchise investment',
  'Franchise fee',
  'Store setup requirements',
  'Minimum store area',
  'Business model',
  'Agreement duration',
];

const supportAreas: IconContent[] = [
  {
    title: 'Store setup & interiors',
    description: 'Discuss location planning, store layout and the in-store experience for your market.',
    icon: Store,
  },
  {
    title: 'Product & supply',
    description: 'Review the product assortment and inventory process proposed for your store.',
    icon: Package,
  },
  {
    title: 'Staff training',
    description: 'Align on product knowledge, customer care and the training plan for your team.',
    icon: GraduationCap,
  },
  {
    title: 'Brand & marketing',
    description: 'Discuss brand usage and marketing activities relevant to your location.',
    icon: Megaphone,
  },
  {
    title: 'Technology & POS',
    description: 'Review the digital and point-of-sale tools available for day-to-day operations.',
    icon: Monitor,
  },
  {
    title: 'Operational guidance',
    description: 'Understand the operational guidance and ongoing support included in the proposal.',
    icon: Lightbulb,
  },
];

const journey = [
  'Submit franchise enquiry',
  'Initial discussion',
  'Location evaluation',
  'Business proposal',
  'Agreement & documentation',
  'Store setup',
  'Launch your Dream Spex store',
];

const faqs = [
  {
    question: 'Why should I choose Dream Spex?',
    answer: 'The enquiry process is a chance to understand the Dream Spex brand, the proposed business model and the support available, then decide whether they fit your goals.',
  },
  {
    question: 'What is the franchise investment?',
    answer: 'We do not publish an investment figure on this page. Request the current investment and fee breakdown in writing during your proposal review before making a decision.',
  },
  {
    question: 'What are the store space requirements?',
    answer: 'Store area and setup requirements are not stated here. Share your preferred location and the applicable requirements can be discussed during the location evaluation.',
  },
  {
    question: 'Will Dream Spex provide training?',
    answer: 'Staff training is an area to discuss as part of the proposal. Confirm the scope, format and responsibilities with the Dream Spex team before signing.',
  },
  {
    question: 'What marketing support is available?',
    answer: 'Marketing and brand support should be confirmed for your proposed location in the written proposal, including what is provided and what is managed by the franchise partner.',
  },
  {
    question: 'How do I apply for a franchise?',
    answer: 'Submit the enquiry form on this page. It will be recorded for review; an enquiry does not itself create a franchise account, approve a location or activate a store.',
  },
  {
    question: 'Which cities are available for expansion?',
    answer: 'Current city availability is not published here. Share your preferred city in the form so it can be considered during the initial discussion and location evaluation.',
  },
];

function SectionHeading({
  eyebrow,
  title,
  description,
  light = false,
}: {
  eyebrow: string;
  title: string;
  description?: string;
  light?: boolean;
}) {
  return (
    <div className="max-w-3xl">
      <p className={`text-xs font-bold uppercase tracking-[0.24em] ${light ? 'text-[#b8e889]' : 'text-[#4d851a]'}`}>{eyebrow}</p>
      <h2 className={`mt-4 text-3xl font-semibold leading-tight tracking-tight sm:text-4xl lg:text-[2.75rem] ${light ? 'text-white' : 'text-[#142b42]'}`}>{title}</h2>
      {description ? <p className={`mt-4 max-w-2xl text-sm leading-7 sm:text-base ${light ? 'text-blue-100/80' : 'text-slate-600'}`}>{description}</p> : null}
    </div>
  );
}

function FormField({
  label,
  required = false,
  error,
  children,
}: {
  label: string;
  required?: boolean;
  error?: string;
  children: ReactNode;
}) {
  return (
    <label className="block text-sm font-medium text-slate-800">
      <span>{label}{required ? <span className="ml-1 text-rose-600" aria-hidden="true">*</span> : null}</span>
      {children}
      {error ? <span className="mt-1.5 block text-xs font-medium text-rose-700" role="alert">{error}</span> : null}
    </label>
  );
}

export default function FranchisePage() {
  const pageRef = useRef<HTMLDivElement>(null);
  const [draft, setDraft] = useState(initialDraft);
  const [errors, setErrors] = useState<FranchiseEnquiryFieldErrors>({});
  const [saving, setSaving] = useState(false);
  const [requestError, setRequestError] = useState('');
  const [referenceId, setReferenceId] = useState('');

  useLayoutEffect(() => {
    const page = pageRef.current;
    const header = document.querySelector<HTMLElement>('header.sticky');
    if (!page || !header) return;

    const updateHeaderOffset = () => {
      page.style.setProperty('--franchise-header-offset', `${Math.max(0, header.getBoundingClientRect().bottom)}px`);
    };

    updateHeaderOffset();
    window.addEventListener('scroll', updateHeaderOffset, { passive: true });
    window.addEventListener('resize', updateHeaderOffset);
    const observer = new ResizeObserver(updateHeaderOffset);
    observer.observe(header);

    return () => {
      observer.disconnect();
      window.removeEventListener('scroll', updateHeaderOffset);
      window.removeEventListener('resize', updateHeaderOffset);
      page.style.removeProperty('--franchise-header-offset');
    };
  }, []);

  const updateField = (field: keyof FranchiseEnquiryDraft, value: string) => {
    setDraft((current) => ({ ...current, [field]: value }));
    setErrors((current) => ({ ...current, [field]: undefined }));
    setRequestError('');
  };

  const submitEnquiry = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const validationErrors = validateFranchiseEnquiry(draft);
    setErrors(validationErrors);
    setRequestError('');
    if (Object.keys(validationErrors).length) return;

    setSaving(true);
    try {
      const created = await franchiseApplicationService.submit({
        fullName: draft.fullName.trim(),
        mobileNumber: draft.mobileNumber.trim(),
        email: draft.email.trim() || null,
        preferredCity: draft.preferredCity.trim(),
        state: draft.state.trim(),
        currentOccupation: draft.currentOccupation.trim() || null,
        availableInvestmentRange: draft.availableInvestmentRange.trim() || null,
        preferredStoreLocation: draft.preferredStoreLocation.trim() || null,
        ownsCommercialProperty: draft.ownsCommercialProperty
          ? draft.ownsCommercialProperty === 'yes'
          : null,
        additionalMessage: draft.additionalMessage.trim() || null,
      });
      setReferenceId(created.referenceId);
    } catch (reason) {
      setRequestError(reason instanceof Error
        ? reason.message
        : 'Unable to submit your enquiry. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div ref={pageRef} className="min-h-screen bg-white text-slate-900">
      <Helmet>
        <title>Dream Spex Franchise Opportunity</title>
        <meta name="description" content="Explore a Dream Spex franchise opportunity. Share your details to begin a conversation about the business, location and partnership." />
      </Helmet>
      <Navbar />
      <main>
        <section className="relative isolate flex min-h-[570px] items-center overflow-hidden bg-[#071c32] sm:min-h-[640px]">
          <div
            role="img"
            aria-label="Eyeglass frames displayed in an optical showroom"
            className="absolute inset-0 -z-20 bg-cover"
            style={{ backgroundImage: `url("${heroImage}")`, backgroundSize: 'cover', backgroundPosition: 'center 48%' }}
          />
          <div className="absolute inset-0 -z-10 bg-gradient-to-r from-[#06172a] via-[#0a2440]/90 to-[#0b3470]/45" />
          <div className="absolute inset-0 -z-10 bg-gradient-to-t from-[#06172a]/60 via-transparent to-[#06172a]/20" />
          <div className="mx-auto w-full max-w-7xl px-5 py-20 sm:px-8 lg:px-10">
            <div className="max-w-3xl">
              <p className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-blue-50 backdrop-blur">
                <span className="h-2 w-2 rounded-full bg-[#a7d868]" /> Dream Spex Franchise Opportunity
              </p>
              <h1 className="mt-7 font-serif text-4xl leading-[1.08] tracking-tight text-white sm:text-5xl lg:text-7xl">
                Partner with Dream Spex. <span className="text-[#c6e7a4]">Build a Vision for Success.</span>
              </h1>
              <p className="mt-6 max-w-2xl text-base leading-7 text-blue-50/85 sm:text-lg sm:leading-8">
                Become a part of the growing eyewear retail industry. Build your business with the support, technology and brand experience of Dream Spex.
              </p>
              <div className="mt-9 flex flex-col gap-3 sm:flex-row">
                <a href="#franchise-enquiry">
                  <Button className="w-full bg-[#78BE20] text-slate-950 shadow-xl hover:bg-[#a7d868] sm:w-auto">
                    Apply for Franchise <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </a>
                <a href="#opportunity" className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full border border-white/40 px-6 text-sm font-semibold text-white transition hover:border-white hover:bg-white/10">
                  Explore Franchise Opportunity <ArrowDown className="h-4 w-4" />
                </a>
              </div>
            </div>
          </div>
          <div className="absolute bottom-3 right-4 flex flex-col items-end gap-1 text-[9px] text-white/75 sm:bottom-5 sm:right-6 lg:bottom-7 lg:right-7">
            <p className="hidden items-center gap-3 text-xs font-medium uppercase tracking-[0.16em] sm:flex">
              <span className="h-px w-12 bg-white/50" /> A clearer way to see what’s next
            </p>
            <p>
              Photo: <a href="https://commons.wikimedia.org/wiki/File:A_wide_range_of_eyeglasses_in_different_shapes.jpg" target="_blank" rel="noreferrer" className="underline underline-offset-2">Shixart1985 / Wikimedia Commons</a>
              {' · '}
              <a href="https://creativecommons.org/licenses/by/2.0/" target="_blank" rel="noreferrer" className="underline underline-offset-2">CC BY 2.0</a>
            </p>
          </div>
        </section>

        <nav aria-label="Franchise page" className="sticky z-40 border-b border-slate-200 bg-white/95 shadow-sm backdrop-blur" style={{ top: 'var(--franchise-header-offset, 0px)' }}>
          <div className="mx-auto flex max-w-7xl items-center gap-5 overflow-x-auto px-4 py-3 sm:px-6 lg:gap-8 lg:px-8">
            <a href="#why-dream-spex" className="shrink-0 text-xs font-semibold text-slate-600 transition hover:text-[#315c15]">Why Dream Spex</a>
            <a href="#opportunity" className="shrink-0 text-xs font-semibold text-slate-600 transition hover:text-[#315c15]">Opportunity</a>
            <a href="#support" className="shrink-0 text-xs font-semibold text-slate-600 transition hover:text-[#315c15]">Partner support</a>
            <a href="#journey" className="shrink-0 text-xs font-semibold text-slate-600 transition hover:text-[#315c15]">Journey</a>
            <a href="#faqs" className="shrink-0 text-xs font-semibold text-slate-600 transition hover:text-[#315c15]">FAQs</a>
            <a href="#franchise-enquiry" className="ml-auto inline-flex shrink-0 items-center gap-2 rounded-full bg-[#0b3470] px-4 py-2 text-xs font-semibold text-white transition hover:bg-[#1452a0]">
              Apply now <ArrowRight className="h-3.5 w-3.5" />
            </a>
          </div>
        </nav>

        <section id="why-dream-spex" className="franchise-scroll-target px-5 py-20 sm:px-8 lg:py-24">
          <div className="mx-auto max-w-7xl">
            <SectionHeading
              eyebrow="The opportunity"
              title="Why explore a Dream Spex partnership?"
              description="A thoughtful franchise conversation starts with a clear view of the brand, the customer experience and the practical details of running a store."
            />
            <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {benefits.map(({ title, description, icon: Icon }, index) => (
                <article key={title} className="group min-h-56 rounded-2xl border border-slate-200 bg-white p-6 transition duration-300 hover:-translate-y-1 hover:border-[#78BE20]/60 hover:shadow-xl hover:shadow-slate-900/5">
                  <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#eff7e7] text-[#315c15] transition group-hover:bg-[#78BE20] group-hover:text-slate-950">
                    <Icon className="h-5 w-5" />
                  </span>
                  <p className="mt-6 text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">0{index + 1}</p>
                  <h3 className="mt-2 text-lg font-semibold text-[#142b42]">{title}</h3>
                  <p className="mt-2 text-sm leading-6 text-slate-600">{description}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section id="opportunity" className="franchise-scroll-target bg-[#f5f8fb] px-5 py-20 sm:px-8 lg:py-24">
          <div className="mx-auto grid max-w-7xl gap-12 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
            <div>
              <SectionHeading
                eyebrow="Franchise business opportunity"
                title="A clear conversation, before a commitment."
                description="Every location and partnership deserves a careful review. The commercial terms below are shared and confirmed directly during the proposal process—not guessed on a landing page."
              />
              <div className="mt-8 flex items-start gap-3 rounded-2xl border border-[#d8e6f4] bg-white p-5">
                <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#eaf2fb] text-[#0b3470]"><Building2 className="h-4 w-4" /></span>
                <p className="text-sm leading-6 text-slate-600">Request the applicable figures, operating expectations and agreement terms in writing so you can review the full opportunity before deciding.</p>
              </div>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              {opportunityDetails.map((detail, index) => (
                <div key={detail} className="flex min-h-[112px] items-start gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm shadow-slate-900/[0.02]">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#0b3470] text-xs font-bold text-white">{String(index + 1).padStart(2, '0')}</span>
                  <div>
                    <h3 className="font-semibold text-[#142b42]">{detail}</h3>
                    <p className="mt-2 text-sm text-slate-500">Discussed in your proposal</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section id="support" className="franchise-scroll-target px-5 py-20 sm:px-8 lg:py-24">
          <div className="mx-auto max-w-7xl">
            <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
              <SectionHeading
                eyebrow="What Dream Spex provides"
                title="Support to help shape your store."
                description="Explore the partner-support areas that form part of the franchise discussion. Confirm the specific scope, responsibilities and terms in your written proposal."
              />
              <a href="#franchise-enquiry" className="inline-flex shrink-0 items-center gap-2 text-sm font-semibold text-[#315c15] transition hover:gap-3">
                Discuss the opportunity <ArrowRight className="h-4 w-4" />
              </a>
            </div>
            <div className="mt-12 grid gap-x-8 gap-y-0 md:grid-cols-2 lg:grid-cols-3">
              {supportAreas.map(({ title, description, icon: Icon }) => (
                <article key={title} className="flex gap-4 border-t border-slate-200 py-6">
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#edf4fb] text-[#0b3470]"><Icon className="h-5 w-5" /></span>
                  <div>
                    <h3 className="font-semibold text-[#142b42]">{title}</h3>
                    <p className="mt-2 text-sm leading-6 text-slate-600">{description}</p>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section id="journey" className="franchise-scroll-target bg-[#071e3c] px-5 py-20 sm:px-8 lg:py-24">
          <div className="mx-auto max-w-7xl">
            <SectionHeading
              eyebrow="The franchise journey"
              title="From first conversation to opening day."
              description="A step-by-step view of the enquiry and evaluation process."
              light
            />
            <ol className="mt-12 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {journey.map((step, index) => (
                <li key={step} className="relative flex min-h-28 items-start gap-4 rounded-2xl border border-white/15 bg-white/[0.06] p-5 text-white backdrop-blur-sm">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#a7d868] text-sm font-bold text-[#102b19]">{index + 1}</span>
                  <span className="pt-1 text-sm font-semibold leading-6">{step}</span>
                  {index < journey.length - 1 ? <ArrowRight aria-hidden="true" className="absolute -right-3 top-1/2 z-10 hidden h-5 w-5 -translate-y-1/2 text-[#a7d868] lg:block" /> : null}
                </li>
              ))}
            </ol>
          </div>
        </section>

        <section id="franchise-enquiry" className="franchise-scroll-target bg-[#f5f8fb] px-5 py-20 sm:px-8 lg:py-24">
          <div className="mx-auto grid max-w-7xl gap-12 lg:grid-cols-[0.75fr_1.25fr] lg:gap-16">
            <div className="lg:sticky lg:top-40 lg:self-start">
              <SectionHeading
                eyebrow="Start a conversation"
                title="Tell us what you’re looking for."
                description="Share a few details about your plans and preferred location. The enquiry will be submitted to the existing Dream Spex franchise review process."
              />
              <div className="mt-8 space-y-4">
                <div className="flex items-start gap-3">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white text-[#315c15] shadow-sm"><Users className="h-4 w-4" /></span>
                  <p className="pt-1 text-sm leading-6 text-slate-600">A member of the team can review your enquiry and discuss next steps.</p>
                </div>
                <div className="flex items-start gap-3">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white text-[#315c15] shadow-sm"><MapPin className="h-4 w-4" /></span>
                  <p className="pt-1 text-sm leading-6 text-slate-600">Your preferred city and location help frame the initial conversation.</p>
                </div>
                <div className="flex items-start gap-3">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white text-[#315c15] shadow-sm"><CheckCircle2 className="h-4 w-4" /></span>
                  <p className="pt-1 text-sm leading-6 text-slate-600">Submitting an enquiry is not an approval, agreement or store activation.</p>
                </div>
              </div>
            </div>

            <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-xl shadow-slate-900/[0.05] sm:p-8 lg:p-10">
              {referenceId ? (
                <div role="status" className="py-8 text-center sm:py-12">
                  <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-50 text-emerald-700"><CheckCircle2 className="h-7 w-7" /></span>
                  <p className="mt-5 text-xs font-bold uppercase tracking-[0.2em] text-emerald-800">Enquiry received</p>
                  <h2 className="mt-3 text-2xl font-semibold text-[#142b42]">Thank you for your interest.</h2>
                  <p className="mt-3 text-sm leading-6 text-slate-600">Your enquiry has been recorded. Keep this reference for your records:</p>
                  <p className="mt-3 inline-flex rounded-full bg-slate-100 px-4 py-2 font-mono text-sm font-semibold text-slate-800">{referenceId}</p>
                  <p className="mx-auto mt-5 max-w-lg text-xs leading-5 text-slate-500">This submission is an enquiry only. It does not create an account, approve a franchise or activate a store.</p>
                </div>
              ) : (
                <form onSubmit={submitEnquiry} noValidate>
                  <div className="mb-7 border-b border-slate-100 pb-5">
                    <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#4d851a]">Franchise enquiry</p>
                    <h2 className="mt-2 text-2xl font-semibold text-[#142b42]">Let’s get to know your plans.</h2>
                    <p className="mt-2 text-sm text-slate-500"><span className="text-rose-600">*</span> Required fields</p>
                  </div>

                  {requestError ? <p role="alert" className="mb-5 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">{requestError}</p> : null}

                  <div className="grid gap-x-5 gap-y-5 sm:grid-cols-2">
                    <FormField label="Full Name" required error={errors.fullName}>
                      <input name="fullName" autoComplete="name" required maxLength={160} value={draft.fullName} onChange={(event) => updateField('fullName', event.target.value)} aria-invalid={Boolean(errors.fullName)} className={inputClassName} placeholder="Your full name" />
                    </FormField>
                    <FormField label="Mobile Number" required error={errors.mobileNumber}>
                      <input name="mobileNumber" autoComplete="tel" type="tel" inputMode="tel" required maxLength={32} value={draft.mobileNumber} onChange={(event) => updateField('mobileNumber', event.target.value)} aria-invalid={Boolean(errors.mobileNumber)} className={inputClassName} placeholder="+91 98765 43210" />
                    </FormField>
                    <FormField label="Email Address" error={errors.email}>
                      <input name="email" autoComplete="email" type="email" maxLength={255} value={draft.email} onChange={(event) => updateField('email', event.target.value)} aria-invalid={Boolean(errors.email)} className={inputClassName} placeholder="you@example.com" />
                    </FormField>
                    <FormField label="Preferred City" required error={errors.preferredCity}>
                      <input name="preferredCity" autoComplete="address-level2" required maxLength={100} value={draft.preferredCity} onChange={(event) => updateField('preferredCity', event.target.value)} aria-invalid={Boolean(errors.preferredCity)} className={inputClassName} placeholder="City" />
                    </FormField>
                    <FormField label="State" required error={errors.state}>
                      <input name="state" autoComplete="address-level1" required maxLength={100} value={draft.state} onChange={(event) => updateField('state', event.target.value)} aria-invalid={Boolean(errors.state)} className={inputClassName} placeholder="State" />
                    </FormField>
                    <FormField label="Current Occupation" error={errors.currentOccupation}>
                      <input name="currentOccupation" maxLength={160} value={draft.currentOccupation} onChange={(event) => updateField('currentOccupation', event.target.value)} className={inputClassName} placeholder="Optional" />
                    </FormField>
                    <FormField label="Available Investment Range" error={errors.availableInvestmentRange}>
                      <input name="availableInvestmentRange" maxLength={120} value={draft.availableInvestmentRange} onChange={(event) => updateField('availableInvestmentRange', event.target.value)} className={inputClassName} placeholder="Share a range, or leave blank" />
                    </FormField>
                    <FormField label="Preferred Store Location" error={errors.preferredStoreLocation}>
                      <input name="preferredStoreLocation" maxLength={255} value={draft.preferredStoreLocation} onChange={(event) => updateField('preferredStoreLocation', event.target.value)} className={inputClassName} placeholder="Area, mall or landmark (optional)" />
                    </FormField>
                    <FormField label="Do you own a commercial property?" error={errors.ownsCommercialProperty}>
                      <span className="relative block">
                        <select name="ownsCommercialProperty" value={draft.ownsCommercialProperty} onChange={(event) => updateField('ownsCommercialProperty', event.target.value)} className={`${inputClassName} appearance-none pr-10`}>
                          <option value="">Select an option</option>
                          <option value="yes">Yes</option>
                          <option value="no">No</option>
                        </select>
                        <ChevronDown aria-hidden="true" className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                      </span>
                    </FormField>
                    <FormField label="Additional Message" error={errors.additionalMessage}>
                      <textarea name="additionalMessage" maxLength={2000} rows={4} value={draft.additionalMessage} onChange={(event) => updateField('additionalMessage', event.target.value)} className={`${inputClassName} resize-y sm:min-h-[108px]`} placeholder="Tell us a little more about your plans" />
                    </FormField>
                  </div>

                  <div className="mt-7 flex flex-col gap-4 border-t border-slate-100 pt-6 sm:flex-row sm:items-center sm:justify-between">
                    <p className="max-w-sm text-xs leading-5 text-slate-500">Your information will be used to review and respond to this franchise enquiry.</p>
                    <Button type="submit" disabled={saving} className="w-full shrink-0 bg-[#0b3470] text-white shadow-lg shadow-blue-950/15 hover:bg-[#1452a0] sm:w-auto">
                      {saving ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Submitting…</> : <><Send className="mr-2 h-4 w-4" /> Submit Franchise Enquiry</>}
                    </Button>
                  </div>
                </form>
              )}
            </div>
          </div>
        </section>

        <section id="faqs" className="franchise-scroll-target px-5 py-20 sm:px-8 lg:py-24">
          <div className="mx-auto grid max-w-7xl gap-10 lg:grid-cols-[0.7fr_1.3fr]">
            <div>
              <SectionHeading
                eyebrow="Frequently asked questions"
                title="Good questions deserve clear answers."
                description="We prefer to be transparent: specific commercial terms should be confirmed with the team and reviewed in writing."
              />
              <a href="#franchise-enquiry" className="mt-7 inline-flex items-center gap-2 text-sm font-semibold text-[#315c15] transition hover:gap-3">
                Ask about a franchise <ArrowRight className="h-4 w-4" />
              </a>
            </div>
            <div className="divide-y divide-slate-200 border-y border-slate-200">
              {faqs.map(({ question, answer }) => (
                <details key={question} className="group py-5">
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-5 text-left text-base font-semibold text-[#142b42] marker:hidden">
                    {question}
                    <ChevronDown className="h-5 w-5 shrink-0 text-[#4d851a] transition group-open:rotate-180" />
                  </summary>
                  <p className="max-w-3xl pr-8 pt-4 text-sm leading-7 text-slate-600">{answer}</p>
                </details>
              ))}
            </div>
          </div>
        </section>

        <section className="relative overflow-hidden bg-[#0b3470] px-5 py-16 sm:px-8 lg:py-20">
          <div className="absolute -right-20 -top-32 h-96 w-96 rounded-full border border-white/10" />
          <div className="absolute -right-4 -top-16 h-64 w-64 rounded-full border border-white/10" />
          <div className="relative mx-auto flex max-w-7xl flex-col gap-8 lg:flex-row lg:items-center lg:justify-between">
            <div className="max-w-3xl">
              <p className="text-xs font-bold uppercase tracking-[0.24em] text-[#c6e7a4]">A vision worth exploring</p>
              <h2 className="mt-4 font-serif text-3xl leading-tight text-white sm:text-4xl lg:text-5xl">Your Business Journey Starts with a Vision.</h2>
              <p className="mt-4 max-w-2xl text-sm leading-7 text-blue-100/85 sm:text-base">Join Dream Spex and explore an opportunity to grow together in the eyewear industry.</p>
            </div>
            <a href="#franchise-enquiry" className="shrink-0">
              <Button className="w-full bg-[#a7d868] text-slate-950 hover:bg-[#c6e7a4] sm:w-auto">
                Become a Franchise Partner <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </a>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
