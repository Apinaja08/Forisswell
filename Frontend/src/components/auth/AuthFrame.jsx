import Card from "../ui/Card";

function AuthFrame({
  badge,
  panelTitle,
  panelDescription,
  highlights = [],
  formTitle,
  formDescription,
  children,
  footer,
  showPanel = true,
}) {
  return (
    <section
      className={
        showPanel
          ? "relative mx-auto grid w-full max-w-6xl items-stretch gap-6 lg:grid-cols-[1.15fr_0.95fr]"
          : "relative mx-auto w-full max-w-xl"
      }
    >
      {showPanel ? (
        <Card className="relative hidden overflow-hidden border-leaf-100 bg-gradient-to-br from-white to-leaf-50 lg:flex">
          <div className="absolute -left-10 top-8 h-40 w-40 rounded-full bg-leaf-100/70 blur-2xl" />
          <div className="absolute -right-16 -bottom-12 h-48 w-48 rounded-full bg-blue-100/50 blur-2xl" />

          <div className="relative flex w-full flex-col justify-between gap-8">
            <div>
              <p className="chip">{badge}</p>
              <h1 className="mt-5 text-3xl font-bold leading-tight">{panelTitle}</h1>
              <p className="mt-3 max-w-xl text-sm text-slate-600 sm:text-base">
                {panelDescription}
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              {highlights.map((item) => (
                <div key={item.title} className="surface-card-muted rounded-xl">
                  <p className="text-xs uppercase tracking-wide text-slate-500">{item.title}</p>
                  <p className="mt-1 text-sm font-semibold text-slate-900">{item.value}</p>
                </div>
              ))}
            </div>
          </div>
        </Card>
      ) : null}

      <Card className="overflow-hidden border-slate-200 bg-white p-0">
        <div className="border-b border-slate-200 bg-slate-50/70 px-6 py-5 sm:px-8">
          {showPanel && badge ? <p className="chip lg:hidden">{badge}</p> : null}
          <h2 className="mt-2 text-2xl font-bold text-slate-900">{formTitle}</h2>
          <p className="mt-1 text-sm text-slate-600">{formDescription}</p>
        </div>

        <div className="px-6 py-6 sm:px-8">
          {children}
          {footer ? <div className="mt-6 text-sm text-slate-600">{footer}</div> : null}
        </div>
      </Card>
    </section>
  );
}

export default AuthFrame;
