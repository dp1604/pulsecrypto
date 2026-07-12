import { StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { colors, typography } from "../theme";

type PlaceholderScreenProps = {
  title: string;
  subtitle: string;
  note: string;
};

export const PlaceholderScreen = ({
  title,
  subtitle,
  note
}: PlaceholderScreenProps) => (
  <SafeAreaView style={styles.safeArea} edges={["top", "left", "right"]}>
    <View style={styles.container}>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.subtitle}>{subtitle}</Text>
      <View style={styles.noteCard}>
        <Text style={styles.noteLabel}>Foundation status</Text>
        <Text style={styles.note}>{note}</Text>
      </View>
    </View>
  </SafeAreaView>
);

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background
  },
  container: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 24,
    gap: 12
  },
  title: {
    ...typography.screenTitle,
    color: colors.textPrimary,
    fontSize: 28
  },
  subtitle: {
    ...typography.placeholderBody,
    color: colors.textSecondary,
    fontSize: 15
  },
  noteCard: {
    marginTop: 12,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    gap: 8
  },
  noteLabel: {
    ...typography.sectionEyebrow,
    color: colors.textMuted,
    fontSize: 12
  },
  note: {
    ...typography.bodySecondary,
    color: colors.textSecondary
  }
});
