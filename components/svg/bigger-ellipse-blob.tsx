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

interface BiggerEllipseBlobProps {
  width?: number;
  height?: number;
}

export function BiggerEllipseBlob({
  width = 393,
  height = 543,
}: BiggerEllipseBlobProps) {
  return (
    <Svg width={width} height={height} viewBox="0 0 393 543" fill="none">
      <Defs>
        <Filter
          id="filter0_f_bigger"
          x="-184.2"
          y="-230.2"
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
          id="paint0_linear_bigger"
          x1="202"
          y1="-134"
          x2="202"
          y2="446"
          gradientUnits="userSpaceOnUse"
        >
          <Stop stopColor="#EADFEA" />
          <Stop offset="1" stopColor="#F6E7A6" />
        </LinearGradient>
      </Defs>
      <Circle
        cx="202"
        cy="156"
        r="290"
        fill="url(#paint0_linear_bigger)"
        filter="url(#filter0_f_bigger)"
      />
    </Svg>
  );
}
