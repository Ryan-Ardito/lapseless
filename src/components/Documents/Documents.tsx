import { useState, useMemo } from 'react';
import {
  Stack, Title, Group, Text, Paper, Badge, TextInput,
  Select, Modal, Button, FileInput, ActionIcon,
} from '@mantine/core';
import {
  IconEye, IconDownload, IconTrash, IconSearch, IconUpload, IconFile,
  IconLink, IconFileOff,
} from '@tabler/icons-react';
import toast from 'react-hot-toast';
import { useIsMobile } from '../../hooks/useIsMobile';
import type { Obligation, DocumentMeta } from '../../types/obligation';
import { getObligationStatus, formatDate } from '../../utils/dates';
import { getDocument, deleteDocument, saveDocument } from '../../utils/documents';
import { StatusBadge } from '../StatusBadge/StatusBadge';

interface DocumentsProps {
  obligations: Obligation[];
  onUpdateObligation: (id: string, updates: Partial<Omit<Obligation, 'id' | 'createdAt'>>) => void;
  standaloneDocs: DocumentMeta[];
  onAddStandaloneDoc: (doc: DocumentMeta) => void;
  onUpdateStandaloneDoc: (id: string, updates: Partial<Pick<DocumentMeta, 'displayName'>>) => void;
  onRemoveStandaloneDoc: (id: string) => void;
}

interface FlatDoc {
  doc: DocumentMeta;
  obligation: Obligation | null;
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function getFileIcon(type: string): string {
  if (type.startsWith('image/')) return 'image';
  if (type === 'application/pdf') return 'pdf';
  return 'file';
}

export function Documents({
  obligations, onUpdateObligation,
  standaloneDocs, onAddStandaloneDoc, onUpdateStandaloneDoc, onRemoveStandaloneDoc,
}: DocumentsProps) {
  const isMobile = useIsMobile();
  const [search, setSearch] = useState('');
  const [filterObligation, setFilterObligation] = useState<string | null>(null);

  // Upload modal state
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadObligationId, setUploadObligationId] = useState<string | null>(null);
  const [uploadDisplayName, setUploadDisplayName] = useState('');
  const [uploading, setUploading] = useState(false);

  // Edit modal state
  const [editDoc, setEditDoc] = useState<FlatDoc | null>(null);
  const [editDisplayName, setEditDisplayName] = useState('');
  const [editObligationId, setEditObligationId] = useState<string | null>(null);

  // Flatten all documents: linked + standalone
  const allDocs = useMemo(() => {
    const docs: FlatDoc[] = [];
    for (const ob of obligations) {
      for (const doc of ob.documents ?? []) {
        docs.push({ doc, obligation: ob });
      }
    }
    for (const doc of standaloneDocs) {
      docs.push({ doc, obligation: null });
    }
    docs.sort((a, b) => new Date(b.doc.addedAt).getTime() - new Date(a.doc.addedAt).getTime());
    return docs;
  }, [obligations, standaloneDocs]);

