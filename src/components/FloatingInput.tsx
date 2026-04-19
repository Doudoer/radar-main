import React, { useState, useRef } from 'react';

interface FloatingInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
  value: string;
}

const FloatingInput: React.FC<FloatingInputProps> = ({ label, value, ...props }) => {
  const [isFocused, setIsFocused] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFocus = () => setIsFocused(true);
  const handleBlur = () => setIsFocused(false);

  return (
    <div className="relative my-2">
      <input
        ref={inputRef}
        className={
          `block w-full h-[44px] px-2 rounded border bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none transition-all duration-200`
        }
        {...props}
        value={value}
        onFocus={handleFocus}
        onBlur={handleBlur}
      />
      <label
        className={
          `absolute left-2 px-1 pointer-events-none transition-all duration-200 bg-white dark:bg-gray-800 ` +
          `${isFocused || value ? 'text-xs -top-3.5 text-blue-500' : 'text-gray-500 top-2'} `
        }
        onClick={() => inputRef.current?.focus()}
      >
        {label}
      </label>
    </div>
  );
};

export default FloatingInput;