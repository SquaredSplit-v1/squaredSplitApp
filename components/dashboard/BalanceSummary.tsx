import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import Svg, { Path } from "react-native-svg";

interface BalanceSummaryProps {
  balanceToSquare: number;
  youAreOwed: number;
  youOwe: number;
  onFilterPress: () => void;
}

function FilterIcon() {
  return (
    <Svg width="24" height="24" viewBox="0 0 24 24" fill="none">
      <Path
        d="M2.62829 7.14746C2.281 7.14746 2 7.42907 2 7.77709C2 8.12511 2.28101 8.40672 2.62829 8.40672H10.8463C10.7788 7.98985 10.7788 7.56434 10.8463 7.14746H2.62829Z"
        fill="#141414"
      />
      <Path
        d="M21.4769 7.14809H18.9073C18.5809 5.21125 16.8274 3.84882 14.875 4.01347C12.9214 4.17702 11.4207 5.81384 11.4207 7.77772C11.4207 9.74161 12.9214 11.3786 14.875 11.542C16.8273 11.7068 18.5809 10.3442 18.9073 8.40735H21.4769C21.8242 8.40735 22.1052 8.12574 22.1052 7.77772C22.1052 7.4297 21.8242 7.14809 21.4769 7.14809Z"
        fill="#141414"
      />
      <Path
        d="M21.477 16.5928H13.259C13.3265 17.0097 13.3265 17.4352 13.259 17.852H21.477C21.8243 17.852 22.1053 17.5704 22.1053 17.2224C22.1053 16.8744 21.8243 16.5928 21.477 16.5928Z"
        fill="#141414"
      />
      <Path
        d="M2.62829 17.8519H5.19789C5.52432 19.7887 7.27787 21.1512 9.23025 20.9865C11.1838 20.823 12.6846 19.1861 12.6846 17.2223C12.6846 15.2584 11.1838 13.6214 9.23025 13.458C7.2779 13.2932 5.52429 14.6558 5.19789 16.5926H2.62829C2.281 16.5926 2 16.8742 2 17.2223C2 17.5703 2.28101 17.8519 2.62829 17.8519Z"
        fill="#141414"
      />
    </Svg>
  );
}

export default function BalanceSummary({
  balanceToSquare,
  youAreOwed,
  youOwe,
  onFilterPress,
}: BalanceSummaryProps) {
  const formatAmount = (amount: number) =>
    `$${amount.toLocaleString("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;

  return (
    <View style={styles.container}>
      {/* Balance to square row */}
      <View style={styles.balanceRow}>
        <View style={styles.balanceTextRow}>
          <Text style={styles.balanceLabel}>Balance to square </Text>
          <Text style={styles.balanceAmount}>
            {formatAmount(balanceToSquare)}
          </Text>
        </View>
        <TouchableOpacity onPress={onFilterPress} hitSlop={12}>
          <FilterIcon />
        </TouchableOpacity>
      </View>

      {/* You are owed */}
      <View style={styles.owedRow}>
        <Text style={styles.youAreOwedLabel}>You are owed </Text>
        <Text style={styles.youAreOwedAmount}>{formatAmount(youAreOwed)}</Text>
      </View>

      {/* You owe */}
      <View style={styles.oweRow}>
        <Text style={styles.youOweLabel}>You owe </Text>
        <Text style={styles.youOweAmount}>{formatAmount(youOwe)}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingTop: 16,
    paddingBottom: 8,
  },
  balanceRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  balanceTextRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  balanceLabel: {
    color: "#141414",
    fontFamily: "Nunito_600SemiBold",
    fontSize: 16,
    fontWeight: "600",
    lineHeight: 16,
    letterSpacing: -0.32,
  },
  balanceAmount: {
    color: "#44BB73",
    fontFamily: "Nunito_700Bold",
    fontSize: 16,
    fontWeight: "700",
    lineHeight: 16,
    letterSpacing: -0.32,
  },
  owedRow: {
    flexDirection: "row",
    alignItems: "baseline",
    marginTop: 4,
  },
  youAreOwedLabel: {
    color: "#141414",
    fontFamily: "Nunito_600SemiBold",
    fontSize: 24,
    fontWeight: "600",
    lineHeight: 28.8,
    letterSpacing: -0.48,
  },
  youAreOwedAmount: {
    color: "#44BB73",
    fontFamily: "Nunito_700Bold",
    fontSize: 20,
    fontWeight: "700",
    lineHeight: 24,
    letterSpacing: -0.4,
  },
  oweRow: {
    flexDirection: "row",
    alignItems: "baseline",
    marginTop: 2,
  },
  youOweLabel: {
    color: "#9CA3AF",
    fontFamily: "Nunito_600SemiBold",
    fontSize: 24,
    fontWeight: "600",
    lineHeight: 28.8,
    letterSpacing: -0.48,
  },
  youOweAmount: {
    color: "#D48D4F",
    fontFamily: "Nunito_700Bold",
    fontSize: 20,
    fontWeight: "700",
    lineHeight: 24,
    letterSpacing: -0.4,
  },
});
