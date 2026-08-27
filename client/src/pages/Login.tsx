import { type FormEvent, useState } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { apiErrorMessage } from "../api/client";
import { Button, ErrorBanner, Field, Input } from "../components/ui";

export function Login() {
  const { user, login } = useAuth();
  const [email, setEmail] = useState("admin@electroshop.local");
  const [password, setPassword] = useState("admin123");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  if (user) return <Navigate to="/" replace />;

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await login(email, password);
    } catch (err) {
      setError(apiErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-100 px-4">
      <div className="w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
        <div className="mb-6 text-center">
          <div className="text-3xl">🔌</div>
          <h1 className="mt-2 text-xl font-bold text-slate-800">ElectroShop</h1>
          <p className="text-sm text-slate-500">Sign in to your shop dashboard</p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <Field label="Email">
            <Input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
          </Field>
          <Field label="Password">
            <Input type="password" required value={password} onChange={(e) => setPassword(e.target.value)} />
          </Field>
          <ErrorBanner message={error} />
          <Button type="submit" disabled={loading} className="w-full">
            {loading ? "Signing in…" : "Sign in"}
          </Button>
        </form>
        <div className="mt-5 rounded-lg bg-slate-50 p-3 text-xs text-slate-500">
          <div className="font-medium text-slate-600">Demo accounts</div>
          <div>Admin: admin@electroshop.local / admin123</div>
          <div>Staff: staff@electroshop.local / staff123</div>
        </div>
      </div>
    </div>
  );
}
