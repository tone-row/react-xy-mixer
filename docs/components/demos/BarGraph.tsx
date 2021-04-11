import React from "react";
import { Box } from "../slang";
import { Mixer, useMixer } from "react-xy-mixer";
import styles from "./BarGraph.module.css";

export default function BarGraph() {
  const [props, weights] = useMixer(5);

  // const percentages = weights.map((w) => `${Math.floor(w * 100)}%`);
  // console.log(percentages);

  return (
    <Box template="none / auto minmax(0, 1fr)" gap={3}>
      <Mixer {...props} />
      <Box>
        <div className={styles.Graph}>
          {weights
            .map((w) => `${(100 * w).toFixed(2)}%`)
            .map((width) => (
              <Box style={{ width }} />
            ))}
        </div>
      </Box>
    </Box>
  );
}
