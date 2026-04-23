import AsyncStorage from '@react-native-async-storage/async-storage'
import * as SecureStore from 'expo-secure-store'
import { Platform } from 'react-native'

const CHUNK_SIZE = 1800 // bytes — safely under SecureStore's 2048 limit

/**
 * LargeSecureStore: splits values that exceed SecureStore's 2KB limit
 * into chunks, stored securely. Falls back to AsyncStorage on web.
 */
export const LargeSecureStore = {
  async getItem(key: string): Promise<string | null> {
    if (Platform.OS === 'web') return AsyncStorage.getItem(key)

    try {
      // Check if value was chunked
      const countStr = await SecureStore.getItemAsync(`${key}_count`)
      if (countStr) {
        const count = parseInt(countStr, 10)
        let value = ''
        for (let i = 0; i < count; i++) {
          const chunk = await SecureStore.getItemAsync(`${key}_chunk_${i}`)
          if (chunk == null) return null
          value += chunk
        }
        return value
      }

      // Single value (small enough)
      return await SecureStore.getItemAsync(key)
    } catch {
      return null
    }
  },

  async setItem(key: string, value: string): Promise<void> {
    if (Platform.OS === 'web') {
      await AsyncStorage.setItem(key, value)
      return
    }

    try {
      if (value.length <= CHUNK_SIZE) {
        // Small enough — store directly, clear any old chunks
        await SecureStore.setItemAsync(key, value)
        await SecureStore.deleteItemAsync(`${key}_count`)
      } else {
        // Chunk it
        const chunks: string[] = []
        for (let i = 0; i < value.length; i += CHUNK_SIZE) {
          chunks.push(value.slice(i, i + CHUNK_SIZE))
        }
        for (let i = 0; i < chunks.length; i++) {
          await SecureStore.setItemAsync(`${key}_chunk_${i}`, chunks[i])
        }
        await SecureStore.setItemAsync(`${key}_count`, String(chunks.length))
        // Clear direct key if it existed before
        await SecureStore.deleteItemAsync(key)
      }
    } catch {
      // Fallback to AsyncStorage if SecureStore fails (e.g. simulator quirks)
      await AsyncStorage.setItem(key, value)
    }
  },

  async removeItem(key: string): Promise<void> {
    if (Platform.OS === 'web') {
      await AsyncStorage.removeItem(key)
      return
    }

    try {
      await SecureStore.deleteItemAsync(key)
      const countStr = await SecureStore.getItemAsync(`${key}_count`)
      if (countStr) {
        const count = parseInt(countStr, 10)
        for (let i = 0; i < count; i++) {
          await SecureStore.deleteItemAsync(`${key}_chunk_${i}`)
        }
        await SecureStore.deleteItemAsync(`${key}_count`)
      }
    } catch {}
  },
}
