import { useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { CityCombobox } from "@/components/CityCombobox";
import type { City } from "@/lib/cities-br";
import { calculateChart } from "@/lib/astrology/calculate";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";

export const Route = createFileRoute("/_authenticated/onboarding")({
  component: Onboarding,
});

const LOADING_MSGS = [
  "Consultando as estrelas...",
  "Alinhando os planetas...",
  "Calculando seu Ascendente...",
  "Mapeando as casas astrológicas...",
];

function Onboarding() {
  const [step, setStep] = useState(0);
  const [name, setName] = useState("");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("12:00");
  const [unknownTime, setUnknownTime] = useState(false);
  const [city, setCity] = useState<City | null>(null);
  const [busy, setBusy] = useState(false);
  const [msgIdx, setMsgIdx] = useState(0);
  const navigate = useNavigate();
  const { user } = useAuth();

  async function handleSubmit() {
    if (!city || !date || !user) return;
    setBusy(true);
    setStep(2);
    const interval = setInterval(() => setMsgIdx((i) => (i + 1) % LOADING_MSGS.length), 1200);
    try {
      const chart = calculateChart({
        birthDate: date,
        birthTime: unknownTime ? "12:00" : time,
        latitude: city.lat,
        longitude: city.lon,
        timezoneOffset: city.tz,
      });

      const { data, error } = await supabase
        .from("charts")
        .insert({
          user_id: user.id,
          name,
          birth_date: date,
          birth_time: unknownTime ? "12:00" : time,
          birth_time_known: !unknownTime,
          birth_place: `${city.name}, ${city.state}`,
          latitude: city.lat,
          longitude: city.lon,
          timezone: `UTC${city.tz >= 0 ? "+" : ""}${city.tz / 60}`,
          planets_data: chart.planets as never,
          houses_data: chart.houses as never,
          aspects_data: chart.aspects as never,
          is_primary: true,
        })
        .select()
        .single();

      clearInterval(interval);
      if (error) throw error;
      toast.success("Seu mapa está pronto!");
      navigate({ to: "/mapas/$id", params: { id: data.id } });
    } catch (e) {
      clearInterval(interval);
      console.error(e);
      toast.error("Erro ao criar o mapa. Tente novamente.");
      setBusy(false);
      setStep(1);
    }
  }

  return (
    <div className="container mx-auto max-w-xl px-4 py-12">
      <AnimatePresence mode="wait">
        {step === 0 && (
          <motion.div
            key="welcome"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="text-center"
          >
            <Sparkles className="mx-auto h-16 w-16 text-primary" />
            <h1 className="mt-6 font-display text-3xl font-bold">Bem-vindo ao AstroMap ✨</h1>
            <p className="mt-3 text-muted-foreground">
              Vamos criar seu primeiro mapa astral. Leva menos de um minuto.
            </p>
            <Button onClick={() => setStep(1)} className="mt-8 bg-mystical text-white" size="lg">
              Começar
            </Button>
          </motion.div>
        )}

        {step === 1 && (
          <motion.div
            key="form"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="space-y-5"
          >
            <h1 className="font-display text-2xl font-bold">Seus dados de nascimento</h1>

            <div className="space-y-2">
              <Label htmlFor="name">Nome</Label>
              <Input id="name" value={name} onChange={(e) => setName(e.target.value)} />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="date">Data de nascimento</Label>
                <Input id="date" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="time">Hora</Label>
                <Input
                  id="time"
                  type="time"
                  value={time}
                  disabled={unknownTime}
                  onChange={(e) => setTime(e.target.value)}
                />
              </div>
            </div>

            <label className="flex items-center gap-2 text-sm">
              <Checkbox
                checked={unknownTime}
                onCheckedChange={(c) => setUnknownTime(!!c)}
              />
              Não sei a hora exata (usaremos 12:00)
            </label>

            <div className="space-y-2">
              <Label>Local de nascimento</Label>
              <CityCombobox value={city} onChange={setCity} />
            </div>

            <Button
              onClick={handleSubmit}
              disabled={!name || !date || !city || busy}
              className="w-full bg-mystical text-white"
              size="lg"
            >
              Calcular meu mapa
            </Button>
          </motion.div>
        )}

        {step === 2 && (
          <motion.div
            key="loading"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-20"
          >
            <Loader2 className="mx-auto h-16 w-16 animate-spin text-primary" />
            <motion.p
              key={msgIdx}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="mt-6 font-display text-lg"
            >
              {LOADING_MSGS[msgIdx]}
            </motion.p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
