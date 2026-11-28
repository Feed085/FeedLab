import React, { useState, useRef } from 'react';
import { UploadCloud } from 'lucide-react';
import { PublicFile } from '../../marketplace/types';
import { authorApi } from '../api/authorApi';
import { az } from '@/i18n/az';

interface ProjectFileUploadProps {
  projectId?: string;
  files: PublicFile[];
  onFilesChanged: (files: PublicFile[]) => void;
}

export const ProjectFileUpload: React.FC<ProjectFileUploadProps> = ({
  projectId,
  files,
  onFilesChanged,
}) => {
  const [isUploading, setIsUploading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    if (!projectId) {
      setErrorMessage(az.projectEditor.files.saveDraftFirst);
      return;
    }

    setErrorMessage(null);
    setIsUploading(true);

    try {
      const uploaded = await authorApi.uploadProjectFile(projectId, selectedFile);
      const newFileItem: PublicFile = {
        fileId: uploaded.fileId || uploaded._id,
        originalName: uploaded.originalName,
        fileSize: uploaded.fileSize,
        fileType: uploaded.fileType,
        isPreview: true,
      };
      onFilesChanged([...files, newFileItem]);
    } catch (err: any) {
      const msg = err.response?.data?.message || 'Fayl yüklənməsi zamanı xəta baş verdi';
      setErrorMessage(typeof msg === 'string' ? msg : JSON.stringify(msg));
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleDeleteFile = async (fileId: string) => {
    if (!projectId) return;

    try {
      await authorApi.deleteProjectFile(projectId, fileId);
      onFilesChanged(files.filter((f) => f.fileId !== fileId));
    } catch (err: any) {
      const msg = err.response?.data?.message || 'Faylı silmək mümkün olmadı';
      setErrorMessage(typeof msg === 'string' ? msg : JSON.stringify(msg));
    }
  };

  if (!projectId) {
    return (
      <div className="p-6 bg-amber-50 border border-amber-200 rounded-lg text-amber-800 text-sm">
        <p className="font-semibold mb-1">Məlumat</p>
        <p>{az.projectEditor.files.saveDraftFirst}</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Upload Dropzone */}
      <div
        onClick={() => fileInputRef.current?.click()}
        className="p-8 border-2 border-dashed border-slate-300 hover:border-brand-500 rounded-xl bg-slate-50/50 hover:bg-slate-50 transition-colors cursor-pointer text-center"
      >
        <input
          ref={fileInputRef}
          type="file"
          onChange={handleFileSelect}
          className="hidden"
          disabled={isUploading}
        />
        <UploadCloud className="w-8 h-8 text-brand-600 mx-auto mb-2" />
        <p className="text-sm font-semibold text-slate-800 mb-1">
          {isUploading ? az.projectEditor.files.uploading : az.projectEditor.files.dropzoneText}
        </p>
        <p className="text-xs text-slate-500">{az.projectEditor.files.dropzoneHint}</p>
      </div>

      {errorMessage && (
        <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-md">
          {errorMessage}
        </div>
      )}

      {/* Uploaded Files Table */}
      {files.length > 0 && (
        <div className="border border-slate-200 rounded-lg overflow-hidden">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-xs font-semibold text-slate-500 border-b border-slate-200">
              <tr>
                <th className="px-4 py-2.5">{az.projectEditor.files.colName}</th>
                <th className="px-4 py-2.5">{az.projectEditor.files.colSize}</th>
                <th className="px-4 py-2.5">{az.projectEditor.files.colType}</th>
                <th className="px-4 py-2.5 text-right">{az.projectEditor.files.colActions}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {files.map((file) => (
                <tr key={file.fileId} className="hover:bg-slate-50/50">
                  <td className="px-4 py-3 font-medium text-slate-900">{file.originalName}</td>
                  <td className="px-4 py-3 text-slate-600">{formatFileSize(file.fileSize)}</td>
                  <td className="px-4 py-3 text-slate-500 text-xs">{file.fileType}</td>
                  <td className="px-4 py-3 text-right">
                    <button
                      type="button"
                      onClick={() => handleDeleteFile(file.fileId)}
                      className="text-xs text-rose-600 hover:text-rose-800 font-medium"
                    >
                      {az.common.delete}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
