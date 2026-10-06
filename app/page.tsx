import Link from 'next/link';
import { Bricolage_Grotesque, Figtree } from 'next/font/google';

const display = Bricolage_Grotesque({ subsets: ['latin'], weight: ['600', '800'] });
const body = Figtree({ subsets: ['latin'], weight: ['400', '500', '600'] });

// Brand: Ink #0E2F27 · Sprout #2E9E6B · Mango #F4B63F · Sampaguita #F4F8F5
// Set to a number (e.g. 40) to show a real "spots left" line; leave null to hide it.
const BETA_SPOTS_LEFT: number | null = null;

const weave = {
  backgroundImage:
    'repeating-linear-gradient(45deg, rgba(255,255,255,.05) 0 2px, transparent 2px 14px), repeating-linear-gradient(-45deg, rgba(255,255,255,.05) 0 2px, transparent 2px 14px)',
};

const focus =
  'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2E9E6B]';

const pains = [
  'Hours in one app, invoices in a doc, payments buried in chat screenshots.',
  'Every invoice means redoing the tax math and hoping it is right.',
  'You finish the work, then spend days chasing the payment.',
];

const loop = [
  { title: 'Add the client and the work', text: 'Save client details, then break the project into milestones and tasks.' },
  { title: 'Track your hours', text: 'Start a timer on a task. Every minute stays tied to the right client.' },
  { title: 'Send the invoice', text: 'Turn hours or a fixed fee into a clean invoice. Tax is applied from your profile.' },
  { title: 'Get paid', text: 'Your client pays on the invoice, and WorkSprout marks it paid.' },
];

const niches = [
  { who: 'Virtual assistants', text: 'Log hours across several retainer clients and send one invoice per client at month end.' },
  { who: 'Developers', text: 'Track time per task, bill by milestone, and keep every project and client in one place.' },
  { who: 'Artists and designers', text: 'Quote a fixed fee, track revisions as hours, and invoice when the file is approved.' },
];

const later = [
  'Contract generator',
  'Client message drafts',
  'Niche workflows',
  'Budgets and expenses',
  'Quarterly BIR computation',
  'Analytics',
  'AI notes helper',
];

const faqs = [
  { q: 'Is the beta really free?', a: 'Yes. Every beta feature is free while the beta runs, and you do not need to enter a card to join.' },
  { q: 'What happens when the beta ends?', a: 'We will tell you well before anything changes, and you will not be charged unless you choose a plan.' },
  { q: 'Can I trust the tax numbers?', a: 'Tax amounts are estimates to help you prepare invoices, based on the settings in your profile. They are not tax advice, so confirm with the BIR or an accountant.' },
  { q: 'Who sees my client data?', a: 'Your clients, projects, and invoices are private to your account.' },
];

function Logo({ light = false }: { light?: boolean }) {
  return (
    <span className="flex items-center gap-2.5">
      <svg width="34" height="34" viewBox="0 0 32 32" aria-hidden="true">
        <rect width="32" height="32" rx="9" fill="#0E2F27" />
        <path d="M16 25V15" stroke="#F4B63F" strokeWidth="2.5" strokeLinecap="round" />
        <path d="M16 16c0-4.5-3-7-7.5-7 0 4.5 3 7 7.5 7z" fill="#2E9E6B" />
        <path d="M16 14c0-4 2.5-6.5 7.5-6.5 0 4-2.5 6.5-7.5 6.5z" fill="#F4B63F" />
      </svg>
      <span className={`${display.className} text-2xl font-extrabold tracking-tight ${light ? 'text-white' : ''}`}>
        WorkSprout
      </span>
    </span>
  );
}

function SignupForm({ id, dark = false }: { id: string; dark?: boolean }) {
  return (
    <form action="/signup" method="get" className="w-full max-w-lg">
      <input type="hidden" name="source" value="beta-landing" />
      <label htmlFor={id} className="sr-only">
        Email address
      </label>
      <div className="flex flex-col gap-3 sm:flex-row">
        <input
          id={id}
          name="email"
          type="email"
          required
          autoComplete="email"
          placeholder="you@email.com"
          className={`min-w-0 flex-1 rounded-xl border px-4 py-4 text-base text-[#0E2F27] placeholder:text-[#0E2F27]/50 ${
            dark ? 'border-white/20 bg-white' : 'border-[#0E2F27]/20 bg-white'
          } ${focus}`}
        />
        <button
          type="submit"
          className={`rounded-xl bg-[#F4B63F] px-6 py-4 text-base font-semibold text-[#0E2F27] hover:bg-[#e9a82a] ${focus}`}
        >
          Get free beta access
        </button>
      </div>
      <ul className={`mt-3 flex flex-wrap gap-x-5 gap-y-1 text-sm ${dark ? 'text-white/75' : 'text-[#0E2F27]/70'}`}>
        <li>✓ Free during beta</li>
        <li>✓ No card needed</li>
        <li>✓ Ready in minutes</li>
      </ul>
      {BETA_SPOTS_LEFT !== null && (
        <p className={`mt-2 text-sm font-semibold ${dark ? 'text-[#F4B63F]' : 'text-[#1F6B52]'}`}>
          {BETA_SPOTS_LEFT} beta spots left
        </p>
      )}
    </form>
  );
}

