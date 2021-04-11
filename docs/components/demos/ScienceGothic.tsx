import { CSSProperties } from "react";
import { Mixer, useMixer } from "react-xy-mixer";
import Container from "../Container";
import { Box } from "../slang";
import styles from "./ScienceGothic.module.css";

export default function ScienceGothic() {
  const [props, weights] = useMixer(3);
  console.log(weights);
  return (
    <Box p={2} template="none / auto minmax(0, 1fr)" items="center normal">
      <Mixer {...props} />
      <Box
        overflow="hidden"
        className={styles.Text}
        style={toFontVariationSettings(weights)}
      >
        I'm a variable font! Drag the slider to see my variations.
      </Box>
    </Box>
  );
}

const settings = [
  [900, 50, 18, 0],
  [100, 200, 18, 0],
  [100, 50, 122, 0],
];

function toFontVariationSettings(weights: number[]) {
  const r = settings.reduce((acc, option, i) => {
    return option.map((x, j) => x * weights[i] + acc[j]);
  }, Array(settings[0].length).fill(0));

  // console.log(r);

  return {
    "--weight": r[0],
    "--width": r[1],
    "--y": r[2],
    "--slant": r[3],
  } as CSSProperties;
}
