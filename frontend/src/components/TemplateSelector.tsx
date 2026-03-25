import { Template } from '../types/project';

interface TemplateSelectorProps {
  templates: Template[];
  selectedTemplate: string | null;
  onSelect: (templateName: string) => void;
}

export default function TemplateSelector({ templates, selectedTemplate, onSelect }: TemplateSelectorProps) {
  return (
    <div className="space-y-4">
      <label className="block text-sm font-medium text-govuk-text">
        Select Template *
      </label>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {templates.map((template) => (
          <button
            key={template.name}
            type="button"
            onClick={() => onSelect(template.name)}
            className={`p-4 border-2 rounded-none text-left transition-all hover:shadow-sm ${
              selectedTemplate === template.name
                ? 'border-govuk-blue bg-[#d2e4f5]'
                : 'border-govuk-border hover:border-govuk-blue'
            }`}
            aria-pressed={selectedTemplate === template.name}
          >
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <h3 className="font-semibold text-lg text-govuk-text">
                  {template.display_name}
                </h3>
                <p className="text-sm text-govuk-secondary-text mt-1">
                  {template.description}
                </p>
                {template.requires_openapi_upload && (
                  <span className="inline-flex items-center px-2 py-0.5 rounded-none text-xs font-medium bg-status-deploying text-white mt-2">
                    Requires OpenAPI Spec
                  </span>
                )}
                {template.requires_camel_yaml_upload && (
                  <span className="inline-flex items-center px-2 py-0.5 rounded-none text-xs font-medium bg-orange-500 text-white mt-2">
                    Requires Camel YAML Routes
                  </span>
                )}
              </div>
              {selectedTemplate === template.name && (
                <svg className="w-6 h-6 text-govuk-blue" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
              )}
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
