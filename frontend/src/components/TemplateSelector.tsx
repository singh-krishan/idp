import { Template } from '../types/project';

interface TemplateSelectorProps {
  templates: Template[];
  selectedTemplate: string | null;
  onSelect: (templateName: string) => void;
}

const templateIcons: Record<string, { icon: string; color: string }> = {
  'python-microservice': { icon: 'Py', color: 'from-yellow-500 to-amber-600' },
  'nodejs-api': { icon: 'Js', color: 'from-green-500 to-emerald-600' },
  'openapi-microservice': { icon: 'OA', color: 'from-purple-500 to-violet-600' },
  'camel-yaml-api': { icon: 'Ca', color: 'from-orange-500 to-red-500' },
};

export default function TemplateSelector({ templates, selectedTemplate, onSelect }: TemplateSelectorProps) {
  return (
    <div className="space-y-3">
      <label className="input-label">Select Template</label>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {templates.map((template) => {
          const isSelected = selectedTemplate === template.name;
          const iconConfig = templateIcons[template.name] || { icon: '?', color: 'from-gray-500 to-gray-600' };

          return (
            <button
              key={template.name}
              type="button"
              onClick={() => onSelect(template.name)}
              className={`relative p-4 rounded-xl text-left transition-all duration-200 border ${
                isSelected
                  ? 'bg-accent-500/10 border-accent-500/40 shadow-glow'
                  : 'bg-white/[0.03] border-white/[0.06] hover:bg-white/[0.06] hover:border-white/[0.12]'
              }`}
              aria-pressed={isSelected}
            >
              <div className="flex items-start gap-3">
                {/* Template icon */}
                <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${iconConfig.color} flex items-center justify-center flex-shrink-0 shadow-sm`}>
                  <span className="text-white text-xs font-bold font-mono">{iconConfig.icon}</span>
                </div>

                <div className="flex-1 min-w-0">
                  <h3 className="font-display font-semibold text-sm text-white truncate">
                    {template.display_name}
                  </h3>
                  <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">
                    {template.description}
                  </p>
                  {template.requires_openapi_upload && (
                    <span className="inline-flex items-center mt-2 px-2 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wider bg-purple-500/15 text-purple-400 border border-purple-500/20">
                      OpenAPI Spec
                    </span>
                  )}
                  {template.requires_camel_yaml_upload && (
                    <span className="inline-flex items-center mt-2 px-2 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wider bg-orange-500/15 text-orange-400 border border-orange-500/20">
                      YAML Routes
                    </span>
                  )}
                </div>

                {/* Selected check */}
                {isSelected && (
                  <div className="w-5 h-5 rounded-full bg-accent-500 flex items-center justify-center flex-shrink-0">
                    <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" strokeWidth="3" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                )}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
