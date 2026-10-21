import { Text, View } from 'react-native';

type StatusTone = 'success' | 'warning' | 'error' | 'neutral';

type StatusBadgeProps = {
  label: string;
  tone?: StatusTone;
};

const toneClassNames: Record<StatusTone, { background: string; text: string }> = {
  success: { background: 'bg-success/10', text: 'text-success' },
  warning: { background: 'bg-warning/10', text: 'text-warning' },
  error: { background: 'bg-error/10', text: 'text-error' },
  neutral: { background: 'bg-secondary', text: 'text-muted' },
};

export function StatusBadge({ label, tone = 'neutral' }: StatusBadgeProps) {
  const classes = toneClassNames[tone];

  return (
    <View
      accessibilityLabel={label}
      accessibilityRole="text"
      className={`self-start rounded-full px-3 py-1 ${classes.background}`}>
      <Text className={`text-xs font-semibold ${classes.text}`}>{label}</Text>
    </View>
  );
}