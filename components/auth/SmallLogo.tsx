import { Asset } from "expo-asset";
import React from "react";
import { View } from "react-native";
import { SvgUri } from "react-native-svg";

const logoUri = Asset.fromModule(require("../../assets/app-icon.svg")).uri;

export function SmallLogo() {
  return (
    <View style={{ width: 140, height: 100 }}>
      <SvgUri width="100%" height="100%" uri={logoUri} />
    </View>
  );
}
