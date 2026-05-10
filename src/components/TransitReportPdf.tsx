import { Document, Page, Text, View, StyleSheet } from "@react-pdf/renderer";
import type { TransitDayPayload } from "@/lib/astrology/transits";
import { formatTransitDayTitle } from "@/lib/astrology/transits";
import { ASPECT_LABELS } from "@/data/chart-detail-interpretations";
import { PLANETS } from "@/lib/astrology/zodiac";

const styles = StyleSheet.create({
  page: { padding: 40, fontSize: 10, fontFamily: "Helvetica" },
  h1: { fontSize: 18, marginBottom: 8 },
  h2: { fontSize: 12, marginTop: 12, marginBottom: 4 },
  muted: { color: "#555", marginBottom: 12 },
  row: { marginBottom: 3 },
  box: { marginTop: 8, padding: 8, backgroundColor: "#f4f0fb", borderRadius: 4 },
});

function planetName(key: string) {
  return PLANETS.find((p) => p.key === key)?.name ?? key;
}

interface Props {
  chartName: string;
  startDate: string;
  endDate: string;
  days: TransitDayPayload[];
}

export function TransitReportPdf({ chartName, startDate, endDate, days }: Props) {
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <Text style={styles.h1}>Relatório de trânsitos</Text>
        <Text style={styles.muted}>
          Mapa: {chartName} · Período: {startDate} a {endDate} · Meio-dia UTC por dia civil
        </Text>
        <Text style={styles.muted}>
          Indicadores para reflexão — não substituem consulta profissional.
        </Text>

        {days.map((day) => (
          <View key={day.date} wrap={false} style={{ marginBottom: 14 }}>
            <Text style={styles.h2}>{formatTransitDayTitle(day.date)}</Text>
            <Text style={styles.row}>
              Lua (trânsito): {day.transitMoonSign || "—"} · Intensidade: {day.intensity}/100
            </Text>
            {day.narrative.slice(0, 4).map((line, i) => (
              <Text key={i} style={styles.row}>
                • {line}
              </Text>
            ))}
            <View style={styles.box}>
              {day.aspects.slice(0, 10).map((a, i) => (
                <Text key={i} style={styles.row}>
                  {planetName(a.planet1)} trans. {ASPECT_LABELS[a.type]} {planetName(a.planet2)}{" "}
                  natal ({a.orb}°)
                </Text>
              ))}
              {day.aspects.length > 10 ? (
                <Text style={styles.row}>… +{day.aspects.length - 10} aspectos</Text>
              ) : null}
            </View>
          </View>
        ))}
      </Page>
    </Document>
  );
}
