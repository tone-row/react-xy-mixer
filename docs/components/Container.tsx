import { ReactNode } from "react";
import { Box, BoxProps } from "./slang";

export default function Container({
  children,
  ...props
}: { children: ReactNode } & BoxProps) {
  return (
    <Box contain={200} as="div" {...props}>
      {children}
    </Box>
  );
}
