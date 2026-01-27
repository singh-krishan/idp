import { useState } from 'react';
import ProjectForm from './components/ProjectForm';
import ProjectList from './components/ProjectList';

function App() {
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const handleProjectCreated = () => {
    setRefreshTrigger(prev => prev + 1);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      {/* Navigation Header */}
      <nav className="bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-500 shadow-lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-20">
            <div className="flex items-center space-x-4">
              {/* Logo */}
              <div className="flex-shrink-0">
                <svg className="h-12 w-12" viewBox="0 0 50 50" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <rect width="50" height="50" rx="10" fill="white" fillOpacity="0.1"/>
                  <path d="M25 10L15 20H20V35H30V20H35L25 10Z" fill="white"/>
                  <circle cx="25" cy="40" r="2" fill="white"/>
                  <path d="M12 15L18 15" stroke="white" strokeWidth="2" strokeLinecap="round"/>
                  <path d="M32 15L38 15" stroke="white" strokeWidth="2" strokeLinecap="round"/>
                </svg>
              </div>

              {/* Brand */}
              <div>
                <h1 className="text-2xl font-bold text-white tracking-tight">
                  DevForge
                </h1>
                <p className="text-indigo-100 text-sm font-medium">
                  Internal Developer Platform
                </p>
              </div>
            </div>

            {/* Navigation Links */}
            <div className="hidden md:flex items-center space-x-6">
              <a href="#" className="text-white hover:text-indigo-100 transition-colors font-medium">
                Home
              </a>
              <a href="#" className="text-indigo-100 hover:text-white transition-colors font-medium">
                Catalog
              </a>
              <a href="#" className="text-indigo-100 hover:text-white transition-colors font-medium">
                Docs
              </a>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="text-center">
            <h2 className="text-4xl font-extrabold text-gray-900 sm:text-5xl">
              Build Services at
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-pink-500"> Lightning Speed</span>
            </h2>
            <p className="mt-4 text-xl text-gray-600 max-w-3xl mx-auto">
              Create production-ready microservices with automated CI/CD, Kubernetes deployment, and monitoring in minutes
            </p>

            {/* Stats */}
            <div className="mt-8 grid grid-cols-3 gap-8 max-w-2xl mx-auto">
              <div className="bg-gradient-to-br from-indigo-50 to-indigo-100 rounded-lg p-4">
                <div className="text-3xl font-bold text-indigo-600">2</div>
                <div className="text-sm text-gray-600 font-medium">Templates</div>
              </div>
              <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg p-4">
                <div className="text-3xl font-bold text-purple-600">100%</div>
                <div className="text-sm text-gray-600 font-medium">Automated</div>
              </div>
              <div className="bg-gradient-to-br from-pink-50 to-pink-100 rounded-lg p-4">
                <div className="text-3xl font-bold text-pink-600">&lt;5min</div>
                <div className="text-sm text-gray-600 font-medium">Deploy Time</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Left Column */}
          <div className="space-y-6">
            <ProjectForm onSuccess={handleProjectCreated} />
          </div>

          {/* Right Column */}
          <div className="space-y-6">
            <ProjectList refreshTrigger={refreshTrigger} />
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-gray-200 mt-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <div className="flex items-center space-x-3 mb-4 md:mb-0">
              <svg className="h-8 w-8" viewBox="0 0 50 50" fill="none" xmlns="http://www.w3.org/2000/svg">
                <rect width="50" height="50" rx="10" fill="url(#gradient)"/>
                <path d="M25 10L15 20H20V35H30V20H35L25 10Z" fill="white"/>
                <circle cx="25" cy="40" r="2" fill="white"/>
                <defs>
                  <linearGradient id="gradient" x1="0" y1="0" x2="50" y2="50">
                    <stop offset="0%" stopColor="#4F46E5"/>
                    <stop offset="100%" stopColor="#EC4899"/>
                  </linearGradient>
                </defs>
              </svg>
              <div>
                <div className="text-sm font-semibold text-gray-900">DevForge Platform</div>
                <div className="text-xs text-gray-500">v0.1.0</div>
              </div>
            </div>

            <div className="flex items-center space-x-6 text-sm text-gray-500">
              <a href="#" className="hover:text-indigo-600 transition-colors">Documentation</a>
              <a href="#" className="hover:text-indigo-600 transition-colors">API Reference</a>
              <a href="https://github.com/singh-krishan/idp" target="_blank" rel="noopener noreferrer" className="hover:text-indigo-600 transition-colors">
                GitHub
              </a>
            </div>
          </div>

          <div className="mt-6 pt-6 border-t border-gray-200 text-center">
            <p className="text-sm text-gray-500">
              Powered by React, FastAPI, Kubernetes & ArgoCD • Built with ❤️ using Claude
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default App;
