import clsx from 'clsx';

export function Card({ className, ...props }) {
  return (
    <div
      className={clsx('bg-white shadow rounded-lg', className)}
      {...props}
    />
  );
}

export function CardHeader({ className, ...props }) {
  return (
    <div
      className={clsx('px-4 py-5 sm:px-6 border-b border-gray-200', className)}
      {...props}
    />
  );
}

export function CardContent({ className, ...props }) {
  return <div className={clsx('p-4 sm:p-6', className)} {...props} />;
}

export function CardTitle({ className, ...props }) {
  return (
    <h3
      className={clsx('text-lg leading-6 font-medium text-gray-900', className)}
      {...props}
    />
  );
}
