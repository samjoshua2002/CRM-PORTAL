import './globals.css';

export const metadata = {
  title: 'EduCRM - Lead Management',
  description: 'Educational CRM for managing leads and student lifecycle.',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <div className="min-h-screen flex flex-col">
          <header className="bg-white shadow-sm">
            <nav className="container mx-auto px-4 sm:px-6 lg:px-8">
              <div className="w-full py-6 flex items-center justify-between border-b border-primary-500 lg:border-none">
                <div className="flex items-center">
                  <a href="/">
                    <h1 className="text-2xl font-bold text-primary-600">EduCRM</h1>
                  </a>
                </div>
                <div className="hidden lg:flex lg:items-center lg:space-x-8">
                  <a href="/lead-capture" className="text-base font-medium text-gray-500 hover:text-gray-900">
                    Lead Capture
                  </a>
                  <a href="/leads" className="text-base font-medium text-gray-500 hover:text-gray-900">
                    My Leads
                  </a>
                  <a href="/dashboard" className="text-base font-medium text-gray-500 hover:text-gray-900">
                    Dashboard
                  </a>
                </div>
              </div>
            </nav>
          </header>

          <main className="flex-grow container mx-auto px-4 sm:px-6 lg:px-8 py-8">
            {children}
          </main>

          <footer className="bg-white">
            <div className="container mx-auto py-8 px-4 sm:px-6 lg:px-8">
              <div className="border-t border-gray-200 pt-8">
                <p className="text-base text-gray-400 xl:text-center">
                  &copy; {new Date().getFullYear()} EduCRM, Inc. All rights reserved.
                </p>
              </div>
            </div>
          </footer>
        </div>
      </body>
    </html>
  );
}
