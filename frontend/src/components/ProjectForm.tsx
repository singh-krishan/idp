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
      const isOpenAPITemplate = selectedTemplate?.requires_openapi_upload;
      const isCamelYAMLTemplate = selectedTemplate?.requires_camel_yaml_upload;

      if (isOpenAPITemplate) {
        if (!openapiFile) {
          setError('Please upload an OpenAPI specification file');
          setLoading(false);
          return;
        }
        await projectsApi.createProjectFromOpenAPI({
          name: formData.name,
          description: formData.description,
          port: formData.variables?.port || '8000',
          openapi_file: openapiFile,
        });
      } else if (isCamelYAMLTemplate) {
        if (!camelYamlFile) {
          setError('Please upload a Camel YAML routes file');
          setLoading(false);
          return;
        }
        await projectsApi.createProjectFromCamelYAML({
          name: formData.name,
          description: formData.description,
          port: formData.variables?.port || '8080',
          camel_yaml_file: camelYamlFile,
        });
      } else {
        await projectsApi.createProject(formData);
      }

      setFormData({ name: '', description: '', template_type: '', variables: {} });
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

  const isDisabled = loading || !formData.name || !formData.template_type ||
    (selectedTemplate?.requires_openapi_upload && !openapiFile) ||
    (selectedTemplate?.requires_camel_yaml_upload && !camelYamlFile);

  return (
    <div className="glass-card p-6">
      <h2 className="font-display text-xl font-bold text-white mb-6">Create New Project</h2>

      {error && (
        <div className="mb-5 px-4 py-3 rounded-lg bg-rose-500/10 border border-rose-500/20 animate-slide-down">
          <p className="text-rose-400 text-sm">{error}</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        <TemplateSelector
          templates={templates}
          selectedTemplate={formData.template_type}
          onSelect={(templateName) => setFormData({ ...formData, template_type: templateName })}
        />

        {selectedTemplate && (
          <div className="space-y-4 p-5 bg-white/[0.02] rounded-xl border border-white/[0.06] animate-slide-down">
            <h3 className="font-display font-semibold text-white text-sm">Configure Project</h3>

            <div>
              <label htmlFor="name" className="input-label">Project Name *</label>
              <input
                type="text"
                id="name"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="input-field"
                placeholder="my-service"
                pattern="[a-z0-9-_]+"
                title="Only lowercase letters, numbers, hyphens, and underscores"
              />
              <p className="text-[11px] text-gray-600 mt-1.5">
                Lowercase letters, numbers, hyphens, and underscores only
              </p>
            </div>

            <div>
              <label htmlFor="description" className="input-label">Description</label>
              <textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="input-field resize-none"
                rows={2}
                placeholder="A brief description of your project"
              />
            </div>

            {selectedTemplate.requires_openapi_upload && (
              <OpenAPIUpload
                onFileSelected={setOpenapiFile}
                selectedFile={openapiFile}
                error={null}
              />
            )}

            {selectedTemplate.requires_camel_yaml_upload && (
              <CamelYAMLUpload
                onFileSelected={setCamelYamlFile}
                selectedFile={camelYamlFile}
                error={null}
              />
            )}

            {selectedTemplate.variables.map((variable) => (
              <div key={variable.name}>
                <label htmlFor={variable.name} className="input-label">
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
                  className="input-field"
                  placeholder={variable.default}
                />
              </div>
            ))}
          </div>
        )}

        <button
          type="submit"
          disabled={isDisabled}
          className={isDisabled ? 'btn-primary w-full opacity-40 cursor-not-allowed' : 'btn-success w-full'}
        >
          {loading ? (
            <span className="flex items-center justify-center gap-2">
              <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              Creating...
            </span>
          ) : 'Create Project'}
        </button>
      </form>
    </div>
  );
}
