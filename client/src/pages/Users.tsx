import { type FormEvent, useEffect, useState } from "react";
import { api, apiErrorMessage } from "../api/client";
import { Button, Card, ErrorBanner, Field, Input, Select } from "../components/ui";
import { Modal } from "../components/Modal";
import { Badge } from "../components/Badge";
import { useAuth } from "../context/AuthContext";
import type { Role, User } from "../types";

const emptyForm = { name: "", email: "", password: "", role: "STAFF" as Role };

export function Users() {
  const { user: me } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  async function load() {
    try {
      const res = await api.get("/users");
      setUsers(res.data);
    } catch (err) {
      setError(apiErrorMessage(err));
    }
  }

  useEffect(() => {
    load();
  }, []);

  function openCreate() {
    setForm(emptyForm);
    setModalOpen(true);
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      await api.post("/users", form);
      setModalOpen(false);
      await load();
    } catch (err) {
      setError(apiErrorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  async function toggleActive(u: User) {
    try {
      await api.put(`/users/${u.id}`, { active: !u.active });
      await load();
    } catch (err) {
      setError(apiErrorMessage(err));
    }
  }

  async function changeRole(u: User, role: Role) {
    try {
      await api.put(`/users/${u.id}`, { role });
      await load();
    } catch (err) {
      setError(apiErrorMessage(err));
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-800">Users</h1>
        <Button onClick={openCreate}>+ Add User</Button>
      </div>

      <ErrorBanner message={error} />

      <Card className="overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50">
            <tr className="text-left text-xs uppercase text-slate-400">
              <th className="px-4 py-3">Name</th>
              <th className="px-4 py-3">Email</th>
              <th className="px-4 py-3">Role</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {users.map((u) => (
              <tr key={u.id}>
                <td className="px-4 py-2.5 font-medium text-slate-700">{u.name}</td>
                <td className="px-4 py-2.5 text-slate-500">{u.email}</td>
                <td className="px-4 py-2.5">
                  <Select
                    value={u.role}
                    disabled={u.id === me?.id}
                    onChange={(e) => changeRole(u, e.target.value as Role)}
                    className="!w-auto py-1"
                  >
                    <option value="ADMIN">ADMIN</option>
                    <option value="MANAGER">MANAGER</option>
                    <option value="STAFF">STAFF</option>
                  </Select>
                </td>
                <td className="px-4 py-2.5">
                  <Badge color={u.active ? "green" : "gray"}>{u.active ? "Active" : "Inactive"}</Badge>
                </td>
                <td className="px-4 py-2.5 text-right">
                  {u.id !== me?.id && (
                    <button onClick={() => toggleActive(u)} className="text-xs font-medium text-indigo-600 hover:underline">
                      {u.active ? "Deactivate" : "Activate"}
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Add User">
        <form onSubmit={handleSubmit} className="space-y-4">
          <Field label="Name">
            <Input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </Field>
          <Field label="Email">
            <Input type="email" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          </Field>
          <Field label="Password">
            <Input type="password" required minLength={6} value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
          </Field>
          <Field label="Role">
            <Select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value as Role })}>
              <option value="STAFF">STAFF</option>
              <option value="MANAGER">MANAGER</option>
              <option value="ADMIN">ADMIN</option>
            </Select>
          </Field>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="secondary" onClick={() => setModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? "Saving…" : "Create User"}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
