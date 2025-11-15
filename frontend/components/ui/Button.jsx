import clsx from 'clsx';

export function Button({ className, ...props }) {
  return (
    <button
      className={clsx(
        'inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:bg-primary-300 disabled:cursor-not-allowed',
        className
      )}
      {...props}
    />
  );
}

export function SecondaryButton({ className, ...props }) {
  return (
    <button
      className={clsx(
        'inline-flex items-center justify-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md shadow-sm text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:bg-gray-100 disabled:cursor-not-allowed',
        className
      )}
      {...props}
    />
  );
}
