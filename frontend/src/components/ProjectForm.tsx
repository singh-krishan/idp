import { useState, useEffect } from 'react';
import { CreateProjectRequest, Template } from '../types/project';
import { templatesApi, projectsApi } from '../services/api';
import TemplateSelector from './TemplateSelector';
import OpenAPIUpload from './OpenAPIUpload';
import CamelYAMLUpload from './CamelYAMLUpload';

interface ProjectFormProps {
  onSuccess: () => void;
}

export default function ProjectForm({ onSuccess }: ProjectFormProps) {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [openapiFile, setOpenapiFile] = useState<File | null>(null);
  const [camelYamlFile, setCamelYamlFile] = useState<File | null>(null);

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
      const isCamelYAMLTemplate = selectedTemplate?.requires_camel_yaml_upload;

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
      } else if (isCamelYAMLTemplate) {
        // Validate file is uploaded
        if (!camelYamlFile) {
          setError('Please upload a Camel YAML routes file');
          setLoading(false);
          return;
        }

        // Use Camel YAML endpoint
        await projectsApi.createProjectFromCamelYAML({
          name: formData.name,
          description: formData.description,
          port: formData.variables?.port || '8080',
          camel_yaml_file: camelYamlFile,
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
      setCamelYamlFile(null);
      onSuccess();
    } catch (err: any) {
      setError(err.response?.data?.detail || err.message || 'Failed to create project');
    } finally {
      setLoading(false);
    }
  };

  const selectedTemplate = templates.find(t => t.name === formData.template_type);

  return (
    <div className="card-govuk">
      <h2 className="text-2xl font-bold mb-6 text-govuk-text">Create New Project</h2>

      {error && (
        <div role="alert" className="bg-[#fce8e8] border-l-4 border-govuk-error text-govuk-error px-4 py-3 rounded-none mb-4">
          <p className="font-bold">There is a problem</p>
          <p>{error}</p>
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
          <div className="space-y-4 p-4 bg-govuk-background rounded-none">
            <h3 className="font-medium text-govuk-text text-lg">Configure Project</h3>

            {/* Project Name */}
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-govuk-text mb-1">
                Project Name *
              </label>
              <input
                type="text"
                id="name"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="input-govuk w-full"
                placeholder="my-service"
                pattern="[a-z0-9-_]+"
                title="Only lowercase letters, numbers, hyphens, and underscores"
                aria-describedby="name-hint"
              />
              <p id="name-hint" className="text-xs text-govuk-secondary-text mt-1">
                Lowercase letters, numbers, hyphens, and underscores only
              </p>
            </div>

            {/* Description */}
            <div>
              <label htmlFor="description" className="block text-sm font-medium text-govuk-text mb-1">
                Description
              </label>
              <textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="input-govuk w-full"
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

            {/* Camel YAML file upload for camel-yaml-api template */}
            {selectedTemplate.requires_camel_yaml_upload && (
              <CamelYAMLUpload
                onFileSelected={setCamelYamlFile}
                selectedFile={camelYamlFile}
                error={null}
              />
            )}

            {/* Template Variables (Port, Author, Github Org, etc.) */}
            {selectedTemplate.variables.map((variable) => (
              <div key={variable.name}>
                <label htmlFor={variable.name} className="block text-sm font-medium text-govuk-text mb-1">
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
                  className="input-govuk w-full"
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
            (selectedTemplate?.requires_openapi_upload && !openapiFile) ||
            (selectedTemplate?.requires_camel_yaml_upload && !camelYamlFile)
          }
          className={`w-full py-3 px-4 rounded-none font-bold text-white transition-colors ${
            loading ||
            !formData.name ||
            !formData.template_type ||
            (selectedTemplate?.requires_openapi_upload && !openapiFile) ||
            (selectedTemplate?.requires_camel_yaml_upload && !camelYamlFile)
              ? 'bg-govuk-border cursor-not-allowed'
              : 'btn-govuk'
          }`}
        >
          {loading ? 'Creating Project...' : 'Create Project'}
        </button>
      </form>
    </div>
  );
}
