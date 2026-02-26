import * as ImagePicker from "expo-image-picker";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import {
  Dimensions,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Svg, { Circle, Path, Rect } from "react-native-svg";

import { CarIcon } from "./CarIcon";
import { DollarIcon } from "./DollarIcon";
import { NoteDeletionIcon } from "./NoteDeletionIcon";

// ─── Types ───────────────────────────────────────────────────────────
interface User {
  id: string;
  name: string;
}

interface AttachedFile {
  id: string;
  uri: string;
  name: string;
  type: "image" | "pdf";
}

interface Note {
  id: string;
  text: string;
}

type SplitType = "equally" | "unequally";

// ─── Mock Users ──────────────────────────────────────────────────────
const MOCK_USERS: User[] = [
  { id: "1", name: "Sarah Paul" },
  { id: "2", name: "Seshwath Hegde" },
  { id: "3", name: "Shivam Sinha" },
  { id: "4", name: "Shawn" },
  { id: "5", name: "Paul" },
  { id: "6", name: "AJ" },
];

// ─── Helper: format date ─────────────────────────────────────────────
function formatDate(date: Date): string {
  const now = new Date();
  if (
    date.getDate() === now.getDate() &&
    date.getMonth() === now.getMonth() &&
    date.getFullYear() === now.getFullYear()
  ) {
    return "Today";
  }
  const months = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec",
  ];
  return `${date.getDate()} ${months[date.getMonth()]}`;
}

// ─── Inline SVG icons ────────────────────────────────────────────────
function BackChevron() {
  return (
    <Svg width={10} height={18} viewBox="0 0 10 18" fill="none">
      <Path
        d="M9 1L1 9l8 8"
        stroke="#3273CD"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

function ProfileIcon({
  size = 28,
  color = "#3273CD",
}: {
  size?: number;
  color?: string;
}) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Circle cx="12" cy="8" r="4" stroke={color} strokeWidth={1.8} />
      <Path
        d="M4 20c0-3.314 3.582-6 8-6s8 2.686 8 6"
        stroke={color}
        strokeWidth={1.8}
        strokeLinecap="round"
      />
    </Svg>
  );
}

function CalendarIcon() {
  return (
    <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
      <Rect
        x="3"
        y="4"
        width="18"
        height="18"
        rx="2"
        stroke="#141414"
        strokeWidth={1.8}
      />
      <Path
        d="M16 2v4M8 2v4M3 10h18"
        stroke="#141414"
        strokeWidth={1.8}
        strokeLinecap="round"
      />
    </Svg>
  );
}

function CameraIcon() {
  return (
    <Svg width={22} height={22} viewBox="0 0 24 24" fill="none">
      <Path
        d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2v11z"
        stroke="#141414"
        strokeWidth={1.8}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Circle cx="12" cy="13" r="4" stroke="#141414" strokeWidth={1.8} />
    </Svg>
  );
}

