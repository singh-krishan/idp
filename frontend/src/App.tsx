import { useState } from 'react';
import ProjectForm from './components/ProjectForm';
import ProjectList from './components/ProjectList';

function App() {
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const handleProjectCreated = () => {
    // Trigger refresh of project list
    setRefreshTrigger(prev => prev + 1);
  };

  return (
    <div className="min-h-screen bg-gray-100">
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <h1 className="text-3xl font-bold text-gray-900">
            Internal Developer Platform
          </h1>
          <p className="text-gray-600 mt-1">
            Create and manage microservices with automated CI/CD and monitoring
          </p>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div>
            <ProjectForm onSuccess={handleProjectCreated} />
          </div>
          <div>
            <ProjectList refreshTrigger={refreshTrigger} />
          </div>
        </div>
      </main>

      <footer className="bg-white mt-12 border-t border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <p className="text-center text-gray-500 text-sm">
            IDP Platform v0.1.0 - Automated microservice creation and deployment
          </p>
        </div>
      </footer>
    </div>
  );
}

export default App;
