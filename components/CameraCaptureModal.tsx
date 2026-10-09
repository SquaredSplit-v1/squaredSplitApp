import { CameraView, useCameraPermissions } from 'expo-camera'
import React, { useState } from 'react'
import { ActivityIndicator, Modal, StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

/**
 * Full-screen in-app camera (the Figma "Camera" screen). Captures a single
 * photo and hands the local uri back via onCapture. Falls back to a
 * permission prompt / open-settings hint when access is denied.
 */
export default function CameraCaptureModal({
  visible,
  onClose,
  onCapture,
  hint = 'Position the receipt in the frame',
}: {
  visible: boolean
  onClose: () => void
  onCapture: (uri: string) => void
  hint?: string
}) {
  const insets = useSafeAreaInsets()
  const [permission, requestPermission] = useCameraPermissions()
  const [facing, setFacing] = useState<'back' | 'front'>('back')
  const [torch, setTorch] = useState(false)
  const [isCapturing, setIsCapturing] = useState(false)
  const cameraRef = React.useRef<CameraView>(null)

  const handleCapture = async () => {
    if (isCapturing || !cameraRef.current) return
    setIsCapturing(true)
    try {
      const photo = await cameraRef.current.takePictureAsync({ quality: 0.7 })
      if (photo?.uri) onCapture(photo.uri)
    } finally {
      setIsCapturing(false)
    }
  }

  if (!permission) {
    return (
      <Modal visible={visible} onRequestClose={onClose} animationType="slide">
        <View style={[styles.screen, styles.centered]}>
          <ActivityIndicator color="#FFFFFF" />
        </View>
      </Modal>
    )
  }

  if (!permission.granted) {
    return (
      <Modal visible={visible} onRequestClose={onClose} animationType="slide">
        <View style={[styles.screen, styles.centered, { padding: 32 }]}>
          <Text style={styles.permissionTitle}>Camera access needed</Text>
          <Text style={styles.permissionBody}>
            SquaredSplit uses the camera to capture receipts and scan QR codes.
          </Text>
          <TouchableOpacity style={styles.primaryBtn} onPress={() => void requestPermission()}>
            <Text style={styles.primaryBtnText}>Allow camera</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
            <Text style={styles.closeText}>Not now</Text>
          </TouchableOpacity>
        </View>
      </Modal>
    )
  }

  return (
    <Modal visible={visible} onRequestClose={onClose} animationType="slide">
      <View style={styles.screen}>
        <CameraView
          ref={cameraRef}
          style={StyleSheet.absoluteFill}
          facing={facing}
          enableTorch={torch}
        />

        <View style={[styles.topBar, { paddingTop: insets.top + 12 }]}>
          <TouchableOpacity onPress={onClose} hitSlop={12} accessibilityLabel="Close camera">
            <Text style={styles.topText}>✕</Text>
          </TouchableOpacity>
          <Text style={styles.hint}>{hint}</Text>
          <TouchableOpacity
            onPress={() => setTorch(t => !t)}
            hitSlop={12}
            accessibilityLabel="Toggle torch"
          >
            <Text style={styles.topText}>{torch ? '🔆' : '🔅'}</Text>
          </TouchableOpacity>
        </View>

        <View style={[styles.bottomBar, { paddingBottom: insets.bottom + 24 }]}>
          <TouchableOpacity
            onPress={() => setFacing(f => (f === 'back' ? 'front' : 'back'))}
            style={styles.sideBtn}
            accessibilityLabel="Flip camera"
          >
            <Text style={styles.sideBtnText}>⟳</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.shutter}
            onPress={handleCapture}
            disabled={isCapturing}
            accessibilityRole="button"
            accessibilityLabel="Take photo"
          >
            {isCapturing ? (
              <ActivityIndicator color="#141414" />
            ) : (
              <View style={styles.shutterInner} />
            )}
          </TouchableOpacity>

          <View style={styles.sideBtn} />
        </View>
      </View>
    </Modal>
  )
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#000000' },
  centered: { justifyContent: 'center', alignItems: 'center' },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
  },
  topText: { fontSize: 22, color: '#FFFFFF' },
  hint: { fontSize: 13, color: '#FFFFFFCC', fontFamily: 'Nunito_600SemiBold' },
  bottomBar: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-around',
    paddingHorizontal: 32,
  },
  sideBtn: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#FFFFFF22',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  sideBtnText: { fontSize: 22, color: '#FFFFFF' },
  shutter: {
    width: 74,
    height: 74,
    borderRadius: 37,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  shutterInner: { width: 60, height: 60, borderRadius: 30, backgroundColor: '#141414' },
  permissionTitle: {
    fontSize: 18,
    fontFamily: 'Nunito_700Bold',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  permissionBody: {
    fontSize: 14,
    color: '#FFFFFFCC',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
  },
  primaryBtn: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingHorizontal: 24,
    paddingVertical: 12,
    marginBottom: 12,
  },
  primaryBtnText: { color: '#141414', fontSize: 15, fontFamily: 'Nunito_600SemiBold' },
  closeBtn: { padding: 8 },
  closeText: { color: '#FFFFFFCC', fontSize: 14 },
})