  // Filtered docs
  const filtered = useMemo(() => {
    let result = allDocs;
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(
        ({ doc, obligation }) =>
          doc.name.toLowerCase().includes(q) ||
          (doc.displayName?.toLowerCase().includes(q) ?? false) ||
          (obligation?.name.toLowerCase().includes(q) ?? false),
      );
    }
    if (filterObligation === '__unlinked__') {
      result = result.filter(({ obligation }) => obligation === null);
    } else if (filterObligation) {
      result = result.filter(({ obligation }) => obligation?.id === filterObligation);
    }
    return result;
  }, [allDocs, search, filterObligation]);

  // Obligations that have documents (for filter dropdown)
  const filterOptions = useMemo(() => {
    const opts: { value: string; label: string }[] = [];
    const ids = new Set(
      allDocs.filter(({ obligation }) => obligation !== null).map(({ obligation }) => obligation!.id),
    );
    for (const ob of obligations) {
      if (ids.has(ob.id)) {
        opts.push({ value: ob.id, label: ob.name });
      }
    }
    if (allDocs.some(({ obligation }) => obligation === null)) {
      opts.push({ value: '__unlinked__', label: 'Unlinked documents' });
    }
    return opts;
  }, [allDocs, obligations]);

  // All obligations for linking
  const allObligationOptions = useMemo(
    () => obligations.map((ob) => ({ value: ob.id, label: ob.name })),
    [obligations],
  );

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

  async function handleDelete(flatDoc: FlatDoc) {
    await deleteDocument(flatDoc.doc.id);
    if (flatDoc.obligation) {
      const updatedDocs = (flatDoc.obligation.documents ?? []).filter(
        (d) => d.id !== flatDoc.doc.id,
      );
      onUpdateObligation(flatDoc.obligation.id, { documents: updatedDocs });
    } else {
      onRemoveStandaloneDoc(flatDoc.doc.id);
    }
    toast.success(`"${flatDoc.doc.displayName || flatDoc.doc.name}" removed`);
    setEditDoc(null);
  }

  async function handleUpload() {
    if (!uploadFile) return;
    setUploading(true);
    try {
      const meta = await saveDocument(uploadFile);
      const displayName = uploadDisplayName.trim() || undefined;
      const docWithName = displayName ? { ...meta, displayName } : meta;
      if (uploadObligationId) {
        const ob = obligations.find((o) => o.id === uploadObligationId);
        if (!ob) return;
        const updatedDocs = [...(ob.documents ?? []), docWithName];
        onUpdateObligation(ob.id, { documents: updatedDocs });
        toast.success(`"${displayName || uploadFile.name}" uploaded and linked to "${ob.name}"`);
      } else {
        onAddStandaloneDoc(docWithName);
        toast.success(`"${displayName || uploadFile.name}" uploaded`);
      }
      setUploadFile(null);
      setUploadObligationId(null);
      setUploadDisplayName('');
      setUploadModalOpen(false);
    } catch {
      toast.error('Failed to upload document');
    } finally {
      setUploading(false);
    }
  }

  function openEditModal(flatDoc: FlatDoc) {
    setEditDoc(flatDoc);
    setEditDisplayName(flatDoc.doc.displayName ?? '');
    setEditObligationId(flatDoc.obligation?.id ?? null);
  }

  function saveEdit() {
    if (!editDoc) return;
    const newDisplayName = editDisplayName.trim() || undefined;
    const oldOb = editDoc.obligation;
    const newObId = editObligationId;

    // Update displayName on the doc metadata
    const updatedDoc: DocumentMeta = { ...editDoc.doc, displayName: newDisplayName };

    // Obligation changed?
    const obligationChanged = (oldOb?.id ?? null) !== newObId;

    if (obligationChanged) {
      // Remove from old location
      if (oldOb) {
        const filtered = (oldOb.documents ?? []).filter((d) => d.id !== editDoc.doc.id);
        onUpdateObligation(oldOb.id, { documents: filtered });
      } else {
        onRemoveStandaloneDoc(editDoc.doc.id);
      }

      // Add to new location
      if (newObId) {
        const newOb = obligations.find((o) => o.id === newObId);
        if (newOb) {
          onUpdateObligation(newObId, { documents: [...(newOb.documents ?? []), updatedDoc] });
        }
      } else {
        onAddStandaloneDoc(updatedDoc);
      }
    } else {
      // Same location, just update the doc metadata
      if (oldOb) {
        const updatedDocs = (oldOb.documents ?? []).map((d) =>
          d.id === editDoc.doc.id ? updatedDoc : d,
        );
        onUpdateObligation(oldOb.id, { documents: updatedDocs });
      } else {
        onUpdateStandaloneDoc(editDoc.doc.id, { displayName: newDisplayName });
      }
    }

    toast.success('Document updated');
    setEditDoc(null);
  }

  // Stats
  const totalSize = allDocs.reduce((sum, { doc }) => sum + doc.size, 0);
  const fileTypes = new Set(allDocs.map(({ doc }) => getFileIcon(doc.type)));

  return (
    <Stack gap="lg">
      <Group justify="space-between">
        <Title order={2}>Documents</Title>
        <Button
          leftSection={<IconUpload size={16} />}
          size="sm"
          variant="light"
          onClick={() => setUploadModalOpen(true)}
        >
          Upload
        </Button>
      </Group>

      {/* Stats */}
      <Group gap="md">
        <Paper p="md" radius="md" withBorder style={{ flex: 1 }}>
          <Text ta="center" size="1.75rem" fw={800} lh={1} c="sage.6">
            {allDocs.length}
          </Text>
          <Text ta="center" size="xs" c="dimmed" tt="uppercase" fw={600} mt={4}>
            Documents
          </Text>
        </Paper>
        <Paper p="md" radius="md" withBorder style={{ flex: 1 }}>
          <Text ta="center" size="1.75rem" fw={800} lh={1} c="sage.6">
            {formatSize(totalSize)}
          </Text>
          <Text ta="center" size="xs" c="dimmed" tt="uppercase" fw={600} mt={4}>
            Total Size
          </Text>
        </Paper>
        <Paper p="md" radius="md" withBorder style={{ flex: 1 }}>
          <Text ta="center" size="1.75rem" fw={800} lh={1} c="sage.6">
            {fileTypes.size}
          </Text>
          <Text ta="center" size="xs" c="dimmed" tt="uppercase" fw={600} mt={4}>
            File Types
          </Text>
        </Paper>
      </Group>

      {allDocs.length === 0 ? (
        <Paper p={60} ta="center" withBorder radius="lg">
          <Stack align="center" gap="md">
            <IconFileOff size={48} stroke={1.5} color="var(--mantine-color-dimmed)" />
            <Title order={3} c="dark">No documents yet</Title>
            <Text c="dimmed" size="md">
              Upload documents and optionally link them to obligations.
            </Text>
            <Button
              size="md"
              leftSection={<IconUpload size={18} />}
              onClick={() => setUploadModalOpen(true)}
            >
              Upload Document
            </Button>
          </Stack>
        </Paper>
      ) : (
        <>
          {/* Filters */}
          <Group gap="md" grow={!isMobile}>
            <TextInput
              placeholder="Search documents or obligations..."
              leftSection={<IconSearch size={16} />}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <Select
              placeholder="Filter by obligation"
              data={filterOptions}
              value={filterObligation}
              onChange={setFilterObligation}
              clearable
              leftSection={<IconLink size={16} />}
            />
          </Group>

          {filtered.length === 0 ? (
            <Paper p="xl" ta="center" withBorder radius="md">
              <Text c="dimmed">No documents match your search.</Text>
            </Paper>
          ) : (
            <Stack gap="xs">
              <Text size="xs" c="dimmed" fw={600}>
                {filtered.length} document{filtered.length !== 1 ? 's' : ''}
              </Text>
              {filtered.map(({ doc, obligation }) => (
                <Paper
                  key={doc.id}
                  p="sm"
                  withBorder
                  radius="md"
                  style={{ cursor: 'pointer' }}
                  onClick={() => openEditModal({ doc, obligation })}
                >
                  <Group justify="space-between" wrap="nowrap">
                    <Group gap="sm" wrap="nowrap" style={{ minWidth: 0, flex: 1 }}>
                      <IconFile size={20} stroke={1.5} color="var(--mantine-color-sage-6)" style={{ flexShrink: 0 }} />
                      <div style={{ minWidth: 0, flex: 1 }}>
                        {doc.displayName ? (
                          <>
                            <Text size="sm" fw={500} truncate>{doc.displayName}</Text>
                            <Text size="xs" c="dimmed" truncate>{doc.name}</Text>
                          </>
                        ) : (
                          <Text size="sm" fw={500} truncate>{doc.name}</Text>
                        )}
                        <Group gap="xs" mt={2}>
                          <Badge variant="light" size="xs" color="gray">
                            {formatSize(doc.size)}
                          </Badge>
                          <Badge variant="light" size="xs" color="sage">
                            {doc.type.split('/').pop()?.toUpperCase()}
                          </Badge>
                          <Text size="xs" c="dimmed">
                            {formatDate(doc.addedAt)}
                          </Text>
                          {obligation ? (
                            <>
                              <IconLink size={12} stroke={1.5} color="var(--mantine-color-dimmed)" />
                              <Text size="xs" c="dimmed" truncate style={{ maxWidth: 160 }}>
                                {obligation.name}
                              </Text>
                              <StatusBadge status={getObligationStatus(obligation.dueDate, obligation.completed)} />
                            </>
                          ) : (
                            <Badge variant="light" size="xs" color="gray">Unlinked</Badge>
                          )}
                        </Group>
                      </div>
                    </Group>
                    <Group gap={4} wrap="nowrap">
                      <ActionIcon
                        variant="subtle"
                        size="sm"
                        onClick={(e) => { e.stopPropagation(); handleView(doc); }}
                        title="View"
                      >
                        <IconEye size={16} />
                      </ActionIcon>
                      <ActionIcon
                        variant="subtle"
                        size="sm"
                        onClick={(e) => { e.stopPropagation(); handleDownload(doc); }}
                        title="Download"
                      >
                        <IconDownload size={16} />
                      </ActionIcon>
                    </Group>
                  </Group>
                </Paper>
              ))}
            </Stack>
          )}
        </>
      )}

      {/* Upload Modal */}
      <Modal
        opened={uploadModalOpen}
        onClose={() => {
          setUploadModalOpen(false);
          setUploadFile(null);
          setUploadObligationId(null);
          setUploadDisplayName('');
        }}
        title="Upload Document"
        centered
        fullScreen={isMobile}
      >
        <Stack gap="md">
          <FileInput
            label="Document"
            placeholder="Choose file (PDF, JPG, PNG)"
            accept=".pdf,.jpg,.jpeg,.png"
            value={uploadFile}
            onChange={setUploadFile}
            clearable
            required
          />
          <TextInput
            label="Display Name"
            description="Optional — a friendly name for this document"
            placeholder={uploadFile?.name ?? 'e.g. Insurance Certificate 2026'}
            value={uploadDisplayName}
            onChange={(e) => setUploadDisplayName(e.target.value)}
          />
          <Select
            label="Link to Obligation"
            description="Optional — you can link it later"
            placeholder="None"
            data={allObligationOptions}
            value={uploadObligationId}
            onChange={setUploadObligationId}
            searchable
            clearable
          />
          <Group justify="flex-end" gap="xs" mt="xs">
            <Button
              variant="default"
              onClick={() => {
                setUploadModalOpen(false);
                setUploadFile(null);
                setUploadObligationId(null);
                setUploadDisplayName('');
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleUpload}
              loading={uploading}
              disabled={!uploadFile}
            >
              Upload
            </Button>
          </Group>
        </Stack>
      </Modal>

      {/* Edit Modal */}
      <Modal
        opened={editDoc !== null}
        onClose={() => setEditDoc(null)}
        title="Edit Document"
        centered
        fullScreen={isMobile}
      >
        {editDoc && (
          <Stack gap="md">
            <Paper p="sm" withBorder radius="sm" bg="gray.0">
              <Group gap="xs">
                <IconFile size={16} stroke={1.5} color="var(--mantine-color-sage-6)" />
                <Text size="sm" fw={500} truncate>{editDoc.doc.name}</Text>
              </Group>
              <Group gap="xs" mt={4}>
                <Badge variant="light" size="xs" color="gray">
                  {formatSize(editDoc.doc.size)}
                </Badge>
                <Badge variant="light" size="xs" color="sage">
                  {editDoc.doc.type.split('/').pop()?.toUpperCase()}
                </Badge>
                <Text size="xs" c="dimmed">
                  Uploaded {formatDate(editDoc.doc.addedAt)}
                </Text>
              </Group>
            </Paper>

            <TextInput
              label="Display Name"
              description="Optional — a friendly name shown instead of the filename"
              placeholder={editDoc.doc.name}
              value={editDisplayName}
              onChange={(e) => setEditDisplayName(e.target.value)}
            />

            <Select
              label="Linked Obligation"
              description="Optional — link this document to an obligation"
              placeholder="None"
              data={allObligationOptions}
              value={editObligationId}
              onChange={setEditObligationId}
              searchable
              clearable
            />

            <Group gap="xs">
              <Button
                variant="light"
                leftSection={<IconEye size={16} />}
                onClick={() => handleView(editDoc.doc)}
              >
                View
              </Button>
              <Button
                variant="light"
                leftSection={<IconDownload size={16} />}
                onClick={() => handleDownload(editDoc.doc)}
              >
                Download
              </Button>
              <Button
                variant="light"
                color="red"
                leftSection={<IconTrash size={16} />}
                onClick={() => handleDelete(editDoc)}
              >
                Delete
              </Button>
            </Group>

            <Group justify="flex-end" gap="xs" mt="xs">
              <Button variant="default" onClick={() => setEditDoc(null)}>
                Cancel
              </Button>
              <Button onClick={saveEdit}>
                Save
              </Button>
            </Group>
          </Stack>
        )}
      </Modal>
    </Stack>
  );
}
