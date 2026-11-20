"use client";

import React, { forwardRef, useState } from "react";
import { Lock, Eye, EyeOff } from "lucide-react";
import { Input } from "./Input.jsx";

export const PasswordInput = forwardRef(({ ...props }, ref) => {
  const [show, setShow] = useState(false);

  return (
    <Input
      ref={ref}
      type={show ? "text" : "password"}
      icon={Lock}
      iconRight={
        <button
          type="button"
          onClick={() => setShow(!show)}
          tabIndex={-1}
          aria-label={show ? "Hide password" : "Show password"}
          className="text-slate-400 hover:text-slate-700 dark:hover:text-white transition-colors focus:outline-none"
        >
          {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
        </button>
      }
      {...props}
    />
  );
});

PasswordInput.displayName = "PasswordInput";
export default PasswordInput;
