import { Link } from "react-router-dom";
import Card from "../components/ui/Card";

function NotFoundPage() {
  return (
    <section className="py-8">
      <Card className="mx-auto max-w-xl text-center">
        <p className="chip">404</p>
        <h1 className="mt-4 text-3xl font-bold">Page Not Found</h1>
        <p className="mx-auto mt-2 max-w-md text-sm text-slate-600 sm:text-base">
          The page you requested does not exist or may have been moved. Return to the dashboard to continue.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <Link to="/" className="btn-secondary">
            Go Home
          </Link>
          <Link to="/dashboard" className="btn-primary">
            Open Dashboard
          </Link>
        </div>
      </Card>
    </section>
  );
}

export default NotFoundPage;
