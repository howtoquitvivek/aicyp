import React from 'react';
import { cn } from './Card'; // reuse utility

const Button = React.forwardRef(({ className, variant = 'primary', size = 'default', children, ...props }, ref) => {
  const baseStyles = "inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-white transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-950 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50";
  
  const variants = {
    primary: "bg-neutral-900 text-neutral-50 hover:bg-neutral-900/90 shadow-sm",
    secondary: "bg-neutral-100 text-neutral-900 hover:bg-neutral-100/80",
    outline: "border border-neutral-200 bg-white hover:bg-neutral-100 hover:text-neutral-900",
    ghost: "hover:bg-neutral-100 hover:text-neutral-900",
    danger: "bg-red-500 text-neutral-50 hover:bg-red-500/90 shadow-sm",
  };

  const sizes = {
    default: "h-10 px-4 py-2",
    sm: "h-9 rounded-md px-3",
    lg: "h-11 rounded-md px-8",
    icon: "h-10 w-10",
  };

  return (
    <button
      ref={ref}
      className={cn(baseStyles, variants[variant], sizes[size], className)}
      {...props}
    >
      {children}
    </button>
  );
});

Button.displayName = "Button";

export { Button };
export default Button;
