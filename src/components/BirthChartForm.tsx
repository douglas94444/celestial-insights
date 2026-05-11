import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
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
import { CityCombobox } from "@/components/CityCombobox";
import type { City } from "@/lib/cities-br";
import { birthChartInputSchema } from "@/lib/schemas/birth-chart";
import { createChartFn } from "@/lib/charts.functions";
import type { CreateChartFnResult } from "@/lib/types/server-fn-results";
import { withSupabaseAuth } from "@/lib/server-fn-client";
import { getServerFnErrorMessage } from "@/lib/server-fn-errors";
import { BRAZIL_TIMEZONE_OFFSETS, formatTimezoneLabel } from "@/lib/timezone-br";
import type { Session } from "@supabase/supabase-js";
import { toast } from "sonner";
import { Info } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

const formSchema = z
  .object({
    name: z.string().trim().min(1).max(120),
    birthDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    birthTime: z.string().regex(/^\d{2}:\d{2}$/),
    unknownTime: z.boolean(),
    advanced: z.boolean(),
    city: z.custom<City | null>((v) => v === null || (typeof v === "object" && "lat" in v)),
    birthPlaceManual: z.string().optional(),
    latitude: z.number().gte(-90).lte(90).optional(),
    longitude: z.number().gte(-180).lte(180).optional(),
    timezoneOffsetManual: z.number().int().min(-660).max(840),
  })
  .superRefine((data, ctx) => {
    if (!data.advanced && !data.city) {
      ctx.addIssue({
        code: "custom",
        message: "Selecione uma cidade ou use o modo avançado.",
        path: ["city"],
      });
    }
    if (data.advanced) {
      if (data.latitude === undefined || Number.isNaN(data.latitude)) {
        ctx.addIssue({ code: "custom", message: "Latitude obrigatória.", path: ["latitude"] });
      }
      if (data.longitude === undefined || Number.isNaN(data.longitude)) {
        ctx.addIssue({ code: "custom", message: "Longitude obrigatória.", path: ["longitude"] });
      }
      const place = data.birthPlaceManual?.trim();
      if (!place) {
        ctx.addIssue({
          code: "custom",
          message: "Descreva o local de nascimento.",
          path: ["birthPlaceManual"],
        });
      }
    }
  });

type FormValues = z.infer<typeof formSchema>;

function toPayload(values: FormValues): z.infer<typeof birthChartInputSchema> {
  const birthTime = values.unknownTime ? "12:00" : values.birthTime;
  if (values.advanced) {
    return birthChartInputSchema.parse({
      name: values.name,
      birthDate: values.birthDate,
      birthTime,
      birthTimeKnown: !values.unknownTime,
      birthPlace: values.birthPlaceManual!.trim(),
      latitude: values.latitude!,
      longitude: values.longitude!,
      timezone: formatTimezoneLabel(values.timezoneOffsetManual),
      timezoneOffsetMinutes: values.timezoneOffsetManual,
      setPrimary: false,
    });
  }
  const c = values.city!;
  return birthChartInputSchema.parse({
    name: values.name,
    birthDate: values.birthDate,
    birthTime,
    birthTimeKnown: !values.unknownTime,
    birthPlace: `${c.name}, ${c.state}`,
    latitude: c.lat,
    longitude: c.lon,
    timezone: formatTimezoneLabel(c.tz),
    timezoneOffsetMinutes: c.tz,
    setPrimary: false,
  });
}

export interface BirthChartFormProps {
  session: Session | null;
  submitLabel: string;
  /** Primeiro mapa: marca como primário no servidor. */
  setPrimary: boolean;
  defaultName?: string;
  onSuccess: (chartId: string, displayName: string) => void | Promise<void>;
  onSubmittingChange?: (loading: boolean) => void;
}

