import React from 'react';
import { cn } from './Card';

const Input = React.forwardRef(({ className, type, label, icon: Icon, id, ...props }, ref) => {
  const inputId = id || `input-${Math.random().toString(36).substr(2, 9)}`;
  
  return (
    <div className="w-full flex flex-col gap-2 text-left">
      {label && (
        <label htmlFor={inputId} className="text-xs font-semibold tracking-wider text-neutral-500 uppercase">
          {label}
        </label>
      )}
      <div className="relative flex items-center w-full">
        {Icon && (
          <div className="absolute left-4 text-neutral-400 pointer-events-none">
            <Icon size={18} />
          </div>
        )}
        <input
          id={inputId}
          type={type}
          className={cn(
            "flex h-12 w-full rounded-xl border border-neutral-200 bg-neutral-50/50 px-4 py-3 text-sm text-neutral-900 placeholder:text-neutral-400 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-neutral-900 focus:border-neutral-900 disabled:cursor-not-allowed disabled:opacity-50 hover:bg-neutral-50",
            Icon ? "pl-11" : "",
            className
          )}
          ref={ref}
          {...props}
        />
      </div>
    </div>
  );
});
Input.displayName = "Input";

export { Input };
export default Input;
