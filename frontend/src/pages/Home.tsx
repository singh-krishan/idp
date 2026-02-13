import { Link } from 'react-router-dom'

export default function Home() {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      {/* Hero Section */}
      <div className="text-center mb-16">
        <h1 className="text-5xl font-extrabold text-gray-900 mb-4">
          Welcome to <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-pink-500">DevForge IDP</span>
        </h1>
        <p className="text-2xl text-gray-600 font-medium">
          Build and deploy microservices in minutes, not hours.
        </p>
        <p className="mt-4 text-lg text-gray-500 max-w-3xl mx-auto">
          DevForge is an Internal Developer Platform that automates the entire lifecycle of creating, deploying, and managing microservices with production-ready infrastructure.
        </p>
      </div>

      {/* How It Works */}
      <section className="mb-16">
        <h2 className="text-3xl font-bold text-gray-900 mb-8 text-center">How It Works</h2>

        {/* Step 1 */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h3 className="text-2xl font-bold text-indigo-600 mb-4">1. Choose a Template</h3>
          <p className="text-gray-700 mb-4">Select from pre-configured service templates:</p>
          <ul className="space-y-2 mb-4">
            <li className="flex items-start">
              <span className="font-semibold text-gray-900 mr-2">• Python Microservice -</span>
              <span className="text-gray-700">FastAPI with health checks, Docker, and Helm charts</span>
            </li>
            <li className="flex items-start">
              <span className="font-semibold text-gray-900 mr-2">• Node.js API -</span>
              <span className="text-gray-700">Express.js with testing setup and deployment configs</span>
            </li>
          </ul>
          <p className="text-gray-700 font-semibold mb-2">Each template includes:</p>
          <ul className="grid grid-cols-1 md:grid-cols-2 gap-2 text-gray-700">
            <li className="flex items-center">
              <span className="text-green-500 mr-2">✓</span>
              Complete source code with best practices
            </li>
            <li className="flex items-center">
              <span className="text-green-500 mr-2">✓</span>
              Dockerfile for containerization
            </li>
            <li className="flex items-center">
              <span className="text-green-500 mr-2">✓</span>
              GitHub Actions CI/CD pipeline
            </li>
            <li className="flex items-center">
              <span className="text-green-500 mr-2">✓</span>
              Helm charts for Kubernetes deployment
            </li>
            <li className="flex items-center">
              <span className="text-green-500 mr-2">✓</span>
              Health check endpoints
            </li>
          </ul>
        </div>

        {/* Step 2 */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h3 className="text-2xl font-bold text-purple-600 mb-4">2. Create Your Project</h3>
          <p className="text-gray-700 mb-4">Fill in a simple form:</p>
          <ul className="space-y-2 mb-4 text-gray-700">
            <li><span className="font-semibold">Project Name -</span> Choose a unique name (e.g., <code className="bg-gray-100 px-2 py-1 rounded text-sm">user-service</code>)</li>
            <li><span className="font-semibold">Description -</span> Brief description of what your service does</li>
            <li><span className="font-semibold">Port -</span> Service port (default: 8000 for Python, 3000 for Node.js)</li>
          </ul>
          <p className="text-gray-700 mb-3">Click <span className="font-bold">"Create Project"</span> and the platform automatically:</p>
          <ol className="list-decimal list-inside space-y-2 text-gray-700 ml-4">
            <li>Generates code from template with your project name</li>
            <li>Creates a GitHub repository under your organization</li>
            <li>Pushes all code with initial commit</li>
            <li>Creates an ArgoCD application for GitOps deployment</li>
            <li>Deploys your service to Kubernetes</li>
          </ol>
        </div>

        {/* Step 3 */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h3 className="text-2xl font-bold text-pink-600 mb-4">3. Automated Deployment Flow</h3>
          <p className="text-gray-700 mb-4 font-semibold">Behind the scenes, the platform orchestrates:</p>
          <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-lg p-6 font-mono text-sm text-gray-800">
            <div className="space-y-2">
              <div>Your Request</div>
              <div className="ml-4">↓</div>
              <div>Backend API (FastAPI)</div>
              <div className="ml-4">↓</div>
              <div>Template Engine → Generates project files</div>
              <div className="ml-4">↓</div>
              <div>GitHub → Creates repo and pushes code</div>
              <div className="ml-4">↓</div>
              <div>GitHub Actions → Builds Docker image and pushes to registry</div>
              <div className="ml-4">↓</div>
              <div>ArgoCD → Detects new app and syncs to Kubernetes</div>
              <div className="ml-4">↓</div>
              <div>Kubernetes → Deploys your service with Ingress</div>
              <div className="ml-4">↓</div>
              <div className="font-bold text-green-600">Your Service is LIVE! 🎉</div>
            </div>
          </div>
          <div className="mt-6">
            <p className="text-gray-700 font-semibold mb-3">Technology Stack:</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-gray-700">
              <div><span className="font-semibold">Backend:</span> FastAPI (Python) - REST API orchestrating the workflow</div>
              <div><span className="font-semibold">Frontend:</span> React + TypeScript - This web interface</div>
              <div><span className="font-semibold">Source Control:</span> GitHub - Code repository and CI/CD</div>
              <div><span className="font-semibold">GitOps:</span> ArgoCD - Automated deployment and sync</div>
              <div><span className="font-semibold">Container Orchestration:</span> Kubernetes (k3s) - Running your services</div>
              <div><span className="font-semibold">Ingress:</span> Nginx Ingress Controller - Exposing services via HTTPS</div>
              <div><span className="font-semibold">SSL:</span> cert-manager + Let's Encrypt - Automatic HTTPS certificates</div>
              <div><span className="font-semibold">Database:</span> PostgreSQL - Storing project metadata</div>
            </div>
          </div>
        </div>

        {/* Step 4 */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h3 className="text-2xl font-bold text-indigo-600 mb-4">4. Access Your API</h3>
          <p className="text-gray-700 mb-4">Once your project status shows <span className="inline-block bg-green-100 text-green-800 px-2 py-1 rounded text-sm font-semibold">ACTIVE</span> (green badge):</p>

          <div className="mb-4">
            <p className="font-semibold text-gray-900 mb-2">Option 1: Via Ingress URL</p>
            <div className="bg-gray-100 rounded-lg p-4 font-mono text-sm">
              https://kris-idp.duckdns.org/&lt;your-project-name&gt;/hello
            </div>
            <p className="mt-2 text-gray-700">Example:</p>
            <div className="bg-gray-800 text-green-400 rounded-lg p-4 font-mono text-sm mt-2">
              curl https://kris-idp.duckdns.org/user-service/hello
            </div>
          </div>

          <div className="mb-4">
            <p className="font-semibold text-gray-900 mb-2">Option 2: Direct Access (for testing)</p>
            <ul className="list-disc list-inside space-y-1 text-gray-700 ml-4 mb-2">
              <li>Click on your project in the Dashboard</li>
              <li>Find the service endpoint details</li>
              <li>Use port-forward for local testing:</li>
            </ul>
            <div className="bg-gray-800 text-green-400 rounded-lg p-4 font-mono text-sm">
              kubectl port-forward svc/&lt;your-service-name&gt; 8000:80<br />
              curl http://localhost:8000/hello
            </div>
          </div>

          <div className="mb-4">
            <p className="font-semibold text-gray-900 mb-2">API Endpoints (Python template):</p>
            <ul className="list-disc list-inside space-y-1 text-gray-700 ml-4">
              <li><code className="bg-gray-100 px-2 py-1 rounded text-sm">GET /hello</code> - Hello world endpoint</li>
              <li><code className="bg-gray-100 px-2 py-1 rounded text-sm">GET /health</code> - Health check (used by Kubernetes probes)</li>
              <li><code className="bg-gray-100 px-2 py-1 rounded text-sm">GET /docs</code> - Interactive API documentation (Swagger UI)</li>
            </ul>
          </div>

          <div>
            <p className="font-semibold text-gray-900 mb-2">API Endpoints (Node.js template):</p>
            <ul className="list-disc list-inside space-y-1 text-gray-700 ml-4">
              <li><code className="bg-gray-100 px-2 py-1 rounded text-sm">GET /hello</code> - Hello world endpoint</li>
              <li><code className="bg-gray-100 px-2 py-1 rounded text-sm">GET /health</code> - Health check</li>
            </ul>
          </div>
        </div>
      </section>

      {/* Quick Start Guide */}
      <section className="bg-gradient-to-br from-indigo-50 to-purple-50 rounded-lg shadow-lg p-8 mb-16">
        <h2 className="text-3xl font-bold text-gray-900 mb-6 text-center">Quick Start Guide</h2>
        <h3 className="text-xl font-semibold text-indigo-600 mb-4">5-Minute Demo:</h3>
        <ol className="space-y-4 text-gray-700">
          <li className="flex items-start">
            <span className="font-bold text-indigo-600 mr-3 text-lg">1.</span>
            <div>
              <span className="font-semibold">Login</span> - Use your credentials or register a new account
            </div>
          </li>
          <li className="flex items-start">
            <span className="font-bold text-indigo-600 mr-3 text-lg">2.</span>
            <div>
              <span className="font-semibold">Go to Create Project</span> - Click "Create Project" in the navigation
            </div>
          </li>
          <li className="flex items-start">
            <span className="font-bold text-indigo-600 mr-3 text-lg">3.</span>
            <div>
              <span className="font-semibold">Fill the form:</span>
              <ul className="list-disc list-inside ml-4 mt-1">
                <li>Name: <code className="bg-white px-2 py-1 rounded text-sm">my-first-service</code></li>
                <li>Description: <code className="bg-white px-2 py-1 rounded text-sm">My first API</code></li>
                <li>Template: <code className="bg-white px-2 py-1 rounded text-sm">Python Microservice</code></li>
                <li>Port: <code className="bg-white px-2 py-1 rounded text-sm">8000</code></li>
              </ul>
            </div>
          </li>
          <li className="flex items-start">
            <span className="font-bold text-indigo-600 mr-3 text-lg">4.</span>
            <div>
              <span className="font-semibold">Click "Create Project"</span>
            </div>
          </li>
          <li className="flex items-start">
            <span className="font-bold text-indigo-600 mr-3 text-lg">5.</span>
            <div>
              <span className="font-semibold">Watch the magic happen:</span>
              <ul className="list-disc list-inside ml-4 mt-1">
                <li>Status changes: Pending → Building → Active</li>
                <li>GitHub repo appears with your code</li>
                <li>Service deploys to Kubernetes automatically</li>
              </ul>
            </div>
          </li>
          <li className="flex items-start">
            <span className="font-bold text-indigo-600 mr-3 text-lg">6.</span>
            <div>
              <span className="font-semibold">Test your API:</span>
              <div className="bg-gray-800 text-green-400 rounded-lg p-3 font-mono text-sm mt-2">
                curl https://kris-idp.duckdns.org/my-first-service/hello
              </div>
            </div>
          </li>
        </ol>

        <div className="mt-6 bg-white rounded-lg p-4">
          <p className="font-semibold text-gray-900 mb-2">Expected response:</p>
          <div className="bg-gray-800 text-green-400 rounded-lg p-3 font-mono text-sm">
            {`{`}<br />
            &nbsp;&nbsp;"message": "Hello from my-first-service!"<br />
            {`}`}
          </div>
        </div>
      </section>

      {/* Project Status Guide */}
      <section className="bg-white rounded-lg shadow-md p-8 mb-16">
        <h2 className="text-3xl font-bold text-gray-900 mb-6 text-center">Project Status Guide</h2>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Meaning</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">What's Happening</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              <tr>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-semibold bg-yellow-100 text-yellow-800">
                    🟡 Pending
                  </span>
                </td>
                <td className="px-6 py-4 text-gray-700">Queued</td>
                <td className="px-6 py-4 text-gray-700">Template rendering in progress</td>
              </tr>
              <tr>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-semibold bg-blue-100 text-blue-800">
                    🔵 Building
                  </span>
                </td>
                <td className="px-6 py-4 text-gray-700">In Progress</td>
                <td className="px-6 py-4 text-gray-700">GitHub repo created, CI/CD running, ArgoCD syncing</td>
              </tr>
              <tr>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-semibold bg-green-100 text-green-800">
                    🟢 Active
                  </span>
                </td>
                <td className="px-6 py-4 text-gray-700">Live</td>
                <td className="px-6 py-4 text-gray-700">Service deployed and healthy, API accessible</td>
              </tr>
              <tr>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-semibold bg-red-100 text-red-800">
                    🔴 Failed
                  </span>
                </td>
                <td className="px-6 py-4 text-gray-700">Error</td>
                <td className="px-6 py-4 text-gray-700">Deployment issue - check error message</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      {/* Troubleshooting */}
      <section className="bg-white rounded-lg shadow-md p-8 mb-16">
        <h2 className="text-3xl font-bold text-gray-900 mb-6 text-center">Troubleshooting</h2>
        <div className="space-y-6">
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Q: My project shows "Failed" status</h3>
            <ul className="list-disc list-inside space-y-1 text-gray-700 ml-4">
              <li>Click on the project to view error details</li>
              <li>Common issues: Port conflicts, invalid project name, GitHub rate limits</li>
              <li>Try: Use a different project name or port</li>
            </ul>
          </div>

          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Q: Service shows "Active" but API not responding</h3>
            <ul className="list-disc list-inside space-y-1 text-gray-700 ml-4">
              <li>Wait 2-3 minutes for DNS propagation</li>
              <li>Check if the pod is ready: <code className="bg-gray-100 px-2 py-1 rounded text-sm">kubectl get pods | grep &lt;your-project-name&gt;</code></li>
              <li>Verify ingress: <code className="bg-gray-100 px-2 py-1 rounded text-sm">kubectl get ingress -n default</code></li>
            </ul>
          </div>

          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Q: How do I update my service code?</h3>
            <ul className="list-disc list-inside space-y-1 text-gray-700 ml-4">
              <li>Your code is in GitHub: <code className="bg-gray-100 px-2 py-1 rounded text-sm">https://github.com/&lt;your-org&gt;/&lt;project-name&gt;</code></li>
              <li>Make changes and push to <code className="bg-gray-100 px-2 py-1 rounded text-sm">main</code> branch</li>
              <li>ArgoCD auto-syncs changes within 3 minutes</li>
              <li>Or manually sync via ArgoCD UI</li>
            </ul>
          </div>

          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Q: How do I delete a service?</h3>
            <ul className="list-disc list-inside space-y-1 text-gray-700 ml-4">
              <li>Dashboard → Click on project → Delete button</li>
              <li>This removes: GitHub repo, ArgoCD application, Kubernetes deployment</li>
            </ul>
          </div>
        </div>
      </section>

      {/* Next Steps */}
      <section className="bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-500 rounded-lg shadow-lg p-8 text-white">
        <h2 className="text-3xl font-bold mb-6 text-center">Next Steps</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <div className="bg-white/10 rounded-lg p-6 backdrop-blur-sm">
            <h3 className="text-xl font-semibold mb-3">✅ Create Your First Project</h3>
            <p className="mb-4">Start building your microservice in minutes</p>
            <Link
              to="/create"
              className="inline-block bg-white text-indigo-600 px-6 py-3 rounded-lg font-semibold hover:bg-indigo-50 transition-colors"
            >
              Create Project →
            </Link>
          </div>

          <div className="bg-white/10 rounded-lg p-6 backdrop-blur-sm">
            <h3 className="text-xl font-semibold mb-3">✅ View Dashboard</h3>
            <p className="mb-4">Monitor all your services in one place</p>
            <Link
              to="/dashboard"
              className="inline-block bg-white text-purple-600 px-6 py-3 rounded-lg font-semibold hover:bg-purple-50 transition-colors"
            >
              Go to Dashboard →
            </Link>
          </div>
        </div>

        <div className="text-center">
          <p className="text-lg opacity-90">
            Built with ❤️ using React, FastAPI, Kubernetes, ArgoCD, and Claude AI
          </p>
        </div>
      </section>
    </div>
  )
}
