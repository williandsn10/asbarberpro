import * as React from "react";
import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

interface GlowInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  icon?: React.ReactNode;
  endIcon?: React.ReactNode;
}

const GlowInput = React.forwardRef<HTMLInputElement, GlowInputProps>(
  ({ label, icon, endIcon, className, ...props }, ref) => {
    const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
    const [isHovering, setIsHovering] = useState(false);

    const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
      const rect = e.currentTarget.getBoundingClientRect();
      setMousePosition({
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      });
    };

    return (
      <div className="space-y-2">
        {label && (
          <Label className="text-sm font-medium text-foreground/80">
            {label}
          </Label>
        )}
        <div
          className="relative overflow-hidden rounded-lg"
          onMouseMove={handleMouseMove}
          onMouseEnter={() => setIsHovering(true)}
          onMouseLeave={() => setIsHovering(false)}
        >
          <Input
            ref={ref}
            className={cn(
              "bg-secondary/50 border-border/50 transition-all duration-300",
              "focus:border-primary/50 focus:ring-1 focus:ring-primary/20",
              "hover:border-primary/30",
              icon && "pl-10",
              endIcon && "pr-10",
              className
            )}
            {...props}
          />

          {/* Outer glow effect that follows mouse */}
          {isHovering && (
            <>
              <div
                className="pointer-events-none absolute inset-0 opacity-40 transition-opacity duration-300"
                style={{
                  background: `radial-gradient(200px circle at ${mousePosition.x}px ${mousePosition.y}px, 
                    hsl(var(--primary) / 0.15), transparent 70%)`,
                }}
              />
              <div
                className="pointer-events-none absolute inset-0 opacity-60"
                style={{
                  background: `radial-gradient(100px circle at ${mousePosition.x}px ${mousePosition.y}px, 
                    hsl(var(--primary) / 0.2), transparent 50%)`,
                }}
              />
            </>
          )}

          {/* Start icon */}
          {icon && (
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none">
              {icon}
            </div>
          )}

          {/* End icon */}
          {endIcon && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
              {endIcon}
            </div>
          )}
        </div>
      </div>
    );
  }
);

GlowInput.displayName = "GlowInput";

export { GlowInput };