function NoteIcon() {
  return (
    <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
      <Path
        d="M12 20h9M16.5 3.5a2.121 2.121 0 013 3L7 19l-4 1 1-4L16.5 3.5z"
        stroke="#141414"
        strokeWidth={1.8}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

function CloseIcon({
  size = 16,
  color = "#666",
}: {
  size?: number;
  color?: string;
}) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M18 6L6 18M6 6l12 12"
        stroke={color}
        strokeWidth={2.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

// ─── Main Component ──────────────────────────────────────────────────
export default function AddExpenseScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();

  // Form state
  const [expenseName, setExpenseName] = useState("");
  const [expenseAmount, setExpenseAmount] = useState("");
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [splitType, setSplitType] = useState<SplitType>("equally");

  // Participants
  const [selectedUsers, setSelectedUsers] = useState<User[]>([]);
  const [userSearchQuery, setUserSearchQuery] = useState("");
  const [showUserDropdown, setShowUserDropdown] = useState(false);

  // Attachments
  const [attachedFiles, setAttachedFiles] = useState<AttachedFile[]>([]);
  const [notes, setNotes] = useState<Note[]>([]);

  // Modals
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showNoteInput, setShowNoteInput] = useState(false);
  const [noteText, setNoteText] = useState("");

  // Delete confirmation modals
  const [deleteImageModal, setDeleteImageModal] = useState<AttachedFile | null>(
    null,
  );
  const [deleteNoteModal, setDeleteNoteModal] = useState<Note | null>(null);
  const [noteDeletedModal, setNoteDeletedModal] = useState(false);

  // ─── Participant handling ────────────────────────────────────────
  const filteredUsers = MOCK_USERS.filter(
    (u) =>
      u.name.toLowerCase().includes(userSearchQuery.toLowerCase()) &&
      !selectedUsers.find((su) => su.id === u.id),
  );

  const toggleUser = (user: User) => {
    if (selectedUsers.find((u) => u.id === user.id)) {
      setSelectedUsers(selectedUsers.filter((u) => u.id !== user.id));
    } else {
      setSelectedUsers([...selectedUsers, user]);
    }
    setUserSearchQuery("");
  };

  const removeUser = (userId: string) => {
    setSelectedUsers(selectedUsers.filter((u) => u.id !== userId));
  };

  // ─── Date / Calendar helpers ──────────────────────────────────────
  const [calendarMonth, setCalendarMonth] = useState(new Date());

  const getDaysInMonth = (year: number, month: number) =>
    new Date(year, month + 1, 0).getDate();

  const getFirstDayOfMonth = (year: number, month: number) =>
    new Date(year, month, 1).getDay();

  const MONTH_NAMES = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
  ];
  const DAY_LABELS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

  const changeMonth = (delta: number) => {
    setCalendarMonth((prev) => {
      const d = new Date(prev);
      d.setMonth(d.getMonth() + delta);
      return d;
    });
  };

  const selectDay = (day: number) => {
    const d = new Date(
      calendarMonth.getFullYear(),
      calendarMonth.getMonth(),
      day,
    );
    setSelectedDate(d);
    setShowDatePicker(false);
  };

  const isSameDay = (a: Date, b: Date) =>
    a.getDate() === b.getDate() &&
    a.getMonth() === b.getMonth() &&
    a.getFullYear() === b.getFullYear();

  const isToday = (day: number) => {
    const d = new Date(
      calendarMonth.getFullYear(),
      calendarMonth.getMonth(),
      day,
    );
    return isSameDay(d, new Date());
  };

  const isSelected = (day: number) => {
    const d = new Date(
      calendarMonth.getFullYear(),
      calendarMonth.getMonth(),
      day,
    );
    return isSameDay(d, selectedDate);
  };

  // ─── File / Image handling ───────────────────────────────────────
  const pickDocument = async () => {
    try {
      const { status } =
        await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== "granted") {
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        quality: 0.85,
        allowsMultipleSelection: false,
      });
      if (!result.canceled && result.assets.length > 0) {
        const asset = result.assets[0];
        setAttachedFiles((prev) => [
          ...prev,
          {
            id: Date.now().toString(),
            uri: asset.uri,
            name: asset.fileName ?? `image_${Date.now()}.jpg`,
            type: "image",
          },
        ]);
      }
    } catch {
      // User cancelled
    }
  };

  const handleCameraPress = () => {
    pickDocument();
  };

  const confirmDeleteImage = (file: AttachedFile) => {
    setDeleteImageModal(file);
  };

  const deleteImage = () => {
    if (deleteImageModal) {
      setAttachedFiles((prev) =>
        prev.filter((f) => f.id !== deleteImageModal.id),
      );
      setDeleteImageModal(null);
    }
  };

  // ─── Note handling ───────────────────────────────────────────────
  const saveNote = () => {
    if (noteText.trim()) {
      setNotes((prev) => [
        ...prev,
        { id: Date.now().toString(), text: noteText.trim() },
      ]);
      setNoteText("");
      setShowNoteInput(false);
    }
  };

  const confirmDeleteNote = (note: Note) => {
    setDeleteNoteModal(note);
  };

  const deleteNote = () => {
    if (deleteNoteModal) {
      setNotes((prev) => prev.filter((n) => n.id !== deleteNoteModal.id));
      setDeleteNoteModal(null);
      setNoteDeletedModal(true);
    }
  };

  // ─── Save handler ────────────────────────────────────────────────
  const handleSave = () => {
    // TODO: implement save logic
    console.log({
      expenseName,
      expenseAmount,
      selectedDate,
      splitType,
      selectedUsers,
      attachedFiles,
      notes,
    });
    router.back();
  };

  // Display up to 2 selected users as chips, then "+N" for more
  const visibleChips = selectedUsers.slice(0, 2);
  const extraCount = selectedUsers.length - 2;

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* ─── Header ──────────────────────────────────────────── */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backButton}
        >
          <BackChevron />
          <Text style={styles.backText}>Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Add an expense</Text>
        <TouchableOpacity onPress={handleSave}>
          <Text style={styles.saveText}>Save</Text>
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          {/* ─── You and: participants ───────────────────────── */}
          <View style={styles.participantsSection}>
            <Text style={styles.youAndText}>You and:</Text>
            <View style={styles.participantsRow}>
              {visibleChips.map((user) => (
                <TouchableOpacity
                  key={user.id}
                  style={styles.userChip}
                  onPress={() => removeUser(user.id)}
                >
                  <ProfileIcon size={20} color="#3273CD" />
                  <Text style={styles.userChipText}>{user.name}</Text>
                </TouchableOpacity>
              ))}
              {extraCount > 0 && (
                <View style={styles.extraChip}>
                  <ProfileIcon size={16} color="#fff" />
                  <Text style={styles.extraChipText}>+{extraCount}</Text>
                </View>
              )}
              <TextInput
                style={styles.participantInput}
                placeholder="S"
                placeholderTextColor="#9CA3AF"
                value={userSearchQuery}
                onChangeText={(text) => {
                  setUserSearchQuery(text);
                  setShowUserDropdown(true);
                }}
                onFocus={() => setShowUserDropdown(true)}
              />
            </View>
            <View style={styles.participantDivider} />

            {/* Dropdown */}
            {showUserDropdown && filteredUsers.length > 0 && (
              <View style={styles.dropdownContainer}>
                {filteredUsers.map((user) => (
                  <TouchableOpacity
                    key={user.id}
                    style={styles.dropdownItem}
                    onPress={() => {
                      toggleUser(user);
                      setShowUserDropdown(false);
                    }}
                  >
                    <View style={styles.dropdownAvatar}>
                      <ProfileIcon size={32} color="#3273CD" />
                    </View>
                    <Text style={styles.dropdownName}>{user.name}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>

          {/* ─── Expense Name ────────────────────────────────── */}
          <View style={styles.expenseRow}>
            <CarIcon width={48} height={49} />
            <TextInput
              style={styles.expenseNameInput}
              placeholder="Expense name"
              placeholderTextColor="#9CA3AF"
              value={expenseName}
              onChangeText={setExpenseName}
            />
          </View>
          <View style={styles.inputDivider} />

          {/* ─── Expense Amount ──────────────────────────────── */}
          <View style={styles.expenseRow}>
            <DollarIcon width={48} height={49} />
            <TextInput
              style={styles.expenseAmountInput}
              placeholder="0.00"
              placeholderTextColor="#9CA3AF"
              value={expenseAmount}
              onChangeText={setExpenseAmount}
              keyboardType="numeric"
            />
          </View>
          <View style={styles.inputDivider} />

          {/* ─── Paid by / Split ─────────────────────────────── */}
          <View style={styles.paidByRow}>
            <Text style={styles.paidByText}>Paid by</Text>
            <View style={styles.paidByYou}>
              <ProfileIcon size={20} color="#E8913A" />
              <Text style={styles.paidByYouText}>You</Text>
            </View>
            <Text style={styles.splitLabel}>split</Text>
            <TouchableOpacity
              style={[
                styles.splitChip,
                splitType === "equally" && styles.splitChipActive,
              ]}
              onPress={() =>
                setSplitType(splitType === "equally" ? "unequally" : "equally")
              }
            >
              <Text
                style={[
                  styles.splitChipText,
                  splitType === "equally" && styles.splitChipTextActive,
                ]}
              >
                {splitType}
              </Text>
            </TouchableOpacity>
          </View>

          {/* ─── Date / Camera / Note row ───────────────────── */}
          <View style={styles.actionsRow}>
            <TouchableOpacity
              style={styles.dateChip}
              onPress={() => setShowDatePicker(true)}
            >
              <CalendarIcon />
              <Text style={styles.dateChipText}>
                {formatDate(selectedDate)}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.iconButton}
              onPress={handleCameraPress}
            >
              <CameraIcon />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.iconButton}
              onPress={() => setShowNoteInput(true)}
            >
              <NoteIcon />
            </TouchableOpacity>
          </View>

          {/* ─── Notes display ───────────────────────────────── */}
          {notes.map((note) => (
            <View key={note.id} style={styles.noteCard}>
              <View style={styles.noteCardContent}>
                <Text style={styles.noteCardLabel}>Note: </Text>
                <Text style={styles.noteCardText}>
                  &ldquo;{note.text}&rdquo;
                </Text>
              </View>
              <TouchableOpacity
                style={styles.noteCloseButton}
                onPress={() => confirmDeleteNote(note)}
              >
                <CloseIcon size={14} color="#E8913A" />
              </TouchableOpacity>
            </View>
          ))}

          {/* ─── Attached files display ──────────────────────── */}
          {attachedFiles.map((file) => (
            <View key={file.id} style={styles.attachmentCard}>
              {file.type === "image" ? (
                <Image
                  source={{ uri: file.uri }}
                  style={styles.attachmentImage}
                />
              ) : (
                <View style={styles.pdfPreview}>
                  <Text style={styles.pdfText}>PDF</Text>
                  <Text style={styles.pdfFileName} numberOfLines={1}>
                    {file.name}
                  </Text>
                </View>
              )}
              <TouchableOpacity
                style={styles.attachmentCloseButton}
                onPress={() => confirmDeleteImage(file)}
              >
                <CloseIcon size={12} color="#3273CD" />
              </TouchableOpacity>
            </View>
          ))}
        </ScrollView>
      </KeyboardAvoidingView>

      {/* ─── Date Picker Modal (custom JS calendar) ───────────── */}
      <Modal
        transparent
        animationType="fade"
        visible={showDatePicker}
        onRequestClose={() => setShowDatePicker(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowDatePicker(false)}
        >
          <View
            style={styles.datePickerContainer}
            onStartShouldSetResponder={() => true}
          >
            {/* Month navigation */}
            <View style={styles.calendarHeader}>
              <TouchableOpacity onPress={() => changeMonth(-1)}>
                <Text style={styles.calendarNav}>{"<"}</Text>
              </TouchableOpacity>
              <Text style={styles.calendarMonthLabel}>
                {MONTH_NAMES[calendarMonth.getMonth()]}{" "}
                {calendarMonth.getFullYear()}
              </Text>
              <TouchableOpacity onPress={() => changeMonth(1)}>
                <Text style={styles.calendarNav}>{">"} </Text>
              </TouchableOpacity>
            </View>

            {/* Day-of-week labels */}
            <View style={styles.calendarRow}>
              {DAY_LABELS.map((d) => (
                <Text key={d} style={styles.calendarDayLabel}>
                  {d}
                </Text>
              ))}
            </View>

            {/* Day grid */}
            {(() => {
              const year = calendarMonth.getFullYear();
              const month = calendarMonth.getMonth();
              const daysInMonth = getDaysInMonth(year, month);
              const firstDay = getFirstDayOfMonth(year, month);
              const rows: React.ReactNode[] = [];
              let cells: React.ReactNode[] = [];

              // leading blanks
              for (let i = 0; i < firstDay; i++) {
                cells.push(
                  <View key={`blank-${i}`} style={styles.calendarCell} />,
                );
              }

              for (let day = 1; day <= daysInMonth; day++) {
                const sel = isSelected(day);
                const today = isToday(day);
                cells.push(
                  <TouchableOpacity
                    key={day}
                    style={[
                      styles.calendarCell,
                      sel && styles.calendarCellSelected,
                    ]}
                    onPress={() => selectDay(day)}
                  >
                    <Text
                      style={[
                        styles.calendarDayText,
                        today && styles.calendarDayToday,
                        sel && styles.calendarDayTextSelected,
                      ]}
                    >
                      {day}
                    </Text>
                  </TouchableOpacity>,
                );
                if ((firstDay + day) % 7 === 0 || day === daysInMonth) {
                  // pad trailing blanks
                  while (cells.length < 7) {
                    cells.push(
                      <View
                        key={`trail-${cells.length}`}
                        style={styles.calendarCell}
                      />,
                    );
                  }
                  rows.push(
                    <View key={`row-${day}`} style={styles.calendarRow}>
                      {cells}
                    </View>,
                  );
                  cells = [];
                }
              }
              return rows;
            })()}
          </View>
        </TouchableOpacity>
      </Modal>

      {/* ─── Note Input Modal ─────────────────────────────────── */}
      <Modal
        transparent
        animationType="slide"
        visible={showNoteInput}
        onRequestClose={() => setShowNoteInput(false)}
      >
        <KeyboardAvoidingView
          style={styles.modalOverlay}
          behavior={Platform.OS === "ios" ? "padding" : undefined}
        >
          <View style={styles.noteModalContainer}>
            {/* Note modal header */}
            <View style={styles.noteModalHeader}>
              <TouchableOpacity onPress={() => setShowNoteInput(false)}>
                <BackChevron />
              </TouchableOpacity>
              <Text style={styles.noteModalTitle}>Write note</Text>
              <TouchableOpacity onPress={saveNote}>
                <Text style={styles.noteModalSave}>Save</Text>
              </TouchableOpacity>
            </View>
            {/* Note text input */}
            <View style={styles.noteInputWrapper}>
              <TextInput
                style={styles.noteTextInput}
                placeholder="Write a note here"
                placeholderTextColor="#9CA3AF"
                value={noteText}
                onChangeText={setNoteText}
                multiline
                autoFocus
              />
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* ─── Delete Image Confirmation Modal ──────────────────── */}
      <Modal
        transparent
        animationType="fade"
        visible={!!deleteImageModal}
        onRequestClose={() => setDeleteImageModal(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.confirmModal}>
            {deleteImageModal?.type === "image" && (
              <Image
                source={{ uri: deleteImageModal.uri }}
                style={styles.confirmModalImage}
              />
            )}
            {deleteImageModal?.type === "pdf" && (
              <View style={styles.confirmModalPdf}>
                <Text style={styles.pdfText}>PDF</Text>
              </View>
            )}
            <Text style={styles.confirmModalText}>
              Sure want to delete this image?
            </Text>
            <View style={styles.confirmModalButtons}>
              <TouchableOpacity style={styles.confirmYes} onPress={deleteImage}>
                <Text style={styles.confirmYesText}>Yes</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.confirmCancel}
                onPress={() => setDeleteImageModal(null)}
              >
                <Text style={styles.confirmCancelText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ─── Delete Note Confirmation Modal ───────────────────── */}
      <Modal
        transparent
        animationType="fade"
        visible={!!deleteNoteModal}
        onRequestClose={() => setDeleteNoteModal(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.confirmModal}>
            <Text style={styles.confirmModalText}>
              Sure want to delete this note?
            </Text>
            {deleteNoteModal && (
              <View style={styles.confirmNotePreview}>
                <Text style={styles.confirmNotePreviewText}>
                  {deleteNoteModal.text}
                </Text>
              </View>
            )}
            <View style={styles.confirmModalButtons}>
              <TouchableOpacity style={styles.confirmYes} onPress={deleteNote}>
                <Text style={styles.confirmYesText}>Yes</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.confirmCancel}
                onPress={() => setDeleteNoteModal(null)}
              >
                <Text style={styles.confirmCancelText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ─── Note Deleted Success Modal ───────────────────────── */}
      <Modal
        transparent
        animationType="fade"
        visible={noteDeletedModal}
        onRequestClose={() => setNoteDeletedModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.successModal}>
            <NoteDeletionIcon width={52} height={52} />
            <Text style={styles.successModalText}>Your note is deleted</Text>
            <TouchableOpacity
              style={styles.successOkButton}
              onPress={() => setNoteDeletedModal(false)}
            >
              <Text style={styles.successOkText}>Okay</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────
const { width: SCREEN_WIDTH } = Dimensions.get("window");

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },

  // ─── Header ──────────────────────────────────────
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  backButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  backText: {
    fontFamily: "Nunito_400Regular",
    fontSize: 16,
    color: "#3273CD",
  },
  headerTitle: {
    fontFamily: "Nunito_700Bold",
    fontSize: 17,
    color: "#141414",
  },
  saveText: {
    fontFamily: "Nunito_700Bold",
    fontSize: 16,
    color: "#3273CD",
  },

  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingBottom: 40,
  },

  // ─── Participants ────────────────────────────────
  participantsSection: {
    marginTop: 8,
    zIndex: 10,
  },
  youAndText: {
    fontFamily: "Nunito_400Regular",
    fontSize: 14,
    color: "#141414",
    marginBottom: 6,
  },
  participantsRow: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 8,
    minHeight: 40,
  },
  userChip: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F3F4F6",
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 6,
    gap: 6,
  },
  userChipText: {
    fontFamily: "Nunito_600SemiBold",
    fontSize: 13,
    color: "#141414",
  },
  extraChip: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#E8913A",
    borderRadius: 20,
    paddingHorizontal: 8,
    paddingVertical: 6,
    gap: 4,
  },
  extraChipText: {
    fontFamily: "Nunito_700Bold",
    fontSize: 12,
    color: "#FFFFFF",
  },
  participantInput: {
    fontFamily: "Nunito_400Regular",
    fontSize: 15,
    color: "#141414",
    minWidth: 40,
    flex: 1,
    paddingVertical: 4,
  },
  participantDivider: {
    height: 1,
    backgroundColor: "#E5E7EB",
    marginTop: 8,
  },
  dropdownContainer: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    marginTop: 4,
    paddingVertical: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 6,
  },
  dropdownItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 12,
  },
  dropdownAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#F0F4FA",
    alignItems: "center",
    justifyContent: "center",
  },
  dropdownName: {
    fontFamily: "Nunito_600SemiBold",
    fontSize: 15,
    color: "#141414",
  },

  // ─── Expense name / amount ───────────────────────
  expenseRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginTop: 20,
  },
  expenseNameInput: {
    flex: 1,
    fontFamily: "Nunito_600SemiBold",
    fontSize: 18,
    color: "#141414",
    paddingVertical: 8,
  },
  expenseAmountInput: {
    flex: 1,
    fontFamily: "Nunito_600SemiBold",
    fontSize: 18,
    color: "#141414",
    paddingVertical: 8,
  },
  inputDivider: {
    height: 1,
    backgroundColor: "#E5E7EB",
    marginLeft: 60,
  },

  // ─── Paid by / Split ─────────────────────────────
  paidByRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 20,
  },
  paidByText: {
    fontFamily: "Nunito_600SemiBold",
    fontSize: 14,
    color: "#141414",
  },
  paidByYou: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F3F4F6",
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 5,
    gap: 4,
  },
  paidByYouText: {
    fontFamily: "Nunito_700Bold",
    fontSize: 13,
    color: "#141414",
  },
  splitLabel: {
    fontFamily: "Nunito_600SemiBold",
    fontSize: 14,
    color: "#141414",
  },
  splitChip: {
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 5,
    backgroundColor: "#F3F4F6",
  },
  splitChipActive: {
    backgroundColor: "#E8F0FE",
  },
  splitChipText: {
    fontFamily: "Nunito_600SemiBold",
    fontSize: 13,
    color: "#141414",
  },
  splitChipTextActive: {
    color: "#3273CD",
  },

  // ─── Actions row ─────────────────────────────────
  actionsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginTop: 20,
  },
  dateChip: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F3F4F6",
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 6,
  },
  dateChipText: {
    fontFamily: "Nunito_600SemiBold",
    fontSize: 13,
    color: "#141414",
  },
  iconButton: {
    padding: 8,
    backgroundColor: "#F3F4F6",
    borderRadius: 20,
  },

  // ─── Notes ───────────────────────────────────────
  noteCard: {
    backgroundColor: "#FEF9E7",
    borderRadius: 12,
    padding: 14,
    marginTop: 16,
    flexDirection: "row",
    alignItems: "flex-start",
  },
  noteCardContent: {
    flex: 1,
    flexDirection: "row",
    flexWrap: "wrap",
  },
  noteCardLabel: {
    fontFamily: "Nunito_700Bold",
    fontSize: 14,
    color: "#E8913A",
  },
  noteCardText: {
    fontFamily: "Nunito_400Regular",
    fontSize: 14,
    color: "#E8913A",
    flex: 1,
  },
  noteCloseButton: {
    padding: 4,
    marginLeft: 8,
  },

  // ─── Attachments ─────────────────────────────────
  attachmentCard: {
    marginTop: 16,
    position: "relative",
    width: 100,
    height: 120,
  },
  attachmentImage: {
    width: 100,
    height: 120,
    borderRadius: 8,
    resizeMode: "cover",
  },
  attachmentCloseButton: {
    position: "absolute",
    top: -6,
    right: -6,
    backgroundColor: "#FFFFFF",
    borderRadius: 10,
    width: 20,
    height: 20,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  pdfPreview: {
    width: 100,
    height: 120,
    borderRadius: 8,
    backgroundColor: "#F3F4F6",
    alignItems: "center",
    justifyContent: "center",
    padding: 8,
  },
  pdfText: {
    fontFamily: "Nunito_700Bold",
    fontSize: 16,
    color: "#E74C3C",
  },
  pdfFileName: {
    fontFamily: "Nunito_400Regular",
    fontSize: 10,
    color: "#666",
    marginTop: 4,
    textAlign: "center",
  },

  // ─── Modal overlay ───────────────────────────────
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "center",
    alignItems: "center",
  },

  // ─── Custom calendar ─────────────────────────────
  datePickerContainer: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 16,
    width: SCREEN_WIDTH - 40,
  },
  calendarHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  calendarNav: {
    fontFamily: "Nunito_700Bold",
    fontSize: 20,
    color: "#3273CD",
    paddingHorizontal: 8,
  },
  calendarMonthLabel: {
    fontFamily: "Nunito_700Bold",
    fontSize: 16,
    color: "#000000",
  },
  calendarRow: {
    flexDirection: "row",
    justifyContent: "space-around",
    marginBottom: 4,
  },
  calendarDayLabel: {
    fontFamily: "Nunito_600SemiBold",
    fontSize: 12,
    color: "#9CA3AF",
    width: 36,
    textAlign: "center",
    marginBottom: 4,
  },
  calendarCell: {
    width: 36,
    height: 36,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 18,
  },
  calendarCellSelected: {
    backgroundColor: "#3273CD",
  },
  calendarDayText: {
    fontFamily: "Nunito_400Regular",
    fontSize: 14,
    color: "#000000",
  },
  calendarDayToday: {
    fontFamily: "Nunito_700Bold",
    color: "#3273CD",
  },
  calendarDayTextSelected: {
    color: "#FFFFFF",
    fontFamily: "Nunito_700Bold",
  },

  // ─── Note modal ──────────────────────────────────
  noteModalContainer: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 16,
    width: SCREEN_WIDTH - 40,
  },
  noteModalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  noteModalTitle: {
    fontFamily: "Nunito_700Bold",
    fontSize: 17,
    color: "#141414",
  },
  noteModalSave: {
    fontFamily: "Nunito_700Bold",
    fontSize: 16,
    color: "#3273CD",
  },
  noteInputWrapper: {
    backgroundColor: "#F9F0BF",
    borderRadius: 12,
    padding: 14,
    minHeight: 80,
  },
  noteTextInput: {
    fontFamily: "Nunito_400Regular",
    fontSize: 15,
    color: "#141414",
    textAlignVertical: "top",
  },

  // ─── Confirm modals ──────────────────────────────
  confirmModal: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 20,
    width: SCREEN_WIDTH - 60,
    alignItems: "center",
  },
  confirmModalImage: {
    width: 120,
    height: 100,
    borderRadius: 8,
    resizeMode: "cover",
    marginBottom: 16,
  },
  confirmModalPdf: {
    width: 120,
    height: 100,
    borderRadius: 8,
    backgroundColor: "#F3F4F6",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  confirmModalText: {
    fontFamily: "Nunito_700Bold",
    fontSize: 16,
    color: "#141414",
    textAlign: "center",
    marginBottom: 16,
  },
  confirmNotePreview: {
    backgroundColor: "#F9F0BF",
    borderRadius: 10,
    padding: 12,
    marginBottom: 16,
    width: "100%",
  },
  confirmNotePreviewText: {
    fontFamily: "Nunito_400Regular",
    fontSize: 14,
    color: "#141414",
    textAlign: "center",
  },
  confirmModalButtons: {
    flexDirection: "row",
    gap: 12,
    width: "100%",
  },
  confirmYes: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    borderWidth: 1.5,
    borderColor: "#3273CD",
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: "center",
  },
  confirmYesText: {
    fontFamily: "Nunito_700Bold",
    fontSize: 15,
    color: "#3273CD",
  },
  confirmCancel: {
    flex: 1,
    backgroundColor: "#3273CD",
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: "center",
  },
  confirmCancelText: {
    fontFamily: "Nunito_700Bold",
    fontSize: 15,
    color: "#FFFFFF",
  },

  // ─── Success modal ───────────────────────────────
  successModal: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 24,
    width: SCREEN_WIDTH - 80,
    alignItems: "center",
  },
  successModalText: {
    fontFamily: "Nunito_700Bold",
    fontSize: 16,
    color: "#141414",
    marginTop: 16,
    marginBottom: 20,
  },
  successOkButton: {
    backgroundColor: "#3273CD",
    borderRadius: 10,
    paddingHorizontal: 32,
    paddingVertical: 10,
  },
  successOkText: {
    fontFamily: "Nunito_700Bold",
    fontSize: 15,
    color: "#FFFFFF",
  },
});
