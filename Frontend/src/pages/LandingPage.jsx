import { Link } from "react-router-dom";
import Card from "../components/ui/Card";
import Badge from "../components/ui/Badge";
import { useAuth } from "../hooks/useAuth";

const features = [
  {
    title: "Tree Monitoring",
    text: "Track tree status, location, and care history with structured records and geospatial context.",
  },
  {
    title: "Weather-Aware Alerts",
    text: "Detect dangerous weather thresholds early and trigger response workflows before damage escalates.",
  },
  {
    title: "Volunteer Dispatch",
    text: "Automatically match nearby volunteers in a 5km radius for faster response and coverage.",
  },
  {
    title: "Risk Intelligence",
    text: "Assess high-risk regions, analyze trends, and prioritize interventions using analytics dashboards.",
  },
  {
    title: "Event Coordination",
    text: "Organize environmental activities, community workshops, and targeted interventions in one platform.",
  },
  {
    title: "Role-Secured Access",
    text: "Maintain trust through role-based access, session controls, and secure API-driven operations.",
  },
];

const impactStats = [
  { label: "Active Monitoring", value: "24/7" },
  { label: "Response Radius", value: "5km" },
  { label: "Workflow Coverage", value: "End-to-End" },
  { label: "Real-time Signals", value: "Socket Events" },
];

const impactIndicators = [
  { label: "Response Dispatch", value: "< 3 min", detail: "from alert trigger to volunteer assignment" },
  { label: "Situational Coverage", value: "360°", detail: "weather, tree records, and incident context" },
  { label: "Field Coordination", value: "Live", detail: "task acceptance and completion status updates" },
  { label: "Decision Confidence", value: "Data-Backed", detail: "risk trends and operational history in one view" },
];

const impactOutcomes = [
  {
    title: "Faster Incident Response",
    text: "Alert thresholds and nearby volunteer matching reduce waiting time for urgent interventions.",
  },
  {
    title: "Lower Operational Blind Spots",
    text: "Centralized tree location, weather exposure, and status history improve field readiness.",
  },
  {
    title: "Continuous Improvement Cycle",
    text: "Each response contributes measurable outcomes that sharpen planning and prevention.",
  },
];

const communityVoices = [
  {
    quote: "The alert pipeline helped us mobilize volunteers faster during sudden weather spikes.",
    by: "Field Coordination Team",
  },
  {
    quote: "Our team now has a clear operational dashboard instead of scattered spreadsheets.",
    by: "Community Program Lead",
  },
  {
    quote: "Tree records, weather context, and response tracking in one system changed our workflow.",
    by: "Urban Green Initiative",
  },
];

