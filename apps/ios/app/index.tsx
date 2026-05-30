import { View, Text, StyleSheet, ScrollView } from "react-native"
import { Link } from "expo-router"

// Will import from @sinan/shared once shared package is set up
type Company = {
  id: string
  name: string
  directionScore: number
}

const MOCK_COMPANIES: Company[] = [
  { id: "1", name: "北辰智造科技", directionScore: 7.8 },
  { id: "2", name: "云帆动力", directionScore: 6.5 },
  { id: "3", name: "星辰数据", directionScore: 8.2 },
]

export default function HomeScreen() {
  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>司南</Text>
        <Text style={styles.subtitle}>入职前，先看清方向</Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>热门公司</Text>
        {MOCK_COMPANIES.map((company) => (
          <View key={company.id} style={styles.card}>
            <View>
              <Text style={styles.companyName}>{company.name}</Text>
            </View>
            <View style={styles.scoreBadge}>
              <Text style={styles.scoreText}>{company.directionScore}</Text>
            </View>
          </View>
        ))}
      </View>

      <Link href="/search" style={styles.searchLink}>
        <Text style={styles.searchLinkText}>搜索公司</Text>
      </Link>
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F7F8F2" },
  header: {
    padding: 24,
    paddingTop: 60,
    backgroundColor: "#1F2937",
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  title: {
    fontSize: 32,
    fontWeight: "800",
    color: "#FFFFFF",
  },
  subtitle: {
    fontSize: 16,
    color: "#9CA3AF",
    marginTop: 8,
  },
  section: { padding: 24 },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#1F2937",
    marginBottom: 16,
  },
  card: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    padding: 16,
    borderRadius: 16,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  companyName: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1F2937",
  },
  scoreBadge: {
    backgroundColor: "#19C37D",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 4,
  },
  scoreText: {
    color: "#FFFFFF",
    fontWeight: "700",
    fontSize: 14,
  },
  searchLink: {
    margin: 24,
    padding: 16,
    backgroundColor: "#19C37D",
    borderRadius: 16,
    alignItems: "center",
  },
  searchLinkText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "700",
  },
})
