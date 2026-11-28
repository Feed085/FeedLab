import { apiClient } from '../../lib/api';

export const downloadsApi = {
  downloadFile: async (projectId: string, fileId: string, defaultName?: string): Promise<void> => {
    const response = await apiClient.get(`/downloads/projects/${projectId}/files/${fileId}`, {
      responseType: 'blob',
    });

    // Extract filename from disposition header if available
    let filename = defaultName || `project_asset_${fileId}.zip`;
    const disposition = response.headers['content-disposition'] as string | undefined;
    if (disposition && typeof disposition === 'string') {
      const match = disposition.match(/filename="?([^";]+)"?/);
      if (match && match[1]) {
        filename = decodeURIComponent(match[1]);
      }
    }

    // Trigger browser download via object URL
    const contentType = (response.headers['content-type'] as string) || 'application/octet-stream';
    const blob = new Blob([response.data], {
      type: contentType,
    });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  },
};
