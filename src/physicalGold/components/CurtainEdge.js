import React, { memo } from "react";
import { Dimensions, StyleSheet } from "react-native";
import Svg, { Path } from "react-native-svg";

// Curtain edge under the home top band: a row of rounded scallops hanging
// over the content, in the band's colour (same as the ASKOXY.AI home screen).
// `borderColor` traces the scalloped edge with a thin line.
const { width: screenWidth } = Dimensions.get("window");
const SCALLOP_WIDTH = 26;
const SCALLOP_DEPTH = 10;
const BORDER_WIDTH = 1;
const SCALLOP_COUNT = Math.ceil(screenWidth / SCALLOP_WIDTH);
const EDGE_PATH = (() => {
  let d = "M0 0";
  for (let i = 0; i < SCALLOP_COUNT; i++) {
    const x = i * SCALLOP_WIDTH;
    d += ` Q${x + SCALLOP_WIDTH / 2} ${SCALLOP_DEPTH * 2} ${x + SCALLOP_WIDTH} 0`;
  }
  return d;
})();
const CURTAIN_PATH = `${EDGE_PATH} Z`;

// Total height the curtain hangs below the band, border included.
export const CURTAIN_HEIGHT = SCALLOP_DEPTH + BORDER_WIDTH + 1;

const CurtainEdge = ({ color, borderColor }) => (
  <Svg
    width={SCALLOP_COUNT * SCALLOP_WIDTH}
    height={CURTAIN_HEIGHT}
    style={styles.curtain}
    pointerEvents="none"
  >
    <Path d={CURTAIN_PATH} fill={color} />
    {borderColor ? (
      <Path d={EDGE_PATH} fill="none" stroke={borderColor} strokeWidth={BORDER_WIDTH} />
    ) : null}
  </Svg>
);

const styles = StyleSheet.create({
  // Sits right under the band; overlaps it by 1px so no seam shows.
  curtain: { marginTop: -1 },
});

export default memo(CurtainEdge);
