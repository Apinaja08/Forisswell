import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import FeedbackMessage from "../components/ui/FeedbackMessage";
import AuthFrame from "../components/auth/AuthFrame";

function RegisterPage() {
  const { register, loading } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({
    fullName: "",
    email: "",
    password: "",
    role: "user",
  });
  const [error, setError] = useState("");

  const onSubmit = async (e) => {
    e.preventDefault();
    setError("");

    try {
      await register(form);
      navigate("/dashboard", { replace: true });
    } catch (err) {
      setError(err.response?.data?.message || err.response?.data?.error || "Registration failed");
    }
  };

  return (
    <AuthFrame
      showPanel={false}
      formTitle="Create Account"
      formDescription="Complete your details to access the platform."
      footer={
        <>
          Already have an account?{" "}
          <Link to="/login" className="font-semibold text-leaf-700 hover:text-leaf-800">
            Login
          </Link>
        </>
      }
    >
      <form className="space-y-4" onSubmit={onSubmit}>
        <div>
          <label className="label" htmlFor="fullName">Full Name</label>
          <input
            id="fullName"
            className="input"
            type="text"
            placeholder="Your full name"
            value={form.fullName}
            onChange={(e) => setForm((prev) => ({ ...prev, fullName: e.target.value }))}
            required
          />
        </div>

        <div>
          <label className="label" htmlFor="registerEmail">Email</label>
          <input
            id="registerEmail"
            className="input"
            type="email"
            placeholder="you@example.com"
            value={form.email}
            onChange={(e) => setForm((prev) => ({ ...prev, email: e.target.value }))}
            required
          />
        </div>

        <div>
          <label className="label" htmlFor="registerPassword">Password</label>
          <input
            id="registerPassword"
            className="input"
            type="password"
            placeholder="At least 8 characters"
            value={form.password}
            onChange={(e) => setForm((prev) => ({ ...prev, password: e.target.value }))}
            minLength={8}
            required
          />
        </div>

        <div>
          <label className="label" htmlFor="role">Account Type</label>
          <select
            id="role"
            className="input"
            value={form.role}
            onChange={(e) => setForm((prev) => ({ ...prev, role: e.target.value }))}
          >
            <option value="user">User</option>
            <option value="volunteer">Volunteer</option>
          </select>
        </div>

        {error ? <FeedbackMessage tone="error">{error}</FeedbackMessage> : null}

        <button className="btn-primary w-full" type="submit" disabled={loading}>
          {loading ? "Creating account..." : "Create Account"}
        </button>
      </form>
    </AuthFrame>
  );
}

export default RegisterPage;
