import React, {
    createContext,
    useCallback,
    useContext,
    useMemo,
    useState,
} from "react";
import { ImageSourcePropType } from "react-native";

const akAvatar = require("../../assets/dashboard/ak.png");

export type ExpenseSplitType = "exact" | "percentage";

export interface ExpenseParticipant {
  id: string;
  name: string;
  amount: number;
  splitType: ExpenseSplitType;
  settled: boolean;
  isCurrentUser?: boolean;
}

export interface ExpenseDetail {
  id: string;
  title: string;
  amount: number;
  currency: string;
  date: string;
  description: string;
  notes: string;
  splitType: ExpenseSplitType;
  paidByName: string;
  paidByAvatar: ImageSourcePropType;
  createdBy: string;
  participants: ExpenseParticipant[];
  terms: string[];
  isSettled: boolean;
}

interface ExpenseStoreContextValue {
  expenses: ExpenseDetail[];
  getExpenseById: (id: string) => ExpenseDetail | undefined;
  settleExpense: (id: string) => void;
  deleteExpense: (id: string) => void;
}

const CURRENT_USER_ID = "user-aj";

const INITIAL_EXPENSES: ExpenseDetail[] = [
  {
    id: "paid-for-car",
    title: "Paid for car",
    amount: 20000,
    currency: "USD",
    date: "24 Apr 2026",
    description: "Car payment for the trip and repairs.",
    notes: "Paid upfront by AJ after the group trip booking.",
    splitType: "exact",
    paidByName: "AJ",
    paidByAvatar: akAvatar,
    createdBy: CURRENT_USER_ID,
    participants: [
      {
        id: CURRENT_USER_ID,
        name: "You",
        amount: 0,
        splitType: "exact",
        settled: true,
        isCurrentUser: true,
      },
      {
        id: "user-paul",
        name: "Paul",
        amount: 20000,
        splitType: "exact",
        settled: false,
      },
    ],
    terms: [
      "Lorem ipsum dolor sit amet, consectetur adipiscing elit",
      "Lorem ipsum dolor sit amet, consectetur adipiscing elit",
      "Lorem ipsum dolor sit amet, consectetur adipiscing elit",
      "Lorem ipsum dolor sit amet, consectetur adipiscing elit",
      "Lorem ipsum dolor sit amet, consectetur adipiscing elit",
    ],
    isSettled: false,
  },
  {
    id: "japan-trip",
    title: "Trip to Japan",
    amount: 1485,
    currency: "USD",
    date: "8 Dec 2025",
    description: "Percentage split example for the Japan trip booking.",
    notes: "Shared across the three travelers using percentages.",
    splitType: "percentage",
    paidByName: "Deep.R",
    paidByAvatar: akAvatar,
    createdBy: "user-deep",
    participants: [
      {
        id: CURRENT_USER_ID,
        name: "You",
        amount: 495,
        splitType: "percentage",
        settled: false,
        isCurrentUser: true,
      },
      {
        id: "user-aj",
        name: "AJ",
        amount: 495,
        splitType: "percentage",
        settled: false,
      },
      {
        id: "user-deep",
        name: "Deep.R",
        amount: 495,
        splitType: "percentage",
        settled: true,
      },
    ],
    terms: [
      "All shares are calculated from the agreed percentages.",
      "Changes after settlement should create a new adjustment expense.",
      "Any rounding difference goes to the payer.",
      "Participants can settle independently for their own share.",
      "Only the creator can delete the record.",
    ],
    isSettled: false,
  },
];

const ExpenseStoreContext = createContext<ExpenseStoreContextValue | undefined>(
  undefined,
);

export function ExpenseProvider({ children }: { children: React.ReactNode }) {
  const [expenses, setExpenses] = useState<ExpenseDetail[]>(INITIAL_EXPENSES);

  const getExpenseById = useCallback(
    (id: string) => expenses.find((expense) => expense.id === id),
    [expenses],
  );

  const settleExpense = useCallback((id: string) => {
    setExpenses((currentExpenses) =>
      currentExpenses.map((expense) =>
        expense.id === id
          ? {
              ...expense,
              isSettled: true,
              participants: expense.participants.map((participant) =>
                participant.isCurrentUser
                  ? { ...participant, settled: true }
                  : participant,
              ),
            }
          : expense,
      ),
    );
  }, []);

  const deleteExpense = useCallback((id: string) => {
    setExpenses((currentExpenses) =>
      currentExpenses.filter((expense) => expense.id !== id),
    );
  }, []);

  const value = useMemo(
    () => ({
      expenses,
      getExpenseById,
      settleExpense,
      deleteExpense,
    }),
    [expenses, getExpenseById, settleExpense, deleteExpense],
  );

  return (
    <ExpenseStoreContext.Provider value={value}>
      {children}
    </ExpenseStoreContext.Provider>
  );
}

export function useExpenseStore() {
  const context = useContext(ExpenseStoreContext);
  if (!context) {
    throw new Error("useExpenseStore must be used within an ExpenseProvider");
  }
  return context;
}