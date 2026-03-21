import { Link } from "react-router-dom";
import Card from "./Card";

function EmptyState({ title, description, actionLabel, actionTo }) {
  return (
    <Card className="text-center">
      <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-leaf-100 text-leaf-700">
        <span className="text-xl font-semibold">0</span>
      </div>
      <h3 className="text-lg font-semibold">{title}</h3>
      <p className="mx-auto mt-2 max-w-xl text-sm text-slate-600">{description}</p>
      {actionLabel && actionTo ? (
        <Link className="btn-primary mt-5" to={actionTo}>
          {actionLabel}
        </Link>
      ) : null}
    </Card>
  );
}

export default EmptyState;
