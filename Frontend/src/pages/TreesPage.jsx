import { useEffect, useMemo, useState } from "react";
import api from "../services/api";
import LoadingSpinner from "../components/common/LoadingSpinner";

function TreesPage() {
  const [trees, setTrees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [status, setStatus] = useState("");
  const [species, setSpecies] = useState("");

  useEffect(() => {
    const fetchTrees = async () => {
      setLoading(true);
      setError("");

      try {
        const params = {};
        if (status) params.status = status;
        if (species) params.species = species;

        const response = await api.get("/trees", { params });
        setTrees(response.data.data?.trees || []);
      } catch (err) {
        setError(err.response?.data?.message || "Failed to load trees");
      } finally {
        setLoading(false);
      }
    };

    fetchTrees();
  }, [status, species]);

  const speciesList = useMemo(
    () => Array.from(new Set(trees.map((tree) => tree.species).filter(Boolean))),
    [trees]
  );

  return (
    <section className="space-y-4">
      <div className="card">
        <h1 className="text-xl font-semibold">Trees</h1>
        <p className="text-sm text-slate-600">Connected to `GET /api/trees`</p>
      </div>

      <div className="card grid gap-3 sm:grid-cols-2">
        <select className="input" value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="">All status</option>
          <option value="PLANTED">PLANTED</option>
          <option value="GROWING">GROWING</option>
          <option value="MATURE">MATURE</option>
          <option value="DEAD">DEAD</option>
        </select>

        <select className="input" value={species} onChange={(e) => setSpecies(e.target.value)}>
          <option value="">All species</option>
          {speciesList.map((item) => (
            <option key={item} value={item}>
              {item}
            </option>
          ))}
        </select>
      </div>

      {loading ? <LoadingSpinner label="Loading trees..." /> : null}
      {error ? <p className="text-sm text-red-600">{error}</p> : null}

      {!loading && !error ? (
        <div className="grid gap-3 md:grid-cols-2">
          {trees.map((tree) => (
            <article key={tree._id} className="card">
              <h2 className="font-semibold">{tree.name || tree.species}</h2>
              <p className="text-sm text-slate-600">Species: {tree.species}</p>
              <p className="text-sm text-slate-600">Status: {tree.status}</p>
              <p className="text-sm text-slate-600">
                Owner: {tree.owner?.fullName || "-"}
              </p>
            </article>
          ))}

          {trees.length === 0 ? <p className="text-slate-500">No trees found.</p> : null}
        </div>
      ) : null}
    </section>
  );
}

export default TreesPage;
