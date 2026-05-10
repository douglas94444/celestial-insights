import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Sparkles, Trash2, Upload } from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import {
  profileNameSchema,
  profilePreferencesSchema,
  type ProfilePreferencesForm,
} from "@/lib/schemas/profile";
import { deleteAccountFn } from "@/lib/profile.functions";
import { withSupabaseAuth } from "@/lib/server-fn-client";
import { getServerFnErrorMessage } from "@/lib/server-fn-errors";

export const Route = createFileRoute("/_authenticated/configuracoes")({
  component: Settings,
});

function Settings() {
  const { user, session, signOut } = useAuth();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);

  const { data: profile } = useQuery({
    queryKey: ["profile", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user!.id)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const nameForm = useForm({
    resolver: zodResolver(profileNameSchema),
    defaultValues: { name: "" },
  });

  const prefForm = useForm({
    resolver: zodResolver(profilePreferencesSchema),
    defaultValues: {
      house_system: "placidus" as const,
      zodiac: "tropical" as const,
      email_notifications: true,
      transit_digest_auto: false,
      transit_digest_hour: 8,
      transit_digest_weekdays: [1, 2, 3, 4, 5] as number[],
    },
  });

  useEffect(() => {
    if (profile) {
      nameForm.reset({ name: profile.name ?? "" });
      prefForm.reset({
        house_system: (profile.house_system as "placidus" | "equal" | "whole_sign") ?? "placidus",
        zodiac: (profile.zodiac as "tropical" | "sidereal") ?? "tropical",
        email_notifications: profile.email_notifications,
        transit_digest_auto: profile.transit_digest_auto ?? false,
        transit_digest_hour: profile.transit_digest_hour ?? 8,
        transit_digest_weekdays:
          Array.isArray(profile.transit_digest_weekdays) &&
          profile.transit_digest_weekdays.length > 0
            ? [...profile.transit_digest_weekdays].sort((a, b) => a - b)
            : [1, 2, 3, 4, 5],
      });
    }
  }, [profile, nameForm, prefForm]);

  async function saveName(values: { name: string }) {
    const { error } = await supabase
      .from("profiles")
      .update({ name: values.name })
      .eq("id", user!.id);
    if (error) toast.error(error.message);
    else {
      toast.success("Perfil atualizado");
      qc.invalidateQueries({ queryKey: ["profile", user!.id] });
    }
  }

  async function savePrefs(values: ProfilePreferencesForm) {
    const { error } = await supabase
      .from("profiles")
      .update({
        house_system: values.house_system,
        zodiac: values.zodiac,
        email_notifications: values.email_notifications,
        transit_digest_auto: values.transit_digest_auto,
        transit_digest_hour: values.transit_digest_hour,
        transit_digest_weekdays: values.transit_digest_weekdays,
      })
      .eq("id", user!.id);
    if (error) toast.error(error.message);
    else {
      toast.success("Preferências salvas");
      qc.invalidateQueries({ queryKey: ["profile", user!.id] });
    }
  }

  async function onAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    const ext = file.name.split(".").pop()?.toLowerCase();
    if (!ext || !["jpg", "jpeg", "png", "webp", "gif"].includes(ext)) {
      toast.error("Use JPG, PNG, WebP ou GIF.");
      return;
    }
    const path = `${user.id}/avatar.${ext}`;
    const { error: upErr } = await supabase.storage
      .from("avatars")
      .upload(path, file, { upsert: true });
    if (upErr) {
      toast.error(upErr.message);
      return;
    }
    const {
      data: { publicUrl },
    } = supabase.storage.from("avatars").getPublicUrl(path);
    const { error } = await supabase
      .from("profiles")
      .update({ avatar_url: publicUrl })
      .eq("id", user.id);
    if (error) toast.error(error.message);
    else {
      toast.success("Foto atualizada");
      qc.invalidateQueries({ queryKey: ["profile", user!.id] });
    }
    e.target.value = "";
  }

  async function handleDeleteAccount() {
    if (
      !confirm(
        "Excluir sua conta permanentemente? Seus mapas e dados serão apagados. Esta ação não pode ser desfeita.",
      )
    ) {
      return;
    }
    try {
      await deleteAccountFn({ ...withSupabaseAuth(session) });
      await signOut();
      navigate({ to: "/", replace: true });
      toast.success("Conta excluída.");
    } catch (e: unknown) {
      toast.error(await getServerFnErrorMessage(e));
    }
  }

  return (
    <div className="container mx-auto p-6 max-w-3xl">
      <h1 className="font-display text-3xl font-bold mb-6">Configurações</h1>
      <Tabs defaultValue="perfil">
        <TabsList>
          <TabsTrigger value="perfil">Perfil</TabsTrigger>
          <TabsTrigger value="assinatura">Assinatura</TabsTrigger>
          <TabsTrigger value="preferencias">Preferências</TabsTrigger>
          <TabsTrigger value="privacidade">Privacidade</TabsTrigger>
        </TabsList>

        <TabsContent value="perfil" className="mt-4 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Foto</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-wrap items-center gap-4">
              <Avatar className="h-20 w-20 border border-accent/30">
                <AvatarImage src={profile?.avatar_url ?? undefined} alt="" />
                <AvatarFallback className="bg-primary/15 text-lg">
                  {(profile?.name ?? user?.email)?.[0]?.toUpperCase() ?? "?"}
                </AvatarFallback>
              </Avatar>
              <input
                ref={fileRef}
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif"
                className="hidden"
                onChange={onAvatarChange}
              />
              <Button type="button" variant="outline" onClick={() => fileRef.current?.click()}>
                <Upload className="mr-2 h-4 w-4" /> Enviar foto
              </Button>
              <p className="text-xs text-muted-foreground w-full">
                Armazenamento seguro no Supabase (bucket público). Máx. recomendado 5 MB.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <Form {...nameForm}>
                <form onSubmit={nameForm.handleSubmit(saveName)} className="space-y-4">
                  <FormField
                    control={nameForm.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Nome</FormLabel>
                        <FormControl>
                          <Input {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <div className="space-y-2">
                    <Label>Email</Label>
                    <Input value={user?.email ?? ""} disabled />
                  </div>
                  <Button type="submit" className="bg-mystical text-white">
                    Salvar nome
                  </Button>
                </form>
              </Form>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="assinatura" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                Plano atual
                <Badge variant={profile?.subscription_tier === "PREMIUM" ? "default" : "secondary"}>
                  {profile?.subscription_tier ?? "FREE"}
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Assinatura paga ainda não disponível — em breve!
              </p>
              <Button disabled className="bg-mystical text-white">
                <Sparkles className="mr-1 h-4 w-4" /> Assinar Premium · R$ 24,90/mês
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="preferencias" className="mt-4">
          <Card>
            <CardContent className="p-6">
              <Form {...prefForm}>
                <form onSubmit={prefForm.handleSubmit(savePrefs)} className="space-y-6">
                  <FormField
                    control={prefForm.control}
                    name="house_system"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Sistema de casas (próximos cálculos)</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="placidus">Placidus</SelectItem>
                            <SelectItem value="equal">Casas iguais</SelectItem>
                            <SelectItem value="whole_sign">Signo inteiro</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={prefForm.control}
                    name="zodiac"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Zodíaco</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="tropical">Tropical</SelectItem>
                            <SelectItem value="sidereal">Sideral</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={prefForm.control}
                    name="email_notifications"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                        <div className="space-y-0.5">
                          <FormLabel className="text-base">Notificações por email</FormLabel>
                          <p className="text-sm text-muted-foreground">
                            Permite enviar resumos de trânsitos a partir da página Trânsitos (botão
                            «Email hoje»). O servidor precisa da variável{" "}
                            <code className="text-xs">RESEND_API_KEY</code> e, recomendado,{" "}
                            <code className="text-xs">RESEND_FROM_EMAIL</code>.
                          </p>
                        </div>
                        <FormControl>
                          <Switch checked={field.value} onCheckedChange={field.onChange} />
                        </FormControl>
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={prefForm.control}
                    name="transit_digest_auto"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                        <div className="space-y-0.5">
                          <FormLabel className="text-base">
                            Digest diário automático de trânsitos
                          </FormLabel>
                          <p className="text-sm text-muted-foreground">
                            Quando ativo, um job no servidor (cron com segredo{" "}
                            <code className="text-xs">TRANSIT_DIGEST_CRON_SECRET</code>) pode enviar
                            o resumo do dia no horário abaixo — fuso America/Sao_Paulo. Requer{" "}
                            <code className="text-xs">SUPABASE_SERVICE_ROLE_KEY</code> no servidor.
                          </p>
                        </div>
                        <FormControl>
                          <Switch checked={field.value} onCheckedChange={field.onChange} />
                        </FormControl>
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={prefForm.control}
                    name="transit_digest_hour"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Hora preferida do digest (São Paulo)</FormLabel>
                        <Select
                          onValueChange={(v) => field.onChange(Number(v))}
                          value={String(field.value)}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent className="max-h-[220px]">
                            {Array.from({ length: 24 }, (_, h) => (
                              <SelectItem key={h} value={String(h)}>
                                {String(h).padStart(2, "0")}:00
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={prefForm.control}
                    name="transit_digest_weekdays"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Dias da semana (digest automático)</FormLabel>
                        <p className="text-sm text-muted-foreground mb-2">
                          0 = domingo … 6 = sábado (mesmo critério do calendário local).
                        </p>
                        <div className="flex flex-wrap gap-2">
                          {["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"].map((lab, idx) => {
                            const on = field.value.includes(idx);
                            return (
                              <Button
                                key={lab}
                                type="button"
                                size="sm"
                                variant={on ? "secondary" : "outline"}
                                onClick={() => {
                                  const next = on
                                    ? field.value.filter((n: number) => n !== idx)
                                    : [...field.value, idx].sort((a, b) => a - b);
                                  field.onChange(next.length ? next : [idx]);
                                }}
                              >
                                {lab}
                              </Button>
                            );
                          })}
                        </div>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <Button type="submit" className="bg-mystical text-white">
                    Salvar preferências
                  </Button>
                </form>
              </Form>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="privacidade" className="mt-4">
          <Card className="border-destructive/40">
            <CardHeader>
              <CardTitle className="text-destructive">Zona de perigo</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Excluir conta remove seu usuário do AstroMap e todos os mapas associados. Exige{" "}
                <code className="rounded bg-muted px-1 text-xs">SUPABASE_SERVICE_ROLE_KEY</code> no
                servidor.
              </p>
              <Button variant="destructive" onClick={handleDeleteAccount}>
                <Trash2 className="mr-2 h-4 w-4" /> Excluir minha conta
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
