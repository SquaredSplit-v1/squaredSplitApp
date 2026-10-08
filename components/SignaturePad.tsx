// components/SignaturePad.tsx — dependency-free signature capture.
// Touch points are collected with PanResponder, rendered as an SVG path,
// and exported to a base64 PNG via react-native-svg's toDataURL.

import React, { useCallback, useRef, useState } from 'react'
import { PanResponder, StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import Svg, { Path } from 'react-native-svg'

interface Point {
  x: number
  y: number
}

interface Props {
  width: number
  height: number
  onComplete: (base64Png: string | null) => void
  onCancel: () => void
}

export default function SignaturePad({ width, height, onComplete, onCancel }: Props) {
  const [paths, setPaths] = useState<string[]>([])
  const currentPoints = useRef<Point[]>([])
  const svgRef = useRef<Svg>(null)
  const [isExporting, setIsExporting] = useState(false)

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: () => {
        currentPoints.current = []
        setPaths(prev => [...prev, ''])
      },
      onPanResponderMove: evt => {
        currentPoints.current.push({
          x: evt.nativeEvent.locationX,
          y: evt.nativeEvent.locationY,
        })
        const pts = currentPoints.current
        if (pts.length < 2) return
        const seg = `M ${pts[pts.length - 2].x} ${pts[pts.length - 2].y} L ${pts[pts.length - 1].x} ${pts[pts.length - 1].y} `
        setPaths(prev => {
          const next = [...prev]
          next[next.length - 1] = (next[next.length - 1] ?? '') + seg
          return next
        })
      },
    })
  ).current

  const handleDone = useCallback(() => {
    const hasInk = paths.some(p => p.trim().length > 0)
    if (!hasInk || isExporting) return
    setIsExporting(true)
    svgRef.current?.toDataURL(base64 => {
      setIsExporting(false)
      onComplete(base64)
    })
  }, [paths, isExporting, onComplete])

  return (
    <View style={styles.wrap}>
      <View style={styles.canvasWrap}>
        <View style={[styles.canvas, { width, height }]} {...panResponder.panHandlers}>
          <Svg ref={svgRef} width={width} height={height} style={styles.svg}>
            {paths.map((d, i) => (
              <Path
                key={i}
                d={d}
                stroke="#141414"
                strokeWidth={2.5}
                fill="none"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            ))}
          </Svg>
          <View style={[styles.baseline, { width }]} pointerEvents="none" />
          <Text style={styles.hint} pointerEvents="none">
            Sign above the line
          </Text>
        </View>
      </View>
      <View style={styles.btnRow}>
        <TouchableOpacity style={styles.clearBtn} onPress={() => setPaths([])}>
          <Text style={styles.clearBtnText}>Clear</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.cancelBtn} onPress={onCancel}>
          <Text style={styles.cancelBtnText}>Skip</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.doneBtn} onPress={handleDone}>
          <Text style={styles.doneBtnText}>{isExporting ? 'Saving…' : 'Add signature'}</Text>
        </TouchableOpacity>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  wrap: { gap: 12 },
  canvasWrap: {
    borderWidth: 1.5,
    borderColor: '#D1D5DB',
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#FFFFFF',
  },
  canvas: { backgroundColor: '#FAFAFC' },
  svg: { position: 'absolute', top: 0, left: 0 },
  baseline: {
    position: 'absolute',
    bottom: 44,
    left: 24,
    height: 1,
    backgroundColor: '#9CA3AF',
  },
  hint: {
    position: 'absolute',
    bottom: 22,
    alignSelf: 'center',
    color: '#9CA3AF',
    fontSize: 12,
    fontFamily: 'Nunito_400Regular',
  },
  btnRow: { flexDirection: 'row', gap: 8 },
  clearBtn: {
    flex: 1,
    height: 44,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#D1D5DB',
    justifyContent: 'center',
    alignItems: 'center',
  },
  clearBtnText: { color: '#6B6B6B', fontSize: 15, fontFamily: 'Nunito_600SemiBold' },
  cancelBtn: {
    flex: 1,
    height: 44,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cancelBtnText: { color: '#3273CD', fontSize: 15, fontFamily: 'Nunito_600SemiBold' },
  doneBtn: {
    flex: 2,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#141414',
    justifyContent: 'center',
    alignItems: 'center',
  },
  doneBtnText: { color: '#FFFFFF', fontSize: 15, fontFamily: 'Nunito_600SemiBold' },
})