export function BirthChartForm({
  session,
  submitLabel,
  setPrimary,
  defaultName = "",
  onSuccess,
  onSubmittingChange,
}: BirthChartFormProps) {
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: defaultName,
      birthDate: "",
      birthTime: "12:00",
      unknownTime: false,
      advanced: false,
      city: null,
      birthPlaceManual: "",
      latitude: undefined,
      longitude: undefined,
      timezoneOffsetManual: -180,
    },
  });

  const advanced = form.watch("advanced");
  const unknownTime = form.watch("unknownTime");

  async function onSubmit(values: FormValues) {
    const base = toPayload(values);
    const payload = { ...base, setPrimary };
    onSubmittingChange?.(true);
    try {
      const auth = withSupabaseAuth(session);
      const result: CreateChartFnResult = await createChartFn({
        data: payload,
        ...auth,
      });
      await onSuccess(result.chart.id, values.name.trim());
    } catch (e: unknown) {
      const msg = await getServerFnErrorMessage(e);
      toast.error(msg);
    } finally {
      onSubmittingChange?.(false);
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Nome</FormLabel>
              <FormControl>
                <Input {...field} autoComplete="name" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid grid-cols-2 gap-3">
          <FormField
            control={form.control}
            name="birthDate"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Data de nascimento</FormLabel>
                <FormControl>
                  <Input type="date" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="birthTime"
            render={({ field }) => (
              <FormItem>
                <div className="flex items-center gap-1.5">
                  <FormLabel className="m-0">Hora</FormLabel>
                  <TooltipProvider delayDuration={200}>
                    <Tooltip>
                      <TooltipTrigger
                        type="button"
                        className="text-muted-foreground hover:text-foreground"
                      >
                        <Info className="h-3.5 w-3.5" aria-label="Sobre precisão da hora" />
                      </TooltipTrigger>
                      <TooltipContent side="top" className="max-w-[260px] text-xs">
                        ±4 minutos de diferença equivalem a ~1° no Ascendente. Hora aproximada é
                        aceitável.
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
                <FormControl>
                  <Input type="time" disabled={unknownTime} {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="unknownTime"
          render={({ field }) => (
            <FormItem className="flex flex-row items-center gap-2 space-y-0">
              <FormControl>
                <Checkbox checked={field.value} onCheckedChange={(c) => field.onChange(!!c)} />
              </FormControl>
              <Label>Não sei a hora exata (usaremos 12:00)</Label>
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="advanced"
          render={({ field }) => (
            <FormItem className="flex flex-row items-center gap-2 space-y-0">
              <FormControl>
                <Checkbox checked={field.value} onCheckedChange={(c) => field.onChange(!!c)} />
              </FormControl>
              <Label>Modo avançado (latitude / longitude manual)</Label>
            </FormItem>
          )}
        />

        {!advanced ? (
          <FormField
            control={form.control}
            name="city"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Local de nascimento</FormLabel>
                <CityCombobox value={field.value} onChange={(c) => field.onChange(c)} />
                <FormMessage />
              </FormItem>
            )}
          />
        ) : (
          <>
            <FormField
              control={form.control}
              name="birthPlaceManual"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Local (texto livre)</FormLabel>
                  <FormControl>
                    <Input placeholder="Ex.: Hospital X, cidade/UF" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="grid grid-cols-2 gap-3">
              <FormField
                control={form.control}
                name="latitude"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Latitude</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="0.000001"
                        value={field.value ?? ""}
                        onChange={(e) =>
                          field.onChange(e.target.value === "" ? undefined : Number(e.target.value))
                        }
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="longitude"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Longitude</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="0.000001"
                        value={field.value ?? ""}
                        onChange={(e) =>
                          field.onChange(e.target.value === "" ? undefined : Number(e.target.value))
                        }
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <FormField
              control={form.control}
              name="timezoneOffsetManual"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Fuso horário de nascimento</FormLabel>
                  <Select
                    value={String(field.value)}
                    onValueChange={(v) => field.onChange(Number(v))}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {BRAZIL_TIMEZONE_OFFSETS.map((tz) => (
                        <SelectItem key={tz.minutes} value={String(tz.minutes)}>
                          {tz.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
          </>
        )}

        <Button
          type="submit"
          disabled={form.formState.isSubmitting}
          className="w-full bg-mystical text-white"
        >
          {form.formState.isSubmitting ? "Calculando..." : submitLabel}
        </Button>
      </form>
    </Form>
  );
}
