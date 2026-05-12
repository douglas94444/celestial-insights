import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { useProfile } from "@/hooks/use-profile";
import { useEffect, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Trash2, Upload } from "lucide-react";
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
  ENGAGEMENT_ROUTES,
  ENGAGEMENT_TOPICS,
  insertEngagementEventDeduped,
} from "@/lib/engagement";
import { parseFocusAreasFromProfileJson } from "@/lib/user-astro-profile";
import {
  profileNameSchema,
  profilePreferencesSchema,
  personalizationToneSchema,
  type FocusAreaKey,
  type ProfilePreferencesForm,
} from "@/lib/schemas/profile";
import { deleteAccountFn } from "@/lib/profile.functions";
import { withSupabaseAuth } from "@/lib/server-fn-client";
import { shrinkImageForAvatar } from "@/lib/shrink-image-for-avatar";
import { toastServerFnError } from "@/lib/toast-server-fn-error";

export const Route = createFileRoute("/_authenticated/configuracoes")({
  component: Settings,
});

const FOCUS_AREA_LABELS: Record<FocusAreaKey, string> = {
  AMOR: "Amor & vínculos",
  CARREIRA: "Carreira & propósito",
  SAUDE: "Saúde & corpo",
  FAMILIA: "Família & raízes",
  FINANCAS: "Finanças & recursos",
  ESPIRITUALIDADE: "Espiritualidade & sentido",
};

const SUBSCRIPTION_TIER_LABEL: Record<string, string> = {
  MENSAL: "Mensal",
  ANUAL: "Anual",
  PREMIUM: "Premium (legado)",
  FREE: "Mensal",
};

