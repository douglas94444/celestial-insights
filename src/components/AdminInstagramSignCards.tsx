import { useCallback, useMemo, useRef, useState } from "react";
import { Download, Loader2, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ShareableMomentCard, CARD_THEMES } from "@/components/ShareableMomentCard";
import { ALL_SIGN_NAMES, buildAdminShareCardModel } from "@/lib/admin-instagram-sign-cards";
import type { SignName } from "@/lib/astrology/zodiac";
import { SIGNS } from "@/lib/astrology/zodiac";

function civilDateIsoSaoPaulo(d = new Date()): string {
  return d.toLocaleDateString("en-CA", { timeZone: "America/Sao_Paulo" });
}

function newSeriesSalt(): string {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2, 12)}`;
}

export function AdminInstagramSignCards() {
  const cardRef = useRef<HTMLDivElement>(null);
  const [civilDate, setCivilDate] = useState(() => civilDateIsoSaoPaulo());
  const [seriesSalt, setSeriesSalt] = useState(newSeriesSalt);
  const [namePrefix, setNamePrefix] = useState("Momento");
  const [selectedSign, setSelectedSign] = useState<SignName>(ALL_SIGN_NAMES[0]!);
  const [exporting, setExporting] = useState(false);

  const model = useMemo(
    () =>
      buildAdminShareCardModel(selectedSign, {
        civilDateStr: civilDate,
        seriesSalt,
        namePrefix,
      }),
    [selectedSign, civilDate, seriesSalt, namePrefix],
  );

  const previewScale = "min(1, calc((100vw - 48px) / 1080))";

  const handleDownload = useCallback(async () => {
    const el = cardRef.current;
    if (!el) {
      toast.error("Cartão não encontrado para exportar.");
      return;
    }
    setExporting(true);
    try {
      const { captureMomentShareCardPng, downloadBlob } = await import("@/lib/share-card-export");
      const blob = await captureMomentShareCardPng(el, {
        pixelRatio: 1,
        backgroundColor: CARD_THEMES[model.themeKey].bg,
      });
      const safeSign = selectedSign.normalize("NFD").replace(/\p{M}/gu, "");
      await downloadBlob(blob, `astromap-cartao-admin-${civilDate}-${safeSign}.png`);
      toast.success("PNG guardado.");
    } catch {
      toast.error("Não foi possível gerar o PNG.");
    } finally {
      setExporting(false);
    }
  }, [civilDate, model.themeKey, selectedSign]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-display text-xl">Cartões Instagram por signo</CardTitle>
        <CardDescription>
          Exemplos para marketing: um mapa sintético por signo solar (Sol a meio do signo), com
          sorte e cor do dia variáveis. Não correspondem a utilizadores reais.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-end">
          <div className="space-y-2">
            <Label htmlFor="admin-card-date">Data civil (SP)</Label>
            <Input
              id="admin-card-date"
              type="date"
              value={civilDate}
              onChange={(e) => setCivilDate(e.target.value)}
              className="w-full max-w-[220px]"
            />
          </div>
          <div className="space-y-2 flex-1 min-w-[160px] max-w-xs">
            <Label htmlFor="admin-card-prefix">Prefixo do nome no cartão</Label>
            <Input
              id="admin-card-prefix"
              value={namePrefix}
              onChange={(e) => setNamePrefix(e.target.value)}
              placeholder="Momento"
            />
          </div>
          <Button
            type="button"
            variant="secondary"
            className="shrink-0"
            onClick={() => setSeriesSalt(newSeriesSalt())}
          >
            <RefreshCw className="mr-2 h-4 w-4" aria-hidden />
            Regenerar série
          </Button>
        </div>

        <div>
          <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Signo solar
          </p>
          <div className="flex flex-wrap gap-2">
            {ALL_SIGN_NAMES.map((sign) => {
              const meta = SIGNS.find((s) => s.name === sign);
              const active = sign === selectedSign;
              return (
                <button
                  key={sign}
                  type="button"
                  onClick={() => setSelectedSign(sign)}
                  className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm transition-colors ${
                    active
                      ? "border-primary bg-primary/10 text-foreground"
                      : "border-border bg-muted/30 text-muted-foreground hover:bg-muted/50"
                  }`}
                >
                  <span aria-hidden>{meta?.symbol}</span>
                  {sign}
                </button>
              );
            })}
          </div>
        </div>

        <div className="flex justify-center overflow-x-auto pb-4 pt-2">
          <div
            className="relative"
            style={{
              transform: `scale(${previewScale})`,
              transformOrigin: "top center",
            }}
          >
            <ShareableMomentCard
              ref={cardRef}
              displayName={model.displayName}
              identityLine={model.identityLine}
              quoteLines={model.quoteLines}
              dominantElement={model.dominantElement}
              purposeLine={model.purposeLine}
              luckToday={model.luckToday}
              todayColor={model.todayColor}
              astroBullets={model.astroBullets}
              brandHandle={model.brandHandle}
              shareCtaUrl={model.shareCtaUrl}
              wheelData={model.wheelData}
              wheelSize={400}
              theme={CARD_THEMES[model.themeKey]}
              showWheel
            />
            {exporting ? (
              <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-2 rounded-md bg-black/60">
                <Loader2 className="h-8 w-8 animate-spin text-white" aria-hidden />
                <p className="text-xs text-white">Gerando imagem…</p>
              </div>
            ) : null}
          </div>
        </div>

        <div className="flex flex-wrap justify-center gap-2">
          <Button
            type="button"
            className="bg-mystical text-white hover:opacity-90"
            disabled={exporting}
            onClick={() => void handleDownload()}
          >
            {exporting ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden />
            ) : (
              <Download className="mr-2 h-4 w-4" aria-hidden />
            )}
            Descarregar PNG (1080×1350)
          </Button>
        </div>

        <p className="text-center text-[11px] leading-relaxed text-muted-foreground">
          Gere de novo com «Regenerar série» para outra combinação de sorte, cor e tema por signo.
          Exporte um ficheiro por signo selecionando cada botão acima.
        </p>
      </CardContent>
    </Card>
  );
}
