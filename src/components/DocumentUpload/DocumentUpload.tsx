import { useState } from 'react';
import { FileInput, Group, Button, Text, Stack, Paper, ActionIcon } from '@mantine/core';
import toast from 'react-hot-toast';
import type { DocumentMeta } from '../../types/obligation';
import { saveDocument, getDocument, deleteDocument } from '../../utils/documents';

interface DocumentUploadProps {
  documents: DocumentMeta[];
  onChange: (docs: DocumentMeta[]) => void;
  readOnly?: boolean;
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function DocumentUpload({ documents, onChange, readOnly }: DocumentUploadProps) {
  const [uploading, setUploading] = useState(false);

  async function handleUpload(file: File | null) {
    if (!file) return;
    setUploading(true);
    try {
      const meta = await saveDocument(file);
      onChange([...documents, meta]);
      toast.success(`"${file.name}" uploaded`);
    } catch {
      toast.error('Failed to upload document');
    } finally {
      setUploading(false);
    }
  }

  async function handleView(doc: DocumentMeta) {
    const blob = await getDocument(doc.id);
    if (!blob) {
      toast.error('Document not found');
      return;
    }
    const url = URL.createObjectURL(blob);
    window.open(url, '_blank');
  }

  async function handleDownload(doc: DocumentMeta) {
    const blob = await getDocument(doc.id);
    if (!blob) {
      toast.error('Document not found');
      return;
    }
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = doc.name;
    a.click();
    URL.revokeObjectURL(url);
  }

  async function handleDelete(doc: DocumentMeta) {
    await deleteDocument(doc.id);
    onChange(documents.filter((d) => d.id !== doc.id));
    toast.success(`"${doc.name}" removed`);
  }

  return (
    <Stack gap="xs">
      {!readOnly && (
        <FileInput
          label="Attach Document"
          placeholder="Choose file (PDF, JPG, PNG)"
          accept=".pdf,.jpg,.jpeg,.png"
          onChange={handleUpload}
          disabled={uploading}
          clearable
        />
      )}

      {documents.length > 0 && (
        <Stack gap={4}>
          <Text size="xs" c="dimmed" tt="uppercase" fw={600}>
            Attached Documents ({documents.length})
          </Text>
          {documents.map((doc) => (
            <Paper key={doc.id} p="xs" withBorder radius="sm">
              <Group justify="space-between" wrap="nowrap">
                <div style={{ minWidth: 0 }}>
                  <Text size="sm" truncate fw={500}>{doc.name}</Text>
                  <Text size="xs" c="dimmed">{formatSize(doc.size)}</Text>
                </div>
                <Group gap={4} wrap="nowrap">
                  <ActionIcon variant="subtle" size="sm" onClick={() => handleView(doc)} title="View">
                    <Text size="xs">👁</Text>
                  </ActionIcon>
                  <ActionIcon variant="subtle" size="sm" onClick={() => handleDownload(doc)} title="Download">
                    <Text size="xs">⬇</Text>
                  </ActionIcon>
                  {!readOnly && (
                    <ActionIcon variant="subtle" color="red" size="sm" onClick={() => handleDelete(doc)} title="Delete">
                      <Text size="xs">✕</Text>
                    </ActionIcon>
                  )}
                </Group>
              </Group>
            </Paper>
          ))}
        </Stack>
      )}
    </Stack>
  );
}