function Settings() {
  const { user, session, signOut } = useAuth();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);
  const [billingCpf, setBillingCpf] = useState("");
  const [billingPhone, setBillingPhone] = useState("");

  const { data: profile } = useProfile();
  const tierRaw = profile?.subscription_tier ?? "MENSAL";
  const tierLabel = SUBSCRIPTION_TIER_LABEL[tierRaw] ?? "Mensal";
  const tierBadgeVariant =
    tierRaw === "MENSAL" || tierRaw === "ANUAL" || tierRaw === "PREMIUM" ? "default" : "secondary";

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
      moment_daily_email: false,
      transit_digest_auto: false,
      transit_digest_hour: 8,
      transit_digest_weekdays: [1, 2, 3, 4, 5] as number[],
      personalization_gender: "NONE",
      personalization_tone: "PRATICO",
      personalization_focus_areas: [] as FocusAreaKey[],
    },
  });

  useEffect(() => {
    if (profile) {
      nameForm.reset({ name: profile.name ?? "" });
      prefForm.reset({
        house_system: (profile.house_system as "placidus" | "equal" | "whole_sign") ?? "placidus",
        zodiac: (profile.zodiac as "tropical" | "sidereal") ?? "tropical",
        email_notifications: profile.email_notifications,
        moment_daily_email: profile.moment_daily_email ?? false,
        transit_digest_auto: profile.transit_digest_auto ?? false,
        transit_digest_hour: profile.transit_digest_hour ?? 8,
        transit_digest_weekdays:
          Array.isArray(profile.transit_digest_weekdays) &&
          profile.transit_digest_weekdays.length > 0
            ? [...profile.transit_digest_weekdays].sort((a, b) => a - b)
            : [1, 2, 3, 4, 5],
        personalization_gender:
          profile.personalization_gender === "M" ||
          profile.personalization_gender === "F" ||
          profile.personalization_gender === "NB" ||
          profile.personalization_gender === "OTHER"
            ? profile.personalization_gender
            : "NONE",
        personalization_tone: (() => {
          const r = personalizationToneSchema.safeParse(profile.personalization_tone);
          return r.success ? r.data : "PRATICO";
        })(),
        personalization_focus_areas: parseFocusAreasFromProfileJson(
          profile.personalization_focus_areas,
        ),
      });
    }
  }, [profile, nameForm, prefForm]);

  useEffect(() => {
    if (profile?.billing_cpf) setBillingCpf(profile.billing_cpf);
    if (profile?.billing_phone) setBillingPhone(profile.billing_phone);
  }, [profile?.billing_cpf, profile?.billing_phone]);

  async function saveBilling() {
    const cpf = billingCpf.replace(/\D/g, "");
    const phone = billingPhone.replace(/\D/g, "");
    if (cpf.length !== 11) {
      toast.error("CPF deve ter 11 dígitos.");
      return;
    }
    if (phone.length < 10 || phone.length > 11) {
      toast.error("Telefone deve ter 10 ou 11 dígitos (com DDD).");
      return;
    }
    const { error } = await supabase
      .from("profiles")
      .update({ billing_cpf: cpf, billing_phone: phone })
      .eq("id", user!.id);
    if (error) toast.error(error.message);
    else {
      toast.success("Dados de cobrança guardados");
      qc.invalidateQueries({ queryKey: ["profile", user!.id] });
    }
  }

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
        moment_daily_email: values.moment_daily_email,
        transit_digest_auto: values.transit_digest_auto,
        transit_digest_hour: values.transit_digest_hour,
        transit_digest_weekdays: values.transit_digest_weekdays,
        personalization_gender:
          values.personalization_gender === "NONE" ? null : values.personalization_gender,
        personalization_tone: values.personalization_tone,
        personalization_focus_areas: values.personalization_focus_areas,
      })
      .eq("id", user!.id);
    if (error) toast.error(error.message);
    else {
      toast.success("Preferências salvas");
      insertEngagementEventDeduped(supabase, user!.id, {
        route_key: ENGAGEMENT_ROUTES.configuracoes,
        topic_key: ENGAGEMENT_TOPICS.prefs_saved,
      });
      qc.invalidateQueries({ queryKey: ["profile", user!.id] });
    }
  }

  async function onAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
    const raw = e.target.files?.[0];
    if (!raw || !user) return;
    const extRaw = raw.name.split(".").pop()?.toLowerCase();
    if (!extRaw || !["jpg", "jpeg", "png", "webp", "gif"].includes(extRaw)) {
      toast.error("Use JPG, PNG, WebP ou GIF.");
      return;
    }
    if (raw.size > 5 * 1024 * 1024) {
      toast.error("Arquivo muito grande. Use uma imagem com menos de 5 MB.");
      return;
    }
    const file = await shrinkImageForAvatar(raw);
    const ext = file.type === "image/gif" ? "gif" : "jpg";
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
      void toastServerFnError(e);
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
                <AvatarImage
                  src={profile?.avatar_url ?? undefined}
                  alt=""
                  loading="lazy"
                  decoding="async"
                  fetchPriority="low"
                  width={80}
                  height={80}
                />
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
                JPG/PNG/WebP são otimizados no navegador (~512px) antes do envio. GIF não é
                redimensionado. Máx. recomendado 5 MB no ficheiro original. A foto fica num URL
                público partilhável (bucket Supabase); não use imagens que não queira que terceiros
                possam abrir com o link.
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

        <TabsContent value="assinatura" className="mt-4 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                Plano atual
                <Badge variant={tierBadgeVariant}>{tierLabel}</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Pagamento Pix (SyncPay) na página Premium. Guarde CPF e telefone abaixo para
                agilizar o checkout.
              </p>
              <Button asChild variant="outline" className="w-full sm:w-auto">
                <Link to="/premium">Ver planos e pagar com Pix</Link>
              </Button>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Dados para cobrança Pix</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Usados apenas para gerar o Pix na SyncPay. Armazenados no seu perfil.
              </p>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="cfg-billing-cpf">CPF (11 dígitos)</Label>
                  <Input
                    id="cfg-billing-cpf"
                    inputMode="numeric"
                    value={billingCpf}
                    onChange={(e) => setBillingCpf(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="cfg-billing-phone">Telefone com DDD</Label>
                  <Input
                    id="cfg-billing-phone"
                    inputMode="tel"
                    value={billingPhone}
                    onChange={(e) => setBillingPhone(e.target.value)}
                  />
                </div>
              </div>
              <Button type="button" onClick={() => void saveBilling()}>
                Guardar dados de cobrança
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
                    name="moment_daily_email"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                        <div className="space-y-0.5">
                          <FormLabel className="text-base">Lembrete «Momento de hoje»</FormLabel>
                          <p className="text-sm text-muted-foreground">
                            Email curto com sorte/cor do dia e link para <strong>Momento</strong>.
                            Usa a mesma hora e dias da semana que o digest de trânsitos abaixo.
                            Defina <code className="text-xs">APP_PUBLIC_URL</code> no servidor para
                            um link clicável (ex.: https://seu-dominio.com).
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

                  <div className="rounded-lg border border-primary/15 bg-muted/10 p-4 space-y-4">
                    <p className="text-sm font-medium">Personalização para IA astrológica</p>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      Estas preferências entram nos prompts das mensagens profundas, da linha de
                      essência e da sinastria — não alteram os cálculos do mapa.
                    </p>
                    <FormField
                      control={prefForm.control}
                      name="personalization_tone"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Tom dos textos</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="PRATICO">Prático</SelectItem>
                              <SelectItem value="MOTIVACIONAL">Motivacional</SelectItem>
                              <SelectItem value="REALISTA">Realista</SelectItem>
                              <SelectItem value="ESPIRITUAL">Espiritual suave</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={prefForm.control}
                      name="personalization_gender"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Género (opcional)</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Prefiro não indicar" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="NONE">Prefiro não indicar</SelectItem>
                              <SelectItem value="M">Homem</SelectItem>
                              <SelectItem value="F">Mulher</SelectItem>
                              <SelectItem value="NB">Não-binário</SelectItem>
                              <SelectItem value="OTHER">Outro</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={prefForm.control}
                      name="personalization_focus_areas"
                      render={({ field }) => {
                        const selected = field.value ?? [];
                        return (
                          <FormItem>
                            <FormLabel>Áreas de foco (até 6)</FormLabel>
                            <p className="text-xs text-muted-foreground mb-2">
                              Ajuda a orientar exemplos nas mensagens geradas por IA.
                            </p>
                            <div className="flex flex-wrap gap-2">
                              {(Object.keys(FOCUS_AREA_LABELS) as FocusAreaKey[]).map((key) => {
                                const on = selected.includes(key);
                                return (
                                  <Button
                                    key={key}
                                    type="button"
                                    size="sm"
                                    variant={on ? "secondary" : "outline"}
                                    disabled={!on && selected.length >= 6}
                                    onClick={() => {
                                      const next = on
                                        ? selected.filter((k: FocusAreaKey) => k !== key)
                                        : selected.length < 6
                                          ? [...selected, key]
                                          : selected;
                                      field.onChange(next);
                                    }}
                                  >
                                    {FOCUS_AREA_LABELS[key]}
                                  </Button>
                                );
                              })}
                            </div>
                            <FormMessage />
                          </FormItem>
                        );
                      }}
                    />
                  </div>

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
