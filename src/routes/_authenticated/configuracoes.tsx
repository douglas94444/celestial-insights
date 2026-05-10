import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Sparkles } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { useEffect, useState } from "react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/configuracoes")({
  component: Settings,
});

function Settings() {
  const { user } = useAuth();
  const [name, setName] = useState("");

  const { data: profile } = useQuery({
    queryKey: ["profile", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase.from("profiles").select("*").eq("id", user!.id).single();
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  useEffect(() => {
    if (profile) setName(profile.name ?? "");
  }, [profile]);

  async function save() {
    const { error } = await supabase.from("profiles").update({ name }).eq("id", user!.id);
    if (error) toast.error(error.message);
    else toast.success("Salvo!");
  }

  return (
    <div className="container mx-auto p-6 max-w-3xl">
      <h1 className="font-display text-3xl font-bold mb-6">Configurações</h1>
      <Tabs defaultValue="perfil">
        <TabsList>
          <TabsTrigger value="perfil">Perfil</TabsTrigger>
          <TabsTrigger value="assinatura">Assinatura</TabsTrigger>
          <TabsTrigger value="preferencias">Preferências</TabsTrigger>
        </TabsList>

        <TabsContent value="perfil" className="mt-4">
          <Card>
            <CardContent className="p-6 space-y-4">
              <div className="space-y-2">
                <Label>Nome</Label>
                <Input value={name} onChange={(e) => setName(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Email</Label>
                <Input value={user?.email ?? ""} disabled />
              </div>
              <Button onClick={save} className="bg-mystical text-white">Salvar</Button>
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
            <CardContent className="p-6 text-sm text-muted-foreground">
              Sistema de casas, zodíaco e notificações: em breve.
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
