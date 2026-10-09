/**
 * Receipts, agreements (signatures) and owner note edits for expenses.
 * Receipt images live in the `receipts` storage bucket under
 * {userId}/{expenseId}/…; signatures under {userId}/agreements/….
 */

import * as ImagePicker from 'expo-image-picker'

import { supabase } from '@/lib/supabase/client'

export interface Receipt {
  id: string
  expenseId: string
  storagePath: string
  url: string
  createdAt: string
}

export interface Agreement {
  id: string
  expenseId: string
  signerId: string
  signerName: string | null
  storagePath: string
  agreedAt: string
  url: string
}

export async function pickReceiptImage(): Promise<string | null> {
  const perm = await ImagePicker.requestMediaLibraryPermissionsAsync()
  if (!perm.granted) return null

  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    quality: 0.7,
    allowsMultipleSelection: false,
  })
  if (result.canceled || !result.assets?.[0]?.uri) return null
  return result.assets[0].uri
}

async function fetchWithAuth(uri: string): Promise<Blob> {
  const response = await fetch(uri)
  return response.blob()
}

function extFromUri(uri: string): string {
  return uri.split('.').pop()?.toLowerCase() ?? 'jpg'
}

export async function uploadReceipt(
  userId: string,
  expenseId: string,
  localUri: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const ext = extFromUri(localUri)
    const path = `${userId}/${expenseId}/receipt-${Date.now()}.${ext}`
    const blob = await fetchWithAuth(localUri)

    const { error } = await supabase.storage
      .from('receipts')
      .upload(path, blob, { upsert: true, contentType: `image/${ext}` })
    if (error) return { success: false, error: error.message }

    const { error: dbError } = await supabase.from('expense_receipts').insert({
      expense_id: expenseId,
      uploaded_by: userId,
      storage_path: path,
    })
    if (dbError) return { success: false, error: dbError.message }

    return { success: true }
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : 'Upload failed' }
  }
}

export async function fetchReceipts(expenseId: string): Promise<Receipt[]> {
  const { data, error } = await supabase
    .from('expense_receipts')
    .select('id, expense_id, storage_path, created_at')
    .eq('expense_id', expenseId)
    .order('created_at', { ascending: true })

  if (error || !data) return []

  return data.map(row => ({
    id: row.id,
    expenseId: row.expense_id,
    storagePath: row.storage_path,
    url: supabase.storage.from('receipts').getPublicUrl(row.storage_path).data.publicUrl,
    createdAt: row.created_at,
  }))
}

export async function deleteReceipt(receipt: Receipt): Promise<boolean> {
  await supabase.storage.from('receipts').remove([receipt.storagePath])
  const { error } = await supabase.from('expense_receipts').delete().eq('id', receipt.id)
  return !error
}

// ── Agreements (signatures) ────────────────────────────────────────────────

export async function uploadSignature(
  userId: string,
  signerName: string,
  expenseId: string,
  base64Png: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const path = `${userId}/agreements/${expenseId}-sig-${Date.now()}.png`
    const blob = await (await fetch(`data:image/png;base64,${base64Png}`)).blob()

    const { error } = await supabase.storage
      .from('receipts')
      .upload(path, blob, { upsert: true, contentType: 'image/png' })
    if (error) return { success: false, error: error.message }

    const { error: dbError } = await supabase.from('expense_agreements').upsert(
      {
        expense_id: expenseId,
        signer_id: userId,
        signer_name: signerName,
        storage_path: path,
      },
      { onConflict: 'expense_id,signer_id' }
    )
    if (dbError) return { success: false, error: dbError.message }

    return { success: true }
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : 'Upload failed' }
  }
}

export async function fetchAgreements(expenseId: string): Promise<Agreement[]> {
  const { data, error } = await supabase
    .from('expense_agreements')
    .select('id, expense_id, signer_id, signer_name, storage_path, agreed_at')
    .eq('expense_id', expenseId)
    .order('agreed_at', { ascending: true })

  if (error || !data) return []

  return data.map(row => ({
    id: row.id,
    expenseId: row.expense_id,
    signerId: row.signer_id,
    signerName: row.signer_name,
    storagePath: row.storage_path,
    agreedAt: row.agreed_at,
    url: supabase.storage.from('receipts').getPublicUrl(row.storage_path).data.publicUrl,
  }))
}

// ── Owner note edits ────────────────────────────────────────────────────────

export async function updateExpenseNote(
  expenseId: string,
  note: string | null
): Promise<{ success: boolean; error?: string }> {
  const { error } = await supabase
    .from('expenses')
    .update({ note, updated_at: new Date().toISOString() })
    .eq('id', expenseId)
  if (error) return { success: false, error: error.message }
  return { success: true }
}
