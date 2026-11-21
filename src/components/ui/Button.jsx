"use client";

import React, { forwardRef } from "react";
import { cva } from "class-variance-authority";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils/cn.js";

export const buttonVariants = cva(
  "inline-flex items-center justify-center flex-row whitespace-nowrap font-semibold rounded-2xl transition-all duration-200 select-none [&_svg]:shrink-0 [&_svg]:inline-block focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none active:scale-[0.98]",
  {
    variants: {
      variant: {
        primary:
          "bg-gradient-to-r from-[#2438E8] via-[#2B2FE0] to-[#6D28D9] text-white shadow-md shadow-indigo-600/25 hover:shadow-indigo-600/40 hover:brightness-105 focus-visible:ring-primary-blue",
        secondary:
          "bg-white dark:bg-slate-800 text-[#111936] dark:text-white border border-slate-200 dark:border-white/10 hover:bg-slate-50 dark:hover:bg-slate-700/80 shadow-sm focus-visible:ring-slate-400",
        outline:
          "border-2 border-primary-blue text-primary-blue dark:text-indigo-400 hover:bg-primary-blue/5 dark:hover:bg-primary-blue/15 focus-visible:ring-primary-blue",
        ghost:
          "text-text-muted hover:text-text-dark dark:text-slate-300 dark:hover:text-white hover:bg-slate-100/80 dark:hover:bg-white/5 focus-visible:ring-slate-400",
        danger:
          "bg-red-600 text-white hover:bg-red-700 shadow-md shadow-red-600/20 focus-visible:ring-red-600",
        link:
          "text-primary-blue dark:text-indigo-400 hover:underline underline-offset-4 p-0 h-auto font-medium",
      },
      size: {
        xs: "h-8 px-2.5 text-xs gap-1.5",
        sm: "h-9 px-3.5 text-xs gap-1.5",
        md: "h-11 px-5 text-sm gap-2",
        lg: "h-13 px-6 text-base gap-2.5",
      },
    },
    defaultVariants: {
      variant: "primary",
      size: "md",
    },
  }
);

export const Button = forwardRef(
  (
    {
      className,
      variant,
      size,
      asChild = false,
      loading = false,
      isLoading,
      iconLeft: IconLeft,
      iconRight: IconRight,
      leftIcon,
      rightIcon,
      disabled,
      children,
      ...props
    },
    ref
  ) => {
    const isSpinning = Boolean(loading || isLoading);
    const ResolvedLeft = leftIcon || IconLeft;
    const ResolvedRight = rightIcon || IconRight;

    const renderIcon = (icon) => {
      if (!icon) return null;
      if (React.isValidElement(icon)) return icon;
      const IconComp = icon;
      return <IconComp className="w-4 h-4 flex-shrink-0" />;
    };

    const classes = cn(buttonVariants({ variant, size }), className);

    if (asChild && React.isValidElement(children)) {
      const childProps = children.props || {};
      return React.cloneElement(children, {
        ref,
        className: cn(classes, childProps.className),
        ...props,
        children: (
          <>
            {isSpinning ? (
              <Loader2 className="w-4 h-4 animate-spin flex-shrink-0" />
            ) : (
              renderIcon(ResolvedLeft)
            )}
            {childProps.children != null && (
              <span className="inline-flex items-center justify-center flex-row gap-2 whitespace-nowrap">
                {childProps.children}
              </span>
            )}
            {!isSpinning && renderIcon(ResolvedRight)}
          </>
        ),
      });
    }

    return (
      <button
        ref={ref}
        disabled={disabled || isSpinning}
        className={classes}
        {...props}
      >
        {isSpinning ? (
          <Loader2 className="w-4 h-4 animate-spin flex-shrink-0" />
        ) : (
          renderIcon(ResolvedLeft)
        )}
        {children != null && (
          <span className="inline-flex items-center justify-center flex-row gap-2 whitespace-nowrap">
            {children}
          </span>
        )}
        {!isSpinning && renderIcon(ResolvedRight)}
      </button>
    );
  }
);

Button.displayName = "Button";
export default Button;
