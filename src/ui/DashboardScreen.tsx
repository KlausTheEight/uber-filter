import React, {useMemo, useRef, useState} from 'react';
import {
  ScrollView,
  StatusBar,
  StyleSheet,
  Switch,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import {InMemoryStorage, SettingsStore} from '../data/settingsStore';
import {parseOfferFromTextNodes} from '../domain/parser/OfferParser';
import {evaluateOffer} from '../domain/RulesEngine';
import {AppSettings, TrafficLight} from '../domain/types';
import {SIMULATOR_PRESETS} from './OfferSimulatorPresets';

const LIGHT_THEME: Record<
  TrafficLight,
  {cardBg: string; badgeBg: string; label: string}
> = {
  GREEN: {cardBg: '#15803D', badgeBg: '#166534', label: 'VERDE'},
  YELLOW: {cardBg: '#A16207', badgeBg: '#854D0E', label: 'AMARILLO'},
  RED: {cardBg: '#B91C1C', badgeBg: '#991B1B', label: 'ROJO'},
  UNKNOWN: {cardBg: '#334155', badgeBg: '#1E293B', label: 'REVISAR'},
};

function buildSimulatedDate(isNightMode: boolean): Date {
  return new Date(2026, 10, 25, isNightMode ? 22 : 15, 0, 0);
}

export function DashboardScreen(): React.JSX.Element {
  const storeRef = useRef(new SettingsStore(new InMemoryStorage()));
  const [settings, setSettings] = useState<AppSettings>(() =>
    storeRef.current.getAll(),
  );
  const [selectedPresetId, setSelectedPresetId] = useState<string>(
    SIMULATOR_PRESETS[0].id,
  );
  const [simulateNight, setSimulateNight] = useState<boolean>(false);

  const updateSettings = (partial: Partial<AppSettings>): void => {
    const next = storeRef.current.update(partial);
    setSettings(next);
  };

  const selectedPreset =
    SIMULATOR_PRESETS.find(item => item.id === selectedPresetId) ??
    SIMULATOR_PRESETS[0];

  const {offer, evaluation} = useMemo(() => {
    const parsed = parseOfferFromTextNodes(selectedPreset.textNodes, {
      includePickupDistance: settings.includePickupDistance,
      detectedAtIso: buildSimulatedDate(simulateNight).toISOString(),
    });
    const evaluated = evaluateOffer(parsed, settings, {
      now: buildSimulatedDate(simulateNight),
    });
    return {offer: parsed, evaluation: evaluated};
  }, [selectedPreset, settings, simulateNight]);

  const theme = LIGHT_THEME[evaluation.light];

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" />
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text style={styles.appTitle}>UberFilter · Quilicura</Text>
          <Text style={styles.appSubtitle}>
            Motor de reglas en vivo (Bloque 1A)
          </Text>
        </View>

        {/* Tarjeta Semáforo (preview del futuro Overlay) */}
        <View style={[styles.lightCard, {backgroundColor: theme.cardBg}]}>
          <View style={styles.lightCardHeader}>
            <View style={[styles.badge, {backgroundColor: theme.badgeBg}]}>
              <Text style={styles.badgeText}>{theme.label}</Text>
            </View>
            <Text style={styles.clockBadge}>
              Hora sim: {simulateNight ? '22:00 (Noche)' : '15:00 (Día)'}
            </Text>
          </View>

          <Text style={styles.headline}>{evaluation.displayHeadline}</Text>
          <Text style={styles.subline}>{evaluation.displaySubline}</Text>

          <View style={styles.metricsRow}>
            <Text style={styles.metricText}>
              Monto: {offer.priceClp !== null ? `$${offer.priceClp}` : 'n/d'}
            </Text>
            <Text style={styles.metricText}>
              Dist: {offer.totalKm !== null ? `${offer.totalKm} km` : 'n/d'}
            </Text>
            <Text style={styles.metricText}>
              Pago: {offer.isCash ? 'Efectivo' : 'Tarjeta'}
            </Text>
          </View>

          <Text style={styles.reasonsText}>
            Motivos: {evaluation.allReasons.join(' · ')}
          </Text>
          {evaluation.autoRejectDelaySec !== null && (
            <Text style={styles.timerText}>
              Auto-rechazo en {evaluation.autoRejectDelaySec}s (
              {settings.dryRunMode ? 'Dry-Run' : 'Real'})
            </Text>
          )}
        </View>

        {/* Selector de Tarjetas Simuladas */}
        <Text style={styles.sectionTitle}>Simular tarjeta Uber</Text>
        <View style={styles.presetsGrid}>
          {SIMULATOR_PRESETS.map(preset => {
            const active = preset.id === selectedPreset.id;
            return (
              <TouchableOpacity
                key={preset.id}
                style={[styles.presetBtn, active && styles.presetBtnActive]}
                onPress={() => setSelectedPresetId(preset.id)}>
                <Text
                  style={[
                    styles.presetLabel,
                    active && styles.presetLabelActive,
                  ]}>
                  {preset.label}
                </Text>
                <Text style={styles.presetDesc}>{preset.description}</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Controles rápidos de reglas */}
        <Text style={styles.sectionTitle}>Ajustes rápidos en vivo</Text>
        <View style={styles.panel}>
          <View style={styles.row}>
            <View>
              <Text style={styles.rowLabel}>Tarifa mínima ($/km)</Text>
              <Text style={styles.rowHint}>
                Amarillo sobre $
                {Math.round(
                  (settings.minRateClpPerKm *
                    (100 - settings.yellowTolerancePercent)) /
                    100,
                )}
                /km
              </Text>
            </View>
            <View style={styles.stepper}>
              <TouchableOpacity
                style={styles.stepBtn}
                onPress={() =>
                  updateSettings({
                    minRateClpPerKm: Math.max(200, settings.minRateClpPerKm - 50),
                  })
                }>
                <Text style={styles.stepBtnText}>-50</Text>
              </TouchableOpacity>
              <Text style={styles.stepValue}>${settings.minRateClpPerKm}</Text>
              <TouchableOpacity
                style={styles.stepBtn}
                onPress={() =>
                  updateSettings({
                    minRateClpPerKm: settings.minRateClpPerKm + 50,
                  })
                }>
                <Text style={styles.stepBtnText}>+50</Text>
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.divider} />

          <View style={styles.row}>
            <View style={styles.rowTextWrap}>
              <Text style={styles.rowLabel}>Simular horario nocturno (22:00)</Text>
              <Text style={styles.rowHint}>
                Bloquea efectivo de {settings.cashRejectStartTime} a{' '}
                {settings.cashRejectEndTime}
              </Text>
            </View>
            <Switch value={simulateNight} onValueChange={setSimulateNight} />
          </View>

          <View style={styles.divider} />

          <View style={styles.row}>
            <View style={styles.rowTextWrap}>
              <Text style={styles.rowLabel}>Solo exigir destino en Quilicura</Text>
              <Text style={styles.rowHint}>
                Modo actual: {settings.workZoneMode}
              </Text>
            </View>
            <Switch
              value={settings.workZoneMode === 'DESTINATION_ONLY'}
              onValueChange={val =>
                updateSettings({
                  workZoneMode: val ? 'DESTINATION_ONLY' : 'BOTH_INSIDE',
                })
              }
            />
          </View>

          <View style={styles.divider} />

          <View style={styles.row}>
            <View style={styles.rowTextWrap}>
              <Text style={styles.rowLabel}>Incluir distancia de recogida</Text>
              <Text style={styles.rowHint}>
                Recogida: {offer.pickupKm ?? 0} km · Viaje: {offer.tripKm ?? 0} km
              </Text>
            </View>
            <Switch
              value={settings.includePickupDistance}
              onValueChange={val => updateSettings({includePickupDistance: val})}
            />
          </View>

          <View style={styles.divider} />

          <View style={styles.row}>
            <View style={styles.rowTextWrap}>
              <Text style={styles.rowLabel}>Simular timer de auto-rechazo</Text>
              <Text style={styles.rowHint}>
                Rojo {settings.redAutoRejectSeconds}s · Amarillo{' '}
                {settings.redAutoRejectSeconds * settings.yellowTimerMultiplier}s
              </Text>
            </View>
            <Switch
              value={settings.autoRejectEnabled}
              onValueChange={val => updateSettings({autoRejectEnabled: val})}
            />
          </View>
        </View>

        {/* Direcciones extraídas */}
        <View style={styles.debugBox}>
          <Text style={styles.debugTitle}>Lectura del OfferParser</Text>
          <Text style={styles.debugLine}>
            Origen: {offer.originText ?? 'No detectado'}
          </Text>
          <Text style={styles.debugLine}>
            Destino: {offer.destinationText ?? 'No detectado'}
          </Text>
          <Text style={styles.debugLine}>Hash: {offer.offerHash}</Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#0F172A',
    paddingTop: 44,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingBottom: 32,
  },
  header: {
    marginBottom: 14,
  },
  appTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#F8FAFC',
  },
  appSubtitle: {
    fontSize: 13,
    color: '#94A3B8',
    marginTop: 2,
  },
  lightCard: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 18,
  },
  lightCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
  },
  badgeText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 12,
    letterSpacing: 0.5,
  },
  clockBadge: {
    color: '#E2E8F0',
    fontSize: 12,
    fontWeight: '600',
  },
  headline: {
    color: '#FFFFFF',
    fontSize: 22,
    fontWeight: '800',
  },
  subline: {
    color: '#F1F5F9',
    fontSize: 14,
    marginTop: 4,
  },
  metricsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.2)',
  },
  metricText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '600',
  },
  reasonsText: {
    color: '#E2E8F0',
    fontSize: 12,
    marginTop: 8,
  },
  timerText: {
    color: '#FEF08A',
    fontSize: 13,
    fontWeight: '700',
    marginTop: 6,
  },
  sectionTitle: {
    color: '#CBD5E1',
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  presetsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 18,
  },
  presetBtn: {
    width: '48.5%',
    backgroundColor: '#1E293B',
    borderWidth: 1,
    borderColor: '#334155',
    borderRadius: 12,
    padding: 10,
  },
  presetBtnActive: {
    borderColor: '#38BDF8',
    backgroundColor: '#172554',
  },
  presetLabel: {
    color: '#F8FAFC',
    fontWeight: '700',
    fontSize: 13,
  },
  presetLabelActive: {
    color: '#7DD3FC',
  },
  presetDesc: {
    color: '#94A3B8',
    fontSize: 11,
    marginTop: 3,
  },
  panel: {
    backgroundColor: '#1E293B',
    borderRadius: 14,
    padding: 14,
    marginBottom: 16,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 6,
  },
  rowTextWrap: {
    flex: 1,
    paddingRight: 12,
  },
  rowLabel: {
    color: '#F8FAFC',
    fontSize: 14,
    fontWeight: '600',
  },
  rowHint: {
    color: '#94A3B8',
    fontSize: 12,
    marginTop: 2,
  },
  divider: {
    height: 1,
    backgroundColor: '#334155',
    marginVertical: 8,
  },
  stepper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  stepBtn: {
    backgroundColor: '#334155',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  stepBtnText: {
    color: '#F8FAFC',
    fontWeight: '700',
    fontSize: 13,
  },
  stepValue: {
    color: '#38BDF8',
    fontWeight: '800',
    fontSize: 15,
    minWidth: 48,
    textAlign: 'center',
  },
  debugBox: {
    backgroundColor: '#111827',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#1F2937',
  },
  debugTitle: {
    color: '#94A3B8',
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 6,
  },
  debugLine: {
    color: '#CBD5E1',
    fontSize: 12,
    marginBottom: 2,
  },
});
