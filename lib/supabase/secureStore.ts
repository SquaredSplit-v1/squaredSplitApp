import * as SecureStore from 'expo-secure-store'
import { Platform } from 'react-native'

const CHUNK_SIZE = 1800 // safely under SecureStore's 2048-byte limit

// Web fallback: localStorage — no native module required
const webStore = {
  getItem: (key: string): Promise<string | null> =>
    Promise.resolve(typeof window !== 'undefined' ? window.localStorage.getItem(key) : null),
  setItem: (key: string, value: string): Promise<void> => {
    if (typeof window !== 'undefined') window.localStorage.setItem(key, value)
    return Promise.resolve()
  },
  removeItem: (key: string): Promise<void> => {
    if (typeof window !== 'undefined') window.localStorage.removeItem(key)
    return Promise.resolve()
  },
}

/**
 * LargeSecureStore — splits values exceeding SecureStore's 2 KB limit
 * into chunks stored securely. Falls back to localStorage on web.
 */
export const LargeSecureStore = {
  async getItem(key: string): Promise<string | null> {
    if (Platform.OS === 'web') return webStore.getItem(key)

    try {
      const countStr = await SecureStore.getItemAsync(`${key}_count`)
      if (countStr) {
        const count = parseInt(countStr, 10)
        const chunks: string[] = []
        for (let i = 0; i < count; i++) {
          const chunk = await SecureStore.getItemAsync(`${key}_chunk_${i}`)
          if (chunk == null) return null
          chunks.push(chunk)
        }
        return chunks.join('')
      }
      return await SecureStore.getItemAsync(key)
    } catch {
      return null
    }
  },

  async setItem(key: string, value: string): Promise<void> {
    if (Platform.OS === 'web') return webStore.setItem(key, value)

    try {
      if (value.length <= CHUNK_SIZE) {
        await SecureStore.setItemAsync(key, value)
        await SecureStore.deleteItemAsync(`${key}_count`)
      } else {
        const chunks: string[] = []
        for (let i = 0; i < value.length; i += CHUNK_SIZE) {
          chunks.push(value.slice(i, i + CHUNK_SIZE))
        }
        await Promise.all(
          chunks.map((chunk, i) => SecureStore.setItemAsync(`${key}_chunk_${i}`, chunk))
        )
        await SecureStore.setItemAsync(`${key}_count`, String(chunks.length))
        await SecureStore.deleteItemAsync(key)
      }
    } catch {
      // Silent fallback — SecureStore occasionally fails on simulators
    }
  },

  async removeItem(key: string): Promise<void> {
    if (Platform.OS === 'web') return webStore.removeItem(key)

    try {
      await SecureStore.deleteItemAsync(key)
      const countStr = await SecureStore.getItemAsync(`${key}_count`)
      if (countStr) {
        const count = parseInt(countStr, 10)
        await Promise.all(
          Array.from({ length: count }, (_, i) => SecureStore.deleteItemAsync(`${key}_chunk_${i}`))
        )
        await SecureStore.deleteItemAsync(`${key}_count`)
      }
    } catch {}
  },
}
