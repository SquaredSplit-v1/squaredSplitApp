export type BalanceType = "owes_you" | "you_owe";

export interface Friend {
  id: string;
  name: string;
  avatar: any; // require(...) image source
  subtitle: string;
  subtitleType?: "default" | "alert" | "upcoming";
  balanceType: BalanceType;
  amount: number;
}

export interface GroupMember {
  name: string;
  amount: number;
  balanceType: BalanceType;
}

export interface Group {
  id: string;
  name: string;
  avatar: any; // require(...) image source
  emoji?: string;
  balanceType: BalanceType;
  amount: number;
  members?: GroupMember[];
}

export type FilterOption =
  | "none"
  | "outstanding"
  | "owes_you"
  | "you_owe";
