import { Text, View } from 'react-native';

type SectionHeaderProps = {
  title: string;
  description?: string;
};

export function SectionHeader({ title, description }: SectionHeaderProps) {
  return (
    <View className="gap-1">
      <Text className="text-lg font-semibold text-text">{title}</Text>
      {description ? <Text className="text-sm text-muted">{description}</Text> : null}
    </View>
  );
}