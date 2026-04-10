import React, { useState } from 'react'
import { Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import Svg, { Path } from 'react-native-svg'

import type { Group } from './types'

interface GroupItemProps {
  group: Group
}

function ExpandArrow({ expanded }: { expanded: boolean }) {
  return (
    <View style={styles.arrowContainer}>
      <Svg width={16} height={16} viewBox="0 0 16 16" fill="none">
        <Path
          d={expanded ? 'M12 10L8 6L4 10' : 'M4 6L8 10L12 6'}
          stroke="#9CA3AF"
          strokeWidth={1.5}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </Svg>
    </View>
  )
}

export default function GroupItem({ group }: GroupItemProps) {
  const [expanded, setExpanded] = useState(false)
  const isOwedToYou = group.balanceType === 'owes_you'
  const hasMembers = group.members && group.members.length > 0

  const formatAmount = (amount: number) =>
    `$${amount.toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`

  return (
    <View>
      <TouchableOpacity
        style={styles.container}
        onPress={() => hasMembers && setExpanded(!expanded)}
        activeOpacity={hasMembers ? 0.7 : 1}
      >
        {/* Avatar */}
        <View style={styles.avatarContainer}>
          <Image source={group.avatar} style={styles.avatar} />
          {group.emoji && (
            <View style={styles.emojiOverlay}>
              <Text style={styles.emojiText}>{group.emoji}</Text>
            </View>
          )}
        </View>

        {/* Name */}
        <View style={styles.infoContainer}>
          <Text style={styles.name} numberOfLines={1}>
            {group.name}
          </Text>
        </View>

        {/* Amount + expand arrow */}
        <View style={styles.rightContainer}>
          <View style={styles.amountContainer}>
            <Text style={styles.owesLabel}>{isOwedToYou ? 'owes you' : 'you owe'}</Text>
            <Text style={[styles.amount, isOwedToYou ? styles.amountGreen : styles.amountOrange]}>
              {formatAmount(group.amount)}
            </Text>
          </View>
          {hasMembers && <ExpandArrow expanded={expanded} />}
        </View>
      </TouchableOpacity>

      {/* Expanded member details */}
      {expanded && group.members && (
        <View style={styles.membersContainer}>
          {group.members.map((member, index) => {
            const memberIsOwed = member.balanceType === 'owes_you'
            return (
              <View key={index} style={styles.memberRow}>
                <Text style={styles.memberBullet}>•</Text>
                <Text style={styles.memberText}>
                  {member.name} {memberIsOwed ? 'owes you' : 'is owed'}{' '}
                </Text>
                <Text
                  style={[
                    styles.memberAmount,
                    memberIsOwed ? styles.amountGreen : styles.amountOrange,
                  ]}
                >
                  {formatAmount(member.amount)}
                </Text>
              </View>
            )
          })}
        </View>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 4,
  },
  avatarContainer: {
    marginRight: 12,
    position: 'relative',
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
  },
  emojiOverlay: {
    position: 'absolute',
    bottom: -2,
    right: -4,
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    width: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emojiText: {
    fontSize: 12,
  },
  infoContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  name: {
    color: '#141414',
    fontFamily: 'Nunito_400Regular',
    fontSize: 16,
    fontWeight: '400',
    lineHeight: 16,
  },
  rightContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  amountContainer: {
    alignItems: 'flex-end',
  },
  owesLabel: {
    color: '#9CA3AF',
    fontFamily: 'Nunito_400Regular',
    fontSize: 12,
    fontWeight: '400',
    lineHeight: 18,
  },
  amount: {
    fontFamily: 'Nunito_700Bold',
    fontSize: 16,
    fontWeight: '700',
    lineHeight: 24,
  },
  amountGreen: {
    color: '#44BB73',
  },
  amountOrange: {
    color: '#D48D4F',
  },
  arrowContainer: {
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  membersContainer: {
    paddingLeft: 60,
    paddingBottom: 8,
  },
  memberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 2,
  },
  memberBullet: {
    color: '#141414',
    fontSize: 14,
    marginRight: 6,
  },
  memberText: {
    color: '#141414',
    fontFamily: 'Nunito_400Regular',
    fontSize: 13,
    fontWeight: '400',
    lineHeight: 20,
  },
  memberAmount: {
    fontFamily: 'Nunito_700Bold',
    fontSize: 13,
    fontWeight: '700',
    lineHeight: 20,
  },
})
