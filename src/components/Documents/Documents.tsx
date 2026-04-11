import { useState, useMemo, useCallback, useEffect } from 'react';
import {
  Stack, Title, Group, Text, Paper, Badge, TextInput,
  Select, Modal, Button, FileInput, ActionIcon, Tabs,
} from '@mantine/core';
import { Dropzone, MIME_TYPES } from '@mantine/dropzone';
import {
  IconEye, IconDownload, IconTrash, IconSearch, IconUpload, IconFile,
  IconLink, IconFileOff, IconX, IconFiles,
} from '@tabler/icons-react';
import { notify } from '../../utils/notify';
import { useIsMobile } from '../../hooks/useIsMobile';
import { useObligations } from '../../hooks/useObligations';
import { useDocuments as useStandaloneDocs } from '../../hooks/useDocuments';
import type { Obligation, DocumentMeta } from '../../types/obligation';
import { getObligationStatus, formatDate } from '../../utils/dates';
import { useApi } from '../../contexts/ApiContext';
import { useOrgContext } from '../../contexts/OrgContext';
import { useViewAs } from '../../contexts/ViewAsContext';
import { StatusBadge } from '../StatusBadge/StatusBadge';
import { ListSkeleton } from '../PageSkeleton';
import { ErrorDisplay } from '../ErrorDisplay';
import { useModalSearchParam } from '../../hooks/useModalSearchParam';

interface FlatDoc {
  doc: DocumentMeta;
  obligation: Obligation | null;
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function Documents() {
  const { saveDocument, getDocument } = useApi();
  const { obligations, isLoading: oblLoading, isError: oblError, error: oblErr, refetch: oblRefetch } = useObligations();
  const {
    documents: standaloneDocs,
    isLoading: docsLoading, isError: docsError, error: docsErr, refetch: docsRefetch,
    addDocument: onAddStandaloneDoc,
    updateDocument: onUpdateStandaloneDoc,
    removeDocument: onRemoveStandaloneDoc,
  } = useStandaloneDocs();
  const { orgId } = useOrgContext();
  const { isViewingAsOther } = useViewAs();
  const isMobile = useIsMobile();
  const [search, setSearch] = useState('');
  const [filterObligation, setFilterObligation] = useState<string | null>(null);

  // Upload modal state
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [uploadTab, setUploadTab] = useState<string | null>('single');
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadObligationId, setUploadObligationId] = useState<string | null>(null);
  const [uploadDisplayName, setUploadDisplayName] = useState('');
  const [uploading, setUploading] = useState(false);
  const [bulkUploading, setBulkUploading] = useState(false);

  // Edit modal state
  const { value: editDocId, open: openDoc, close: closeDoc } = useModalSearchParam('docId');
  const [editDisplayName, setEditDisplayName] = useState('');
  const [editObligationId, setEditObligationId] = useState<string | null>(null);

  // Lock fullScreen at modal open to prevent layout thrashing at breakpoint boundary
  const [modalFullScreen, setModalFullScreen] = useState(false);

  const isLoading = oblLoading || docsLoading;
  const isError = oblError || docsError;
  const loadError = oblErr ?? docsErr ?? null;
  const refetch = () => { oblRefetch(); docsRefetch(); };

  // Flatten all documents: linked (from obligations) + standalone, deduplicating
  const allDocs = useMemo(() => {
    const docs: FlatDoc[] = [];
    const linkedDocIds = new Set<string>();
    for (const ob of obligations) {
      for (const doc of ob.documents ?? []) {
        docs.push({ doc, obligation: ob });
        linkedDocIds.add(doc.id);
      }
    }
    for (const doc of standaloneDocs) {
      if (linkedDocIds.has(doc.id)) continue; // already included via obligation
      if (doc.obligationId) {
        const ob = obligations.find((o) => o.id === doc.obligationId) ?? null;
        docs.push({ doc, obligation: ob });
      } else {
        docs.push({ doc, obligation: null });
      }
    }
    docs.sort((a, b) => new Date(b.doc.addedAt).getTime() - new Date(a.doc.addedAt).getTime());
    return docs;
  }, [obligations, standaloneDocs]);

  // Derive editDoc from fresh query data
  const editDoc = editDocId ? allDocs.find((d) => d.doc.id === editDocId) ?? null : null;

