import { Asset } from "expo-asset";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useMemo } from "react";
import {
    Image,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";
import { SvgUri } from "react-native-svg";

import { useExpenseStore } from "@/lib/store/expense-store";

const trainIconUri = Asset.fromModule(
  require("../../../assets/expense-screen/train.svg"),
).uri;
const senderSignatureUri = Asset.fromModule(
  require("../../../assets/expense-screen/sender-signature.svg"),
).uri;
const receiverSignatureUri = Asset.fromModule(
  require("../../../assets/expense-screen/reciever-signature.svg"),
).uri;

function formatCurrency(amount: number) {
  return `$${amount.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

export default function ExpenseDetailScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ id?: string }>();
  const { getExpenseById } = useExpenseStore();

  const expense = useMemo(() => {
    const id = Array.isArray(params.id) ? params.id[0] : params.id;
    return id ? getExpenseById(id) : undefined;
  }, [getExpenseById, params.id]);

  if (!expense) {
    return (
      <View style={styles.emptyStateContainer}>
        <Text style={styles.emptyStateTitle}>Expense not found</Text>
        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => router.back()}
        >
          <Text style={styles.actionButtonText}>Go back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.topBar}>
          <TouchableOpacity onPress={() => router.back()} hitSlop={12}>
            <Text style={styles.backText}>{"< Back"}</Text>
          </TouchableOpacity>
          <Text style={styles.topTitle}>Expense detail</Text>
          <View style={styles.topBarSpacer} />
        </View>

        <View style={styles.titleRow}>
          <View style={styles.iconShell}>
            <SvgUri width="100%" height="100%" uri={trainIconUri} />
          </View>
          <Text style={styles.expenseTitle}>{expense.title}</Text>
        </View>

        <View style={styles.divider} />

        <View style={styles.paidRow}>
          <Image source={expense.paidByAvatar} style={styles.avatar} />
          <View style={styles.paidTextBlock}>
            <Text style={styles.paidText}>
              You paid <Text style={styles.paidAmount}>{formatCurrency(expense.amount)}</Text>
            </Text>
            <Text style={styles.metaText}>
              {expense.date} · {expense.description}
            </Text>
          </View>
        </View>

        <View style={styles.shareList}>
          {expense.participants.map((participant) => {
            const owesYou = participant.amount > 0 && !participant.isCurrentUser;
            const shareLabel = participant.isCurrentUser
              ? "You owe"
              : owesYou
                ? `${participant.name} owes you`
                : `${participant.name} owes nothing`;

            return (
              <View key={participant.id} style={styles.shareRow}>
                <Text style={styles.shareBullet}>•</Text>
                <Text style={styles.shareLabel}>{shareLabel}</Text>
                <Text
                  style={[
                    styles.shareAmount,
                    owesYou ? styles.shareOrange : styles.shareGreen,
                  ]}
                >
                  {formatCurrency(participant.amount)}
                </Text>
              </View>
            );
          })}
        </View>

        <View style={styles.notePlainBlock}>
          <Text style={styles.noteLabel}>NOTES</Text>
          <Text style={styles.noteText}>{expense.notes}</Text>
        </View>

        <View style={styles.termsCard}>
          <Text style={styles.termsTitle}>Terms &amp; Conditions</Text>
          <View style={styles.termsList}>
            {expense.terms.map((term, index) => (
              <View key={`${term}-${index}`} style={styles.termRow}>
                <Text style={styles.termIndex}>{index + 1}</Text>
                <Text style={styles.termText}>{term}</Text>
              </View>
            ))}
          </View>

          <View style={styles.signatureRow}>
            <View style={styles.signatureBlock}>
              <Text style={styles.signatureLabel}>Sender&apos;s signature</Text>
              <View style={styles.signatureGraphic}>
                <SvgUri width="100%" height="100%" uri={senderSignatureUri} />
              </View>
            </View>

            <View style={styles.signatureBlock}>
              <Text style={styles.signatureLabel}>Receiver&apos;s signature</Text>
              <View style={styles.signatureGraphic}>
                <SvgUri width="100%" height="100%" uri={receiverSignatureUri} />
              </View>
            </View>
          </View>
        </View>

        
        {/*
        <View style={styles.actionStack}>
          <TouchableOpacity style={styles.primaryAction} onPress={() => {}}>
            <Text style={styles.primaryActionText}>Settle expense</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.secondaryAction} onPress={() => {}}>
            <Text style={styles.secondaryActionText}>Edit expense</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.dangerAction} onPress={() => {}}>
            <Text style={styles.dangerActionText}>Delete expense</Text>
          </TouchableOpacity>
        </View>
        */}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 28,
  },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 18,
  },
  backText: {
    color: "#3B82F6",
    fontFamily: "Nunito_600SemiBold",
    fontSize: 16,
  },
  topTitle: {
    color: "#141414",
    fontFamily: "Nunito_600SemiBold",
    fontSize: 17,
  },
  topBarSpacer: {
    width: 52,
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 4,
  },
  iconShell: {
    width: 32,
    height: 32,
  },
  expenseTitle: {
    flex: 1,
    color: "#141414",
    fontFamily: "Nunito_700Bold",
    fontSize: 32,
    lineHeight: 36,
  },
  divider: {
    height: 1,
    backgroundColor: "#ECE7D8",
    marginVertical: 14,
  },
  paidRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  avatar: {
    width: 34,
    height: 34,
    borderRadius: 17,
    marginRight: 10,
  },
  paidTextBlock: {
    flex: 1,
  },
  paidText: {
    color: "#1F2937",
    fontFamily: "Nunito_600SemiBold",
    fontSize: 15,
    lineHeight: 20,
  },
  paidAmount: {
    color: "#141414",
    fontFamily: "Nunito_700Bold",
  },
  metaText: {
    marginTop: 2,
    color: "#6B7280",
    fontFamily: "Nunito_400Regular",
    fontSize: 12,
    lineHeight: 16,
  },
  shareList: {
    marginTop: 14,
    gap: 6,
  },
  shareRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  shareBullet: {
    color: "#7A7A7A",
    fontSize: 18,
    marginTop: -2,
  },
  shareLabel: {
    flex: 1,
    color: "#4B5563",
    fontFamily: "Nunito_400Regular",
    fontSize: 14,
  },
  shareAmount: {
    fontFamily: "Nunito_700Bold",
    fontSize: 14,
  },
  shareGreen: {
    color: "#44BB73",
  },
  shareOrange: {
    color: "#F28C28",
  },
  notePlainBlock: {
    marginTop: 12,
    paddingHorizontal: 4,
  },
  noteLabel: {
    color: "#9CA3AF",
    fontFamily: "Nunito_600SemiBold",
    fontSize: 12,
    textTransform: "uppercase",
    letterSpacing: 0.6,
    marginBottom: 6,
  },
  noteText: {
    color: "#141414",
    fontFamily: "Nunito_400Regular",
    fontSize: 14,
    lineHeight: 20,
  },
  termsCard: {
    marginTop: 16,
    borderRadius: 12,
    backgroundColor: "#F9F0BF",
    padding: 16,
  },
  termsTitle: {
    textAlign: "center",
    color: "#141414",
    fontFamily: "Nunito_600SemiBold",
    fontSize: 16,
    marginBottom: 10,
  },
  termsList: {
    gap: 10,
  },
  termRow: {
    flexDirection: "row",
    gap: 10,
    alignItems: "flex-start",
  },
  termIndex: {
    width: 16,
    color: "#6E6E6E",
    fontFamily: "Nunito_600SemiBold",
    fontSize: 14,
    lineHeight: 18,
  },
  termText: {
    flex: 1,
    color: "#1E1E1E",
    fontFamily: "Nunito_400Regular",
    fontSize: 14,
    lineHeight: 18,
  },
  signatureRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 16,
    marginTop: 20,
  },
  signatureBlock: {
    flex: 1,
  },
  signatureLabel: {
    color: "#6E6E6E",
    fontFamily: "Nunito_400Regular",
    fontSize: 12,
    marginBottom: 8,
    textAlign: "center",
  },
  signatureGraphic: {
    height: 70,
  },
  actionStack: {
    marginTop: 18,
    gap: 10,
  },
  primaryAction: {
    backgroundColor: "#141414",
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: "center",
  },
  primaryActionText: {
    color: "#FFFFFF",
    fontFamily: "Nunito_700Bold",
    fontSize: 15,
  },
  secondaryAction: {
    backgroundColor: "rgba(255,255,255,0.9)",
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  secondaryActionText: {
    color: "#141414",
    fontFamily: "Nunito_600SemiBold",
    fontSize: 15,
  },
  dangerAction: {
    backgroundColor: "#FFF1F2",
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#FECACA",
  },
  dangerActionText: {
    color: "#B91C1C",
    fontFamily: "Nunito_700Bold",
    fontSize: 15,
  },
  emptyStateContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 24,
    backgroundColor: "#FFFFFF",
  },
  emptyStateTitle: {
    color: "#141414",
    fontFamily: "Nunito_700Bold",
    fontSize: 22,
    marginBottom: 16,
  },
  actionButton: {
    backgroundColor: "#141414",
    borderRadius: 12,
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  actionButtonText: {
    color: "#FFFFFF",
    fontFamily: "Nunito_600SemiBold",
    fontSize: 14,
  },
});
