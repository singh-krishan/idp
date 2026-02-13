import { useState, useEffect } from 'react';
import { CreateProjectRequest, Template } from '../types/project';
import { templatesApi, projectsApi } from '../services/api';
import TemplateSelector from './TemplateSelector';
import OpenAPIUpload from './OpenAPIUpload';

interface ProjectFormProps {
  onSuccess: () => void;
}

export default function ProjectForm({ onSuccess }: ProjectFormProps) {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [openapiFile, setOpenapiFile] = useState<File | null>(null);

  const [formData, setFormData] = useState<CreateProjectRequest>({
    name: '',
    description: '',
    template_type: '',
    variables: {},
  });

  useEffect(() => {
    loadTemplates();
  }, []);

  const loadTemplates = async () => {
    try {
      const data = await templatesApi.listTemplates();
      setTemplates(data);
    } catch (err: any) {
      setError('Failed to load templates: ' + (err.response?.data?.detail || err.message));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      // Check if this is an OpenAPI template
      const isOpenAPITemplate = selectedTemplate?.requires_openapi_upload;

      if (isOpenAPITemplate) {
        // Validate file is uploaded
        if (!openapiFile) {
          setError('Please upload an OpenAPI specification file');
          setLoading(false);
          return;
        }

        // Use OpenAPI endpoint
        await projectsApi.createProjectFromOpenAPI({
          name: formData.name,
          description: formData.description,
          port: formData.variables?.port || '8000',
          openapi_file: openapiFile,
        });
      } else {
        // Use standard endpoint
        await projectsApi.createProject(formData);
      }

      // Reset form
      setFormData({
        name: '',
        description: '',
        template_type: '',
        variables: {},
      });
      setOpenapiFile(null);
      onSuccess();
    } catch (err: any) {
      setError(err.response?.data?.detail || err.message || 'Failed to create project');
    } finally {
      setLoading(false);
    }
  };

  const selectedTemplate = templates.find(t => t.name === formData.template_type);

  return (
    <div className="bg-white shadow-md rounded-lg p-6">
      <h2 className="text-2xl font-bold mb-6 text-gray-900">Create New Project</h2>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Step 1: Template Selection */}
        <TemplateSelector
          templates={templates}
          selectedTemplate={formData.template_type}
          onSelect={(templateName) => setFormData({ ...formData, template_type: templateName })}
        />

        {/* Step 2: Configure Project (shown after template selection) */}
        {selectedTemplate && (
          <div className="space-y-4 p-4 bg-gray-50 rounded-lg">
            <h3 className="font-medium text-gray-900 text-lg">Configure Project</h3>

            {/* Project Name */}
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
                Project Name *
              </label>
              <input
                type="text"
                id="name"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="my-service"
                pattern="[a-z0-9-_]+"
                title="Only lowercase letters, numbers, hyphens, and underscores"
              />
              <p className="text-xs text-gray-500 mt-1">
                Lowercase letters, numbers, hyphens, and underscores only
              </p>
            </div>

            {/* Description */}
            <div>
              <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
                Description
              </label>
              <textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                rows={3}
                placeholder="A brief description of your project"
              />
            </div>

            {/* OpenAPI file upload for openapi-microservice template */}
            {selectedTemplate.requires_openapi_upload && (
              <OpenAPIUpload
                onFileSelected={setOpenapiFile}
                selectedFile={openapiFile}
                error={null}
              />
            )}

            {/* Template Variables (Port, Author, Github Org, etc.) */}
            {selectedTemplate.variables.map((variable) => (
              <div key={variable.name}>
                <label htmlFor={variable.name} className="block text-sm font-medium text-gray-700 mb-1">
                  {variable.description}
                </label>
                <input
                  type="text"
                  id={variable.name}
                  value={formData.variables?.[variable.name] || variable.default}
                  onChange={(e) => setFormData({
                    ...formData,
                    variables: { ...formData.variables, [variable.name]: e.target.value }
                  })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder={variable.default}
                />
              </div>
            ))}
          </div>
        )}

        <button
          type="submit"
          disabled={
            loading ||
            !formData.name ||
            !formData.template_type ||
            (selectedTemplate?.requires_openapi_upload && !openapiFile)
          }
          className={`w-full py-3 px-4 rounded-md font-medium text-white transition-colors ${
            loading ||
            !formData.name ||
            !formData.template_type ||
            (selectedTemplate?.requires_openapi_upload && !openapiFile)
              ? 'bg-gray-400 cursor-not-allowed'
              : 'bg-blue-600 hover:bg-blue-700'
          }`}
        >
          {loading ? 'Creating Project...' : 'Create Project'}
        </button>
      </form>
    </div>
  );
}
