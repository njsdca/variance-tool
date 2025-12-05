import { useCallback, useRef } from 'react';

interface FileUploadProps {
  onFileSelect: (file: File) => void;
  isLoading?: boolean;
}

export function FileUpload({ onFileSelect, isLoading }: FileUploadProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && isValidFile(file)) {
      onFileSelect(file);
    }
    e.target.value = '';
  };

  const isValidFile = useCallback((file: File): boolean => {
    const validExtensions = ['.csv', '.xlsx', '.xls'];
    return validExtensions.some((ext) =>
      file.name.toLowerCase().endsWith(ext)
    );
  }, []);

  return (
    <>
      <input
        ref={fileInputRef}
        type="file"
        accept=".csv,.xlsx,.xls"
        onChange={handleFileChange}
        style={{ display: 'none' }}
      />
      <button
        className="btn btn-primary"
        onClick={handleClick}
        disabled={isLoading}
      >
        {isLoading ? 'Processing...' : 'Upload File'}
      </button>
    </>
  );
}