function LandingPage() {
  const { isAuthenticated } = useAuth();

  return (
    <div className="relative overflow-hidden">
      <section className="relative border-b border-white/60 bg-white/80 py-16 sm:py-20">
        <div className="hero-overlay" />
        <div className="app-container relative">
          <Badge variant="leaf">Environmental Response Platform</Badge>
          <h1 className="mt-5 max-w-4xl text-4xl font-extrabold leading-tight tracking-tight text-slate-900 sm:text-5xl lg:text-6xl">
            Protect Trees Proactively With Weather Intelligence and Community Action.
          </h1>
          <p className="mt-6 max-w-3xl text-base text-slate-600 sm:text-lg">
            Forisswell helps teams monitor tree health, predict weather-driven risks, coordinate volunteer response, and keep communities informed through one secure and responsive system.
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-3">
            {isAuthenticated ? (
              <Link className="btn-primary" to="/dashboard">
                Open Dashboard
              </Link>
            ) : (
              <>
                <Link className="btn-primary" to="/register">
                  Start Protecting Trees
                </Link>
                <Link className="btn-secondary" to="/login">
                  Sign In
                </Link>
              </>
            )}
            <a href="#how-it-works" className="btn-ghost">
              Explore How It Works
            </a>
          </div>

          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {impactStats.map((item) => (
              <Card key={item.label} className="bg-white/75">
                <p className="text-xs uppercase tracking-wide text-slate-500">{item.label}</p>
                <p className="mt-2 text-2xl font-bold text-slate-900">{item.value}</p>
              </Card>
            ))}
          </div>
        </div>
      </section>

      <section id="features" className="app-container py-14 sm:py-16">
        <div className="mb-8">
          <h2 className="text-3xl font-bold">Everything Needed for Tree Safety Operations</h2>
          <p className="mt-2 max-w-3xl text-slate-600">
            Designed for practical environmental work, from daily monitoring to urgent field response.
          </p>
        </div>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {features.map((feature) => (
            <Card key={feature.title} className="transition-transform hover:-translate-y-0.5 hover:shadow-card">
              <h3 className="text-lg font-semibold">{feature.title}</h3>
              <p className="mt-2 text-sm text-slate-600">{feature.text}</p>
            </Card>
          ))}
        </div>
      </section>

      <section id="how-it-works" className="border-y border-slate-200/80 bg-white/80 py-14 sm:py-16">
        <div className="app-container">
          <h2 className="text-3xl font-bold">How It Works</h2>
          <div className="mt-8 grid gap-4 md:grid-cols-3">
            <Card>
              <span className="chip">Step 1</span>
              <h3 className="mt-3 text-lg font-semibold">Capture & Monitor</h3>
              <p className="mt-2 text-sm text-slate-600">
                Register tree records with geo-coordinates and continuously evaluate weather conditions.
              </p>
            </Card>
            <Card>
              <span className="chip">Step 2</span>
              <h3 className="mt-3 text-lg font-semibold">Alert & Match</h3>
              <p className="mt-2 text-sm text-slate-600">
                Trigger threshold alerts and match available volunteers nearby using location-based logic.
              </p>
            </Card>
            <Card>
              <span className="chip">Step 3</span>
              <h3 className="mt-3 text-lg font-semibold">Respond & Improve</h3>
              <p className="mt-2 text-sm text-slate-600">
                Track outcomes, completion metrics, and risk trends to optimize future interventions.
              </p>
            </Card>
          </div>
        </div>
      </section>

      <section id="impact" className="relative overflow-hidden border-y border-slate-200/80 bg-gradient-to-br from-white via-leaf-50/40 to-earth-50/30 py-14 sm:py-16">
        <div className="pointer-events-none absolute -left-24 -top-16 h-56 w-56 rounded-full bg-leaf-100/60 blur-3xl" />
        <div className="pointer-events-none absolute -right-20 bottom-0 h-48 w-48 rounded-full bg-earth-100/60 blur-3xl" />

        <div className="app-container relative space-y-8">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <Badge variant="leaf">Impact Snapshot</Badge>
              <h2 className="mt-3 text-3xl font-bold">Measured Outcomes, Not Just Activity</h2>
              <p className="mt-2 max-w-3xl text-slate-600">
                Forisswell strengthens response speed, coordination quality, and accountability across tree protection workflows.
              </p>
            </div>
            <a href="#features" className="btn-ghost w-fit">
              View Platform Features
            </a>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {impactIndicators.map((item) => (
              <Card key={item.label} className="border-slate-200/80 bg-white/90">
                <p className="text-xs uppercase tracking-wide text-slate-500">{item.label}</p>
                <p className="mt-2 text-2xl font-bold text-slate-900">{item.value}</p>
                <p className="mt-2 text-xs text-slate-600">{item.detail}</p>
              </Card>
            ))}
          </div>

          <div className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
            <Card className="relative overflow-hidden border-leaf-100 bg-white/95">
              <div className="absolute -right-16 -top-16 h-40 w-40 rounded-full bg-leaf-100/60" />
              <h3 className="text-xl font-semibold text-slate-900">Operational Outcomes</h3>
              <p className="mt-2 text-sm text-slate-600">
                Teams move from reactive firefighting to structured prevention with clearer signals and faster execution.
              </p>

              <div className="mt-6 space-y-4">
                {impactOutcomes.map((item, index) => (
                  <div key={item.title} className="rounded-xl border border-slate-200/80 bg-white p-4">
                    <div className="flex items-center gap-2">
                      <span className="chip">0{index + 1}</span>
                      <h4 className="text-sm font-semibold text-slate-900">{item.title}</h4>
                    </div>
                    <p className="mt-2 text-sm text-slate-600">{item.text}</p>
                  </div>
                ))}
              </div>
            </Card>

            <Card className="border-slate-200/90 bg-white/90">
              <h3 className="text-xl font-semibold text-slate-900">Community Voices</h3>
              <p className="mt-2 text-sm text-slate-600">
                Feedback from teams coordinating daily environmental monitoring and response.
              </p>

              <div className="mt-5 space-y-3 text-sm text-slate-700">
                {communityVoices.map((voice) => (
                  <blockquote key={voice.by} className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                    <p>“{voice.quote}”</p>
                    <footer className="mt-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                      {voice.by}
                    </footer>
                  </blockquote>
                ))}
              </div>
            </Card>
          </div>
        </div>
      </section>

      <footer className="app-container py-10">
        <Card className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="text-lg font-semibold">Ready to improve environmental response?</h3>
            <p className="mt-1 text-sm text-slate-600">Launch the platform and coordinate tree safety with confidence.</p>
          </div>
          {isAuthenticated ? (
            <Link to="/dashboard" className="btn-primary">
              Go to Dashboard
            </Link>
          ) : (
            <Link to="/register" className="btn-primary">
              Create Account
            </Link>
          )}
        </Card>
        <p className="mt-6 text-center text-xs text-slate-500">
          © {new Date().getFullYear()} Forisswell. Tree Care and Environmental Monitoring Platform.
        </p>
      </footer>
    </div>
  );
}

export default LandingPage;
