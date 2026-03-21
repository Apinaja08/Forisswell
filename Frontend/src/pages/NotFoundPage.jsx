import { Link } from "react-router-dom";

function NotFoundPage() {
  return (
    <section className="mx-auto max-w-lg card text-center">
      <h1 className="text-2xl font-semibold">404</h1>
      <p className="mt-2 text-slate-600">Page not found.</p>
      <Link to="/dashboard" className="btn-primary mt-4 inline-block">
        Go to Dashboard
      </Link>
    </section>
  );
}

export default NotFoundPage;