  // Sync form state when editDoc resolves (handles deep-link case)
  useEffect(() => {
    if (editDoc) {
      setEditDisplayName(editDoc.doc.displayName ?? '');
      setEditObligationId(editDoc.obligation?.id ?? null);
      setModalFullScreen(!!isMobile);
    }
  }, [editDocId]); // eslint-disable-line react-hooks/exhaustive-deps

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
    const blob = await getDocument(orgId, doc.id);
    if (!blob) {
      notify.error('Document not found');
      return;
    }
    const url = URL.createObjectURL(blob);
    window.open(url, '_blank');
  }

  async function handleDownload(doc: DocumentMeta) {
    const blob = await getDocument(orgId, doc.id);
    if (!blob) {
      notify.error('Document not found');
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
    await onRemoveStandaloneDoc(flatDoc.doc.id);
    closeDoc();
  }

  async function handleUpload() {
    if (!uploadFile) return;
    if (isViewingAsOther) { notify.info('Switch to your own dashboard to make changes'); return; }
    setUploading(true);
    try {
      const meta = await saveDocument(orgId, uploadFile, uploadObligationId ?? undefined);
      const displayName = uploadDisplayName.trim() || undefined;
      if (displayName) {
        await onUpdateStandaloneDoc(meta.id, { displayName });
      }
      if (uploadObligationId) {
        const ob = obligations.find((o) => o.id === uploadObligationId);
        oblRefetch();
        notify.success(`"${displayName || uploadFile.name}" uploaded and linked to "${ob?.name ?? 'obligation'}"`);
      } else {
        await onAddStandaloneDoc(displayName ? { ...meta, displayName } : meta);
        notify.success(`"${displayName || uploadFile.name}" uploaded`);
      }
      setUploadFile(null);
      setUploadObligationId(null);
      setUploadDisplayName('');
      setUploadModalOpen(false);
    } catch {
      notify.error('Failed to upload document');
    } finally {
      setUploading(false);
    }
  }

  function openEditModal(flatDoc: FlatDoc) {
    setModalFullScreen(!!isMobile);
    openDoc(flatDoc.doc.id);
    setEditDisplayName(flatDoc.doc.displayName ?? '');
    setEditObligationId(flatDoc.obligation?.id ?? null);
  }

  async function saveEdit() {
    if (!editDoc) return;
    const newDisplayName = editDisplayName.trim() || undefined;
    const newObId = editObligationId;

    const updates: Partial<Pick<DocumentMeta, 'displayName' | 'obligationId'>> = {};
    if (newDisplayName !== (editDoc.doc.displayName ?? undefined)) {
      updates.displayName = newDisplayName;
    }
    const obligationChanged = (editDoc.obligation?.id ?? null) !== newObId;
    if (obligationChanged) {
      updates.obligationId = newObId ?? undefined;
    }

    if (Object.keys(updates).length > 0) {
      await onUpdateStandaloneDoc(editDoc.doc.id, updates);
    }

    notify.success('Document updated');
    closeDoc();
  }

  const handleDrop = useCallback(async (files: File[]) => {
    if (isViewingAsOther) { notify.info('Switch to your own dashboard to make changes'); return; }
    setBulkUploading(true);
    let successCount = 0;
    for (const file of files) {
      try {
        const meta = await saveDocument(orgId, file);
        await onAddStandaloneDoc(meta);
        successCount++;
      } catch {
        notify.error(`Failed to upload "${file.name}"`);
      }
    }
    setBulkUploading(false);
    if (successCount > 0) {
      notify.success(
        successCount === 1
          ? `"${files[0].name}" uploaded`
          : `${successCount} documents uploaded`,
      );
      setUploadModalOpen(false);
    }
  }, [orgId, onAddStandaloneDoc]);

  if (isLoading) return <ListSkeleton />;
  if (isError) return <ErrorDisplay error={loadError} onRetry={refetch} />;

  return (
    <Stack gap="lg">
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
              onClick={() => { setModalFullScreen(!!isMobile); setUploadModalOpen(true); }}
            >
              Upload Document
            </Button>
          </Stack>
        </Paper>
      ) : (
        <>
          {/* Action bar: search/filter left, upload right */}
          <Group justify="space-between" wrap="nowrap" gap="md">
            <Group gap="md" style={{ flex: 1 }} grow={!isMobile}>
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
            <Button
              leftSection={<IconUpload size={16} />}
              size="sm"
              variant="light"
              style={{ flexShrink: 0 }}
              onClick={() => { setModalFullScreen(!!isMobile); setUploadModalOpen(true); }}
            >
              Upload
            </Button>
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
                  p="xs"
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
                        size="xs"
                        onClick={(e) => { e.stopPropagation(); handleView(doc); }}
                        title="View"
                      >
                        <IconEye size={14} />
                      </ActionIcon>
                      <ActionIcon
                        variant="subtle"
                        size="xs"
                        onClick={(e) => { e.stopPropagation(); handleDownload(doc); }}
                        title="Download"
                      >
                        <IconDownload size={14} />
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
          setUploadTab('single');
        }}
        title="Upload Documents"
        centered
        fullScreen={modalFullScreen}
      >
        <Tabs value={uploadTab} onChange={setUploadTab}>
          <Tabs.List mb="md">
            <Tabs.Tab value="single" leftSection={<IconFile size={14} />}>
              Single
            </Tabs.Tab>
            <Tabs.Tab value="bulk" leftSection={<IconFiles size={14} />}>
              Bulk Upload
            </Tabs.Tab>
          </Tabs.List>

          <Tabs.Panel value="single">
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
          </Tabs.Panel>

          <Tabs.Panel value="bulk">
            <Stack gap="md">
              <Dropzone
                onDrop={handleDrop}
                accept={[MIME_TYPES.pdf, MIME_TYPES.jpeg, MIME_TYPES.png]}
                multiple
                radius="md"
                p="xl"
                loading={bulkUploading}
              >
                <Stack align="center" gap="sm" style={{ pointerEvents: 'none' }}>
                  <Dropzone.Accept>
                    <IconUpload size={40} stroke={1.5} color="var(--mantine-color-sage-6)" />
                  </Dropzone.Accept>
                  <Dropzone.Reject>
                    <IconX size={40} stroke={1.5} color="var(--mantine-color-red-6)" />
                  </Dropzone.Reject>
                  <Dropzone.Idle>
                    <IconUpload size={40} stroke={1.5} color="var(--mantine-color-dimmed)" />
                  </Dropzone.Idle>
                  <Text size="md" fw={500} ta="center">
                    Drop files here or click to select
                  </Text>
                  <Text size="xs" c="dimmed" ta="center">
                    Accepts PDF, JPG, and PNG. Select multiple files at once.
                  </Text>
                </Stack>
              </Dropzone>
              <Text size="xs" c="dimmed">
                Bulk uploaded documents are saved as unlinked. You can link them to obligations afterwards.
              </Text>
            </Stack>
          </Tabs.Panel>
        </Tabs>
      </Modal>

      {/* Edit Modal */}
      <Modal
        opened={editDoc !== null}
        onClose={closeDoc}
        title="Edit Document"
        centered
        fullScreen={modalFullScreen}
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
              <Button variant="default" onClick={closeDoc}>
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
