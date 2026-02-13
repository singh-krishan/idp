import { Template } from '../types/project';

interface TemplateSelectorProps {
  templates: Template[];
  selectedTemplate: string | null;
  onSelect: (templateName: string) => void;
}

export default function TemplateSelector({ templates, selectedTemplate, onSelect }: TemplateSelectorProps) {
  return (
    <div className="space-y-4">
      <label className="block text-sm font-medium text-gray-700">
        Select Template *
      </label>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {templates.map((template) => (
          <button
            key={template.name}
            type="button"
            onClick={() => onSelect(template.name)}
            className={`p-4 border-2 rounded-lg text-left transition-all hover:shadow-md ${
              selectedTemplate === template.name
                ? 'border-blue-500 bg-blue-50'
                : 'border-gray-200 hover:border-gray-300'
            }`}
          >
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <h3 className="font-semibold text-lg text-gray-900">
                  {template.display_name}
                </h3>
                <p className="text-sm text-gray-600 mt-1">
                  {template.description}
                </p>
                {template.requires_openapi_upload && (
                  <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-purple-100 text-purple-800 mt-2">
                    📄 Requires OpenAPI Spec
                  </span>
                )}
              </div>
              {selectedTemplate === template.name && (
                <svg className="w-6 h-6 text-blue-500" fill="currentColor" viewBox="0 0 20 20">
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
