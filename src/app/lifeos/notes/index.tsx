import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Modal,
  RefreshControl,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons, Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { useNinjaAlert } from '../../../context/ninja-alert-context';
import {
  getNotes,
  saveNote,
  deleteNote,
  togglePinNote,
  type NoteItem,
} from '../../../services/notes/notes-service';

const CATEGORIES = ['All', 'Ideas', 'Meeting', 'Research', 'Personal', 'Project'];

export default function NeuroNotesScreen() {
  const router = useRouter();
  const { showToast, showAlert } = useNinjaAlert();

  const [notes, setNotes] = useState<NoteItem[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);

  // Editor Modal State
  const [isEditorOpen, setIsEditorOpen] = useState<boolean>(false);
  const [editingNote, setEditingNote] = useState<Partial<NoteItem>>({
    title: '',
    content: '',
    category: 'Ideas',
    tags: [],
    isPinned: false,
  });
  const [tagsInput, setTagsInput] = useState<string>('');

  const loadNotesData = async () => {
    try {
      const items = await getNotes({
        category: selectedCategory === 'All' ? undefined : selectedCategory,
        search: searchQuery.trim() || undefined,
        isArchived: false,
      });
      setNotes(items);
    } catch (e) {
      console.warn('[NeuroNotes] Error loading notes:', e);
    }
  };

  useEffect(() => {
    let ignore = false;
    void getNotes({
      category: selectedCategory === 'All' ? undefined : selectedCategory,
      search: searchQuery.trim() || undefined,
      isArchived: false,
    }).then((items) => {
      if (!ignore) {
        setNotes(items);
      }
    });
    return () => {
      ignore = true;
    };
  }, [selectedCategory, searchQuery]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await loadNotesData();
    setIsRefreshing(false);
  };

  const handleOpenEditor = (note?: NoteItem) => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (note) {
      setEditingNote(note);
      setTagsInput(note.tags.join(', '));
    } else {
      setEditingNote({
        title: '',
        content: '',
        category: selectedCategory === 'All' ? 'Ideas' : selectedCategory,
        tags: [],
        isPinned: false,
      });
      setTagsInput('');
    }
    setIsEditorOpen(true);
  };

  const handleSave = async () => {
    if (!editingNote.title?.trim() && !editingNote.content?.trim()) {
      showToast({
        title: 'Empty Note',
        message: 'Please provide a title or content for your note.',
        type: 'warning',
        icon: 'alert-circle',
      });
      return;
    }

    try {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      const parsedTags = tagsInput
        .split(',')
        .map((t) => t.trim().toLowerCase())
        .filter((t) => t.length > 0);

      await saveNote({
        ...editingNote,
        tags: parsedTags,
      });

      setIsEditorOpen(false);
      await loadNotesData();
      showToast({
        title: 'Note Saved',
        message: 'Saved to local database (ready for cloud sync).',
        type: 'success',
        icon: 'check-circle',
      });
    } catch (e) {
      showToast({
        title: 'Error Saving',
        message: String(e),
        type: 'error',
        icon: 'close-circle',
      });
    }
  };

  const handleDelete = (id?: string) => {
    if (!id) return;
    showAlert({
      title: 'Delete Note?',
      message: 'This will permanently delete this note across all synchronized devices.',
      type: 'warning',
      buttons: [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            await deleteNote(id);
            setIsEditorOpen(false);
            await loadNotesData();
            showToast({
              title: 'Note Deleted',
              message: 'Note removed permanently.',
              type: 'info',
              icon: 'delete',
            });
          },
        },
      ],
    });
  };

  const handleTogglePin = async (id: string, e?: any) => {
    e?.stopPropagation?.();
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    await togglePinNote(id);
    await loadNotesData();
  };

  const pinnedNotes = useMemo(() => notes.filter((n) => n.isPinned), [notes]);
  const regularNotes = useMemo(() => notes.filter((n) => !n.isPinned), [notes]);

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.iconBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={22} color="#F8FAFC" />
        </TouchableOpacity>
        <View style={{ flex: 1, marginLeft: 12 }}>
          <Text style={styles.headerTitle}>Neuro Notes</Text>
          <Text style={styles.headerSub}>Offline-First Markdown Knowledge Hub</Text>
        </View>
        <TouchableOpacity style={styles.createBtn} onPress={() => handleOpenEditor()}>
          <Ionicons name="add" size={20} color="#070A11" />
          <Text style={styles.createBtnText}>New</Text>
        </TouchableOpacity>
      </View>

      {/* Search Input */}
      <View style={styles.searchContainer}>
        <Ionicons name="search" size={18} color="#64748B" style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search titles, tags, content..."
          placeholderTextColor="#64748B"
          value={searchQuery}
          onChangeText={setSearchQuery}
          clearButtonMode="while-editing"
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => setSearchQuery('')}>
            <Ionicons name="close-circle" size={18} color="#94A3B8" />
          </TouchableOpacity>
        )}
      </View>

      {/* Categories Horizontal Carousel */}
      <View style={styles.categoriesWrapper}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.categoriesContent}>
          {CATEGORIES.map((cat) => {
            const isActive = selectedCategory === cat;
            return (
              <TouchableOpacity
                key={cat}
                style={[styles.categoryPill, isActive && styles.categoryPillActive]}
                onPress={() => {
                  void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  setSelectedCategory(cat);
                }}
              >
                <Text style={[styles.categoryPillText, isActive && styles.categoryPillTextActive]}>
                  {cat}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* Notes List */}
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={handleRefresh} tintColor="#00E699" />}
      >
        {/* Pinned Notes Section */}
        {pinnedNotes.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <MaterialCommunityIcons name="pin" size={16} color="#F59E0B" />
              <Text style={styles.sectionTitle}>PINNED NOTES</Text>
            </View>
            <View style={styles.notesGrid}>
              {pinnedNotes.map((item) => (
                <TouchableOpacity
                  key={item.id}
                  style={[styles.noteCard, styles.noteCardPinned]}
                  onPress={() => handleOpenEditor(item)}
                >
                  <View style={styles.noteTopRow}>
                    <Text style={styles.categoryBadge}>{item.category}</Text>
                    <TouchableOpacity onPress={(e) => handleTogglePin(item.id, e)} hitSlop={8}>
                      <MaterialCommunityIcons name="pin" size={18} color="#F59E0B" />
                    </TouchableOpacity>
                  </View>
                  <Text style={styles.noteTitle} numberOfLines={2}>
                    {item.title}
                  </Text>
                  <Text style={styles.noteSnippet} numberOfLines={3}>
                    {item.content || 'No additional content'}
                  </Text>
                  <View style={styles.noteFooter}>
                    <Text style={styles.noteDate}>
                      {new Date(item.updatedAt).toLocaleDateString(undefined, {
                        month: 'short',
                        day: 'numeric',
                      })}
                    </Text>
                    {item.syncStatus === 'pending' && (
                      <View style={styles.pendingDot} />
                    )}
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        {/* Regular Notes Section */}
        <View style={styles.section}>
          {pinnedNotes.length > 0 && regularNotes.length > 0 && (
            <View style={styles.sectionHeader}>
              <MaterialCommunityIcons name="note-text-outline" size={16} color="#94A3B8" />
              <Text style={styles.sectionTitle}>ALL NOTES</Text>
            </View>
          )}

          {regularNotes.length === 0 && pinnedNotes.length === 0 ? (
            <View style={styles.emptyContainer}>
              <MaterialCommunityIcons name="notebook-outline" size={54} color="#334155" />
              <Text style={styles.emptyTitle}>No Notes Yet</Text>
              <Text style={styles.emptySub}>
                Capture thoughts, meeting briefs, and ideas with zero latency offline.
              </Text>
              <TouchableOpacity style={styles.emptyBtn} onPress={() => handleOpenEditor()}>
                <Text style={styles.emptyBtnText}>Create Your First Note</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.notesGrid}>
              {regularNotes.map((item) => (
                <TouchableOpacity
                  key={item.id}
                  style={styles.noteCard}
                  onPress={() => handleOpenEditor(item)}
                >
                  <View style={styles.noteTopRow}>
                    <Text style={styles.categoryBadge}>{item.category}</Text>
                    <TouchableOpacity onPress={(e) => handleTogglePin(item.id, e)} hitSlop={8}>
                      <MaterialCommunityIcons name="pin-outline" size={18} color="#64748B" />
                    </TouchableOpacity>
                  </View>
                  <Text style={styles.noteTitle} numberOfLines={2}>
                    {item.title}
                  </Text>
                  <Text style={styles.noteSnippet} numberOfLines={3}>
                    {item.content || 'No additional text'}
                  </Text>
                  <View style={styles.noteFooter}>
                    <Text style={styles.noteDate}>
                      {new Date(item.updatedAt).toLocaleDateString(undefined, {
                        month: 'short',
                        day: 'numeric',
                      })}
                    </Text>
                    {item.syncStatus === 'pending' && (
                      <View style={styles.pendingDot} />
                    )}
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>
      </ScrollView>

      {/* Edit / Create Note Modal */}
      <Modal
        visible={isEditorOpen}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setIsEditorOpen(false)}
      >
        <SafeAreaView style={styles.modalSafe}>
          <KeyboardAvoidingView
            style={{ flex: 1 }}
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          >
            {/* Modal Header */}
            <View style={styles.modalHeader}>
              <TouchableOpacity onPress={() => setIsEditorOpen(false)} style={styles.modalCloseBtn}>
                <Ionicons name="close" size={24} color="#94A3B8" />
              </TouchableOpacity>
              <Text style={styles.modalHeading}>
                {editingNote.id ? 'Edit Note' : 'New Note'}
              </Text>
              <TouchableOpacity style={styles.modalSaveBtn} onPress={handleSave}>
                <Text style={styles.modalSaveText}>Save</Text>
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody} contentContainerStyle={{ paddingBottom: 40 }}>
              {/* Category Selector in Modal */}
              <View style={styles.modalCategoryRow}>
                <Text style={styles.modalFieldLabel}>Category:</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  {CATEGORIES.filter((c) => c !== 'All').map((cat) => (
                    <TouchableOpacity
                      key={cat}
                      style={[
                        styles.modalCatChip,
                        editingNote.category === cat && styles.modalCatChipActive,
                      ]}
                      onPress={() => setEditingNote((prev) => ({ ...prev, category: cat }))}
                    >
                      <Text
                        style={[
                          styles.modalCatChipText,
                          editingNote.category === cat && styles.modalCatChipTextActive,
                        ]}
                      >
                        {cat}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>

              {/* Title Input */}
              <TextInput
                style={styles.modalTitleInput}
                placeholder="Note Title..."
                placeholderTextColor="#64748B"
                value={editingNote.title}
                onChangeText={(t) => setEditingNote((prev) => ({ ...prev, title: t }))}
              />

              {/* Tags Input */}
              <TextInput
                style={styles.modalTagsInput}
                placeholder="Tags (e.g. neuro, ai, plan)..."
                placeholderTextColor="#475569"
                value={tagsInput}
                onChangeText={setTagsInput}
              />

              {/* Content Body */}
              <TextInput
                style={styles.modalContentInput}
                placeholder="Write your note in Markdown or plain text..."
                placeholderTextColor="#475569"
                multiline
                textAlignVertical="top"
                value={editingNote.content}
                onChangeText={(t) => setEditingNote((prev) => ({ ...prev, content: t }))}
              />

              {/* Actions Footer inside Modal */}
              {editingNote.id && (
                <View style={styles.modalActionRow}>
                  <TouchableOpacity
                    style={styles.modalPinBtn}
                    onPress={() =>
                      setEditingNote((prev) => ({ ...prev, isPinned: !prev.isPinned }))
                    }
                  >
                    <MaterialCommunityIcons
                      name={editingNote.isPinned ? 'pin' : 'pin-outline'}
                      size={20}
                      color={editingNote.isPinned ? '#F59E0B' : '#94A3B8'}
                    />
                    <Text style={styles.modalPinBtnText}>
                      {editingNote.isPinned ? 'Pinned' : 'Pin Note'}
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.modalDeleteBtn}
                    onPress={() => handleDelete(editingNote.id)}
                  >
                    <Ionicons name="trash-outline" size={18} color="#EF4444" />
                    <Text style={styles.modalDeleteBtnText}>Delete Note</Text>
                  </TouchableOpacity>
                </View>
              )}
            </ScrollView>
          </KeyboardAvoidingView>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#070A11',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#1E293B',
  },
  iconBtn: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: '#0F172A',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#1E293B',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#F8FAFC',
  },
  headerSub: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 1,
  },
  createBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#00E699',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 4,
  },
  createBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#070A11',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0F172A',
    marginHorizontal: 16,
    marginTop: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#1E293B',
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    color: '#F8FAFC',
    fontSize: 14,
    padding: 0,
  },
  categoriesWrapper: {
    marginTop: 12,
    paddingBottom: 4,
  },
  categoriesContent: {
    paddingHorizontal: 16,
    gap: 8,
  },
  categoryPill: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: '#0F172A',
    borderWidth: 1,
    borderColor: '#1E293B',
  },
  categoryPillActive: {
    backgroundColor: '#00E699',
    borderColor: '#00E699',
  },
  categoryPillText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#94A3B8',
  },
  categoryPillTextActive: {
    color: '#070A11',
    fontWeight: '700',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 40,
  },
  section: {
    marginBottom: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.8,
    color: '#64748B',
  },
  notesGrid: {
    gap: 12,
  },
  noteCard: {
    backgroundColor: '#0B111E',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: '#1E293B',
  },
  noteCardPinned: {
    borderColor: '#F59E0B44',
    backgroundColor: '#0F172A',
  },
  noteTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  categoryBadge: {
    fontSize: 10,
    fontWeight: '700',
    color: '#00E699',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  noteTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#F8FAFC',
    marginBottom: 4,
  },
  noteSnippet: {
    fontSize: 13,
    color: '#94A3B8',
    lineHeight: 18,
    marginBottom: 10,
  },
  noteFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#1E293B44',
    paddingTop: 8,
  },
  noteDate: {
    fontSize: 11,
    color: '#64748B',
  },
  pendingDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#F59E0B',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 48,
    paddingHorizontal: 24,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#F8FAFC',
    marginTop: 12,
  },
  emptySub: {
    fontSize: 13,
    color: '#64748B',
    textAlign: 'center',
    marginTop: 6,
    marginBottom: 20,
    lineHeight: 18,
  },
  emptyBtn: {
    backgroundColor: '#1E293B',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
  },
  emptyBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#00E699',
  },
  modalSafe: {
    flex: 1,
    backgroundColor: '#070A11',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#1E293B',
  },
  modalCloseBtn: {
    padding: 4,
  },
  modalHeading: {
    fontSize: 16,
    fontWeight: '700',
    color: '#F8FAFC',
  },
  modalSaveBtn: {
    backgroundColor: '#00E699',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 6,
  },
  modalSaveText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#070A11',
  },
  modalBody: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  modalCategoryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalFieldLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#94A3B8',
    marginRight: 8,
  },
  modalCatChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 14,
    backgroundColor: '#0F172A',
    borderWidth: 1,
    borderColor: '#1E293B',
    marginRight: 8,
  },
  modalCatChipActive: {
    backgroundColor: '#00E69922',
    borderColor: '#00E699',
  },
  modalCatChipText: {
    fontSize: 11,
    color: '#94A3B8',
    fontWeight: '600',
  },
  modalCatChipTextActive: {
    color: '#00E699',
    fontWeight: '700',
  },
  modalTitleInput: {
    fontSize: 20,
    fontWeight: '700',
    color: '#F8FAFC',
    borderBottomWidth: 1,
    borderBottomColor: '#1E293B',
    paddingVertical: 8,
    marginBottom: 12,
  },
  modalTagsInput: {
    fontSize: 13,
    color: '#818CF8',
    borderBottomWidth: 1,
    borderBottomColor: '#1E293B',
    paddingVertical: 8,
    marginBottom: 16,
  },
  modalContentInput: {
    fontSize: 15,
    color: '#CBD5E1',
    lineHeight: 22,
    minHeight: 220,
  },
  modalActionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 24,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#1E293B',
  },
  modalPinBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    padding: 8,
  },
  modalPinBtnText: {
    fontSize: 13,
    color: '#94A3B8',
    fontWeight: '600',
  },
  modalDeleteBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    padding: 8,
  },
  modalDeleteBtnText: {
    fontSize: 13,
    color: '#EF4444',
    fontWeight: '600',
  },
});
