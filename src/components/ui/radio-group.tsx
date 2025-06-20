import * as React from "react";
import { cn } from "@/lib/utils";

export interface RadioGroupProps {
  options: { label: string; value: string }[];
  value: string;
  onChange: (value: string) => void;
  name?: string;
  className?: string;
}

export const RadioGroup: React.FC<RadioGroupProps> = ({
  options,
  value,
  onChange,
  name,
  className,
}) => {
  return (
    <div className={cn("flex flex-col gap-2", className)}>
      {options.map((option) => (
        <label
          key={option.value}
          className={cn(
            "flex items-center gap-2 cursor-pointer p-2 rounded hover:bg-muted transition",
            value === option.value ? "bg-muted" : ""
          )}
        >
          <input
            type="radio"
            name={name}
            value={option.value}
            checked={value === option.value}
            onChange={() => onChange(option.value)}
            className="accent-primary"
          />
          <span>{option.label}</span>
        </label>
      ))}
    </div>
  );
}; 