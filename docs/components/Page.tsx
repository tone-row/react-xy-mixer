import React, { ReactNode } from "react";
import { padding } from "./constants";
import { Box, Type } from "./slang";
import styles from "./Page.module.css";
import Container from "./Container";

export default function Page({ children }: { children: ReactNode }) {
  return (
    <Box root template="auto minmax(0, 1fr)">
      <Container as="header" p={padding} className={styles.Header} gap={3}>
        <Type weight="700" size={3}>
          react-xy-mixer
        </Type>
        <Type size={-1}>
          2-dimensional slider for blending arrays of numbers
        </Type>
        <Box flow="column" gap={4} content="normal center">
          <Type>Quick Start</Type>
          <Type>Demos</Type>
          <Type>API</Type>
        </Box>
      </Container>
      <Box as="main" p={padding}>
        {children}
      </Box>
    </Box>
  );
}
