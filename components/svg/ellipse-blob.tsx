import React from "react";
import Svg, {
  Circle,
  Defs,
  FeBlend,
  FeFlood,
  FeGaussianBlur,
  Filter,
  LinearGradient,
  Stop,
} from "react-native-svg";

interface EllipseBlobProps {
  width?: number;
  height?: number;
}

export function EllipseBlob({ width = 393, height = 319 }: EllipseBlobProps) {
  return (
    <Svg width={width} height={height} viewBox="0 0 393 319" fill="none">
      <Defs>
        <Filter
          id="filter0_f"
          x="-184.2"
          y="-454.2"
          width="772.4"
          height="772.4"
          filterUnits="userSpaceOnUse"
        >
          <FeFlood floodOpacity="0" result="BackgroundImageFix" />
          <FeBlend
            mode="normal"
            in="SourceGraphic"
            in2="BackgroundImageFix"
            result="shape"
          />
          <FeGaussianBlur stdDeviation="48.1" result="effect1_foregroundBlur" />
        </Filter>
        <LinearGradient
          id="paint0_linear"
          x1="202"
          y1="-358"
          x2="202"
          y2="222"
          gradientUnits="userSpaceOnUse"
        >
          <Stop stopColor="#EADFEA" />
          <Stop offset="1" stopColor="#F6E7A6" />
        </LinearGradient>
      </Defs>
      <Circle
        cx="202"
        cy="-68"
        r="290"
        fill="url(#paint0_linear)"
        filter="url(#filter0_f)"
      />
    </Svg>
  );
}
