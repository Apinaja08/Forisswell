import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import FeedbackMessage from "../components/ui/FeedbackMessage";
import AuthFrame from "../components/auth/AuthFrame";

function LoginPage() {
  const { login, loading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [form, setForm] = useState({ email: "", password: "" });
  const [error, setError] = useState("");

  const from = location.state?.from?.pathname || "/dashboard";

  const onSubmit = async (e) => {
    e.preventDefault();
    setError("");

    try {
      await login(form);
      navigate(from, { replace: true });
    } catch (err) {
      setError(err.response?.data?.message || err.response?.data?.error || "Login failed");
    }
  };

  return (
    <AuthFrame
      showPanel={false}
      formTitle="Sign In"
      formDescription="Use your account credentials to continue."
      footer={
        <>
          No account yet?{" "}
          <Link to="/register" className="font-semibold text-leaf-700 hover:text-leaf-800">
            Create one
          </Link>
        </>
      }
    >
      <form className="space-y-4" onSubmit={onSubmit}>
        <div>
          <label className="label" htmlFor="email">Email</label>
          <input
            id="email"
            className="input"
            type="email"
            placeholder="you@example.com"
            value={form.email}
            onChange={(e) => setForm((prev) => ({ ...prev, email: e.target.value }))}
            required
          />
        </div>

        <div>
          <label className="label" htmlFor="password">Password</label>
          <input
            id="password"
            className="input"
            type="password"
            placeholder="Enter your password"
            value={form.password}
            onChange={(e) => setForm((prev) => ({ ...prev, password: e.target.value }))}
            required
          />
        </div>

        {error ? <FeedbackMessage tone="error">{error}</FeedbackMessage> : null}

        <button className="btn-primary w-full" type="submit" disabled={loading}>
          {loading ? "Signing in..." : "Sign In"}
        </button>
      </form>
    </AuthFrame>
  );
}

export default LoginPage;
