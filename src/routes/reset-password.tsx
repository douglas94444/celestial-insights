import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/reset-password")({
  component: ResetPassword,
});

function ResetPassword() {
  const [email, setEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [busy, setBusy] = useState(false);

  // If URL contains type=recovery hash, show new password form.
  const isRecovery = typeof window !== "undefined" && window.location.hash.includes("type=recovery");

  async function requestReset(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    setBusy(false);
    if (error) toast.error(error.message);
    else toast.success("Enviamos um email com o link de recuperação.");
  }

  async function updatePassword(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    setBusy(false);
    if (error) toast.error(error.message);
    else toast.success("Senha atualizada! Você já pode entrar.");
  }

  return (
    <div className="min-h-screen grid place-items-center px-4">
      <div className="w-full max-w-md rounded-2xl border bg-card p-8 shadow-soft">
        <h1 className="font-display text-2xl font-semibold">
          {isRecovery ? "Nova senha" : "Recuperar senha"}
        </h1>
        {isRecovery ? (
          <form onSubmit={updatePassword} className="mt-6 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="np">Nova senha</Label>
              <Input id="np" type="password" required minLength={6} value={newPassword} onChange={(e) => setNewPassword(e.target.value)} />
            </div>
            <Button type="submit" disabled={busy} className="w-full bg-mystical text-white">
              {busy ? "Salvando..." : "Atualizar senha"}
            </Button>
          </form>
        ) : (
          <form onSubmit={requestReset} className="mt-6 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="re">Email</Label>
              <Input id="re" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>
            <Button type="submit" disabled={busy} className="w-full bg-mystical text-white">
              {busy ? "Enviando..." : "Enviar link"}
            </Button>
          </form>
        )}
        <Link to="/auth" className="mt-4 block text-center text-xs text-muted-foreground hover:text-primary">
          Voltar para o login
        </Link>
      </div>
    </div>
  );
}
