import { useRef, useState } from 'react';

interface CamelYAMLUploadProps {
  onFileSelected: (file: File | null) => void;
  selectedFile: File | null;
  error?: string | null;
}

export default function CamelYAMLUpload({ onFileSelected, selectedFile, error }: CamelYAMLUploadProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    validateAndSetFile(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0] || null;
    validateAndSetFile(file);
  };

  const validateAndSetFile = (file: File | null) => {
    if (!file) { onFileSelected(null); return; }
    const validExtensions = ['.yaml', '.yml'];
    if (!validExtensions.some(ext => file.name.toLowerCase().endsWith(ext))) {
      alert('Please upload a .yaml or .yml file');
      return;
    }
    if (file.size > 1_048_576) { alert('File size must be under 1MB'); return; }
    onFileSelected(file);
  };

  const handleRemove = () => {
    onFileSelected(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <div className="space-y-2">
      <label className="input-label">Camel YAML Routes *</label>

      {!selectedFile ? (
        <div
          onDrop={handleDrop}
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onClick={() => fileInputRef.current?.click()}
          className={`border border-dashed rounded-xl p-6 text-center cursor-pointer transition-all duration-200 ${
            dragOver
              ? 'border-accent-500/50 bg-accent-500/5'
              : 'border-white/[0.1] hover:border-white/[0.2] bg-white/[0.02]'
          }`}
        >
          <div className="w-10 h-10 rounded-lg bg-orange-500/10 flex items-center justify-center mx-auto mb-3">
            <svg className="w-5 h-5 text-orange-400" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
            </svg>
          </div>
          <p className="text-sm text-gray-400">
            <span className="text-accent-400 font-medium">Click to upload</span> or drag and drop
          </p>
          <p className="text-[11px] text-gray-600 mt-1">Apache Camel YAML DSL routes (.yaml or .yml, max 1MB)</p>
        </div>
      ) : (
        <div className="flex items-center justify-between p-3 rounded-lg bg-white/[0.04] border border-white/[0.08]">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-8 h-8 rounded-md bg-orange-500/15 flex items-center justify-center flex-shrink-0">
              <svg className="w-4 h-4 text-orange-400" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
              </svg>
            </div>
            <div className="min-w-0">
              <p className="text-sm text-white font-medium truncate">{selectedFile.name}</p>
              <p className="text-[11px] text-gray-500">{(selectedFile.size / 1024).toFixed(1)} KB</p>
            </div>
          </div>
          <button type="button" onClick={handleRemove} className="text-xs text-rose-400 hover:text-rose-300 font-medium ml-3 flex-shrink-0">
            Remove
          </button>
        </div>
      )}

      <input ref={fileInputRef} type="file" accept=".yaml,.yml" onChange={handleFileChange} className="hidden" />

      {error && (
        <div className="px-3 py-2 rounded-lg bg-rose-500/10 border border-rose-500/20">
          <p className="text-xs text-rose-400">{error}</p>
        </div>
      )}
    </div>
  );
}
