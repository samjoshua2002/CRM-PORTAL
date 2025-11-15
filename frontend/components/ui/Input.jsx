import clsx from 'clsx';
import React from 'react';

const Input = React.forwardRef(({ className, label, error, ...props }, ref) => {
  return (
    <div>
      {label && (
        <label htmlFor={props.id} className="block text-sm font-medium text-gray-700">
          {label}
        </label>
      )}
      <div className="mt-1">
        <input
          ref={ref}
          className={clsx(
            'appearance-none block w-full px-3 py-2 border rounded-md shadow-sm sm:text-sm',
            error
              ? 'border-red-500 text-red-900 placeholder-red-300 focus:outline-none focus:ring-red-500 focus:border-red-500'
              : 'border-gray-300 placeholder-gray-400 focus:outline-none focus:ring-primary-500 focus:border-primary-500',
            className
          )}
          {...props}
        />
      </div>
      {error && <p className="mt-2 text-sm text-red-600">{error.message}</p>}
    </div>
  );
});

Input.displayName = 'Input';

export { Input };
