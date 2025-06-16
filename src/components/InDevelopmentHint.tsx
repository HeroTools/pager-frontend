import { ReactNode } from "react";

import { Hint } from "./Hint";

interface InDevelopmentHintProps {
  children: ReactNode;
  side?: "top" | "bottom" | "left" | "right";
}

export const InDevelopmentHint = ({
  children,
  side,
}: InDevelopmentHintProps) => {
  return (
    <Hint label="In development" side={side}>
      <span>{children}</span>
    </Hint>
  );
};