export default function Home() {
  return (
    <div className={`${body.className} min-h-screen bg-[#F4F8F5] text-[#0E2F27]`}>
      <style>{`
        @keyframes ws-stamp {
          0% { opacity: 0; transform: rotate(-9deg) scale(1.7); }
          70% { opacity: 1; transform: rotate(-9deg) scale(.95); }
          100% { opacity: 1; transform: rotate(-9deg) scale(1); }
        }
        .ws-stamp { animation: ws-stamp 500ms 800ms cubic-bezier(.2,.8,.3,1) both; }
        details summary::-webkit-details-marker { display: none; }
        details[open] .ws-plus { transform: rotate(45deg); }
        .ws-plus { transition: transform 150ms; }
        @media (prefers-reduced-motion: reduce) { .ws-stamp { animation: none; } .ws-plus { transition: none; } }
      `}</style>

      {/* Navigation */}
      <nav className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
        <div className="flex items-center gap-3">
          <Logo />
          <span className="rounded-full bg-[#F4B63F] px-2.5 py-0.5 text-xs font-semibold">Beta</span>
        </div>
        <div className="flex items-center gap-5">
          <Link href="/login" className={`font-medium text-[#0E2F27]/70 hover:text-[#0E2F27] ${focus}`}>
            Log in
          </Link>
          <Link
            href="#join"
            className={`hidden rounded-lg bg-[#0E2F27] px-5 py-2.5 font-semibold text-white hover:bg-[#1F6B52] sm:block ${focus}`}
          >
            Join the beta
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <header className="mx-auto grid max-w-6xl items-center gap-16 px-6 pb-24 pt-10 lg:grid-cols-[1.1fr_0.9fr]">
        <div>
          <p className="mb-4 inline-block rounded-full border border-[#0E2F27]/20 px-3 py-1 text-sm font-medium">
            Free beta for freelancers
          </p>
          <h1 className={`${display.className} text-5xl font-extrabold leading-[1.04] tracking-tight md:text-6xl`}>
  Track the work. Send the invoice. Get paid.
            </h1>
          <p className="mt-6 max-w-xl text-lg leading-relaxed text-[#0E2F27]/75">
            Clients, tasks, hours, invoices, and payments in one workspace built for virtual assistants,
            developers, and artists.
          </p>
          <div id="join" className="mt-9">
            <SignupForm id="email-hero" />
          </div>
        </div>

        <div className="relative mx-auto w-full max-w-md" aria-label="Sample invoice produced by WorkSprout">
          <div className="rounded-lg border border-[#0E2F27]/15 bg-white p-7 shadow-[0_18px_40px_-20px_rgba(14,47,39,0.4)]">
            <div className="flex items-start justify-between">
              <div>
                <p className={`${display.className} text-xl font-extrabold`}>Invoice #0012</p>
                <p className="mt-1 text-sm text-[#0E2F27]/65">Billed to RayTech</p>
              </div>
              <p className="text-sm text-[#0E2F27]/65">Sample</p>
            </div>
            <dl className="mt-7 space-y-3 text-sm">
              <div className="flex justify-between gap-4">
                <dt>
                  Website revisions
                  <span className="block text-[#0E2F27]/60">18 hrs × ₱1,200</span>
                </dt>
                <dd className="tabular-nums">₱21,600.00</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt>
                  Landing page design
                  <span className="block text-[#0E2F27]/60">Fixed fee</span>
                </dt>
                <dd className="tabular-nums">₱8,000.00</dd>
              </div>
            </dl>
            <div className="mt-6 space-y-2 border-t border-[#0E2F27]/15 pt-4 text-sm">
              <div className="flex justify-between">
                <span>Subtotal</span>
                <span className="tabular-nums">₱29,600.00</span>
              </div>
              <div className="flex justify-between">
                <span>Tax, from your profile</span>
                <span className="tabular-nums">₱888.00</span>
              </div>
              <div className={`${display.className} flex justify-between pt-2 text-lg font-extrabold`}>
                <span>Total</span>
                <span className="tabular-nums">₱30,488.00</span>
              </div>
            </div>
            <p className="mt-5 text-sm text-[#0E2F27]/65">Pay with Maya</p>
          </div>
          <div
            className={`ws-stamp ${display.className} absolute -bottom-5 -right-3 rounded-md border-4 border-[#2E9E6B] bg-[#F4F8F5]/90 px-4 py-1 text-2xl font-extrabold text-[#1F6B52]`}
            aria-hidden="true"
          >
            PAID
          </div>
        </div>
      </header>

      {/* Problem */}
      <section className="bg-white px-6 py-20">
        <div className="mx-auto max-w-6xl">
          <h2 className={`${display.className} max-w-2xl text-3xl font-extrabold tracking-tight md:text-4xl`}>
            Freelancing is hard enough without the admin
          </h2>
          <ul className="mt-10 grid gap-8 md:grid-cols-3">
            {pains.map((p) => (
              <li key={p} className="border-l-4 border-[#F4B63F] pl-5 text-lg leading-relaxed text-[#0E2F27]/80">
                {p}
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* The loop */}
      <section className="px-6 py-24">
        <div className="mx-auto max-w-6xl">
          <h2 className={`${display.className} max-w-2xl text-3xl font-extrabold tracking-tight md:text-4xl`}>
            One flow, from first task to payment
          </h2>
          <ol className="mt-12 grid gap-10 md:grid-cols-2 lg:grid-cols-4">
            {loop.map((s, i) => (
              <li key={s.title}>
                <span
                  className={`${display.className} flex h-10 w-10 items-center justify-center rounded-full bg-[#0E2F27] text-lg font-semibold text-white`}
                >
                  {i + 1}
                </span>
                <h3 className={`${display.className} mt-4 text-xl font-semibold`}>{s.title}</h3>
                <p className="mt-2 leading-relaxed text-[#0E2F27]/75">{s.text}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* Niches */}
      <section className="bg-white px-6 py-24">
        <div className="mx-auto max-w-6xl">
          <h2 className={`${display.className} max-w-2xl text-3xl font-extrabold tracking-tight md:text-4xl`}>
            Made for how you actually work
          </h2>
          <div className="mt-10 grid gap-px overflow-hidden rounded-xl border border-[#0E2F27]/12 bg-[#0E2F27]/12 md:grid-cols-3">
            {niches.map((n) => (
              <div key={n.who} className="bg-[#F4F8F5] p-7">
                <h3 className={`${display.className} text-xl font-semibold`}>{n.who}</h3>
                <p className="mt-3 leading-relaxed text-[#0E2F27]/75">{n.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Why join + roadmap */}
      <section className="px-6 py-24 text-white" style={{ backgroundColor: '#0E2F27', ...weave }}>
        <div className="mx-auto grid max-w-6xl gap-14 lg:grid-cols-2">
          <div>
            <h2 className={`${display.className} text-3xl font-extrabold tracking-tight md:text-4xl`}>
              Join now and shape what we build
            </h2>
            <p className="mt-4 max-w-md leading-relaxed text-white/80">
              Beta testers get the full product for free and decide what comes next. Tell us what slows you down and it
              goes to the top of the list.
            </p>
          </div>
          <div>
            <h3 className={`${display.className} text-lg font-semibold text-[#F4B63F]`}>Coming after the beta</h3>
            <ul className="mt-4 grid gap-x-8 gap-y-3 sm:grid-cols-2">
              {later.map((l) => (
                <li key={l} className="border-b border-white/15 pb-3 text-white/90">
                  {l}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="px-6 py-24">
        <div className="mx-auto max-w-3xl">
          <h2 className={`${display.className} text-3xl font-extrabold tracking-tight md:text-4xl`}>Questions</h2>
          <div className="mt-8 divide-y divide-[#0E2F27]/15 border-y border-[#0E2F27]/15">
            {faqs.map((f) => (
              <details key={f.q} className="group py-5">
                <summary className={`flex cursor-pointer items-center justify-between gap-4 text-lg font-semibold ${focus}`}>
                  {f.q}
                  <span className="ws-plus text-2xl leading-none text-[#1F6B52]" aria-hidden="true">
                    +
                  </span>
                </summary>
                <p className="mt-3 leading-relaxed text-[#0E2F27]/75">{f.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="px-6 py-24 text-white" style={{ backgroundColor: '#1F6B52', ...weave }}>
        <div className="mx-auto flex max-w-3xl flex-col items-center text-center">
          <h2 className={`${display.className} text-3xl font-extrabold tracking-tight md:text-5xl`}>
            Your next invoice can come from WorkSprout
          </h2>
          <p className="mb-8 mt-4 max-w-lg text-white/85">Join the free beta and start with one client.</p>
          <SignupForm id="email-footer" dark />
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-white px-6 pb-28 pt-10 md:pb-10">
        <div className="mx-auto max-w-6xl space-y-3 text-sm text-[#0E2F27]/65">
          <Logo />
          <p>© 2026 WorkSprout. This is a beta, so some things will change or break.</p>
          <p>Tax amounts are estimates, not tax advice. Confirm with the BIR or an accountant.</p>
        </div>
      </footer>

      {/* Mobile sticky CTA */}
      <div
        className="fixed inset-x-0 bottom-0 z-10 border-t border-white/10 bg-[#0E2F27] p-3 md:hidden"
        style={{ paddingBottom: 'calc(0.75rem + env(safe-area-inset-bottom, 0px))' }}
      >
        <Link
          href="#join"
          className={`block rounded-xl bg-[#F4B63F] py-3.5 text-center font-semibold text-[#0E2F27] ${focus}`}
        >
          Get free beta access
        </Link>
      </div>
    </div>
  );
}