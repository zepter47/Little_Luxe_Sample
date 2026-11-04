import { Alert, Button, Stack, Typography } from '@mui/material';

export default function StaffOrderDraftStatus({ready, error, savedAt, finished, disabled, onRetry, onDiscard}: {
  ready: boolean; error: string | null; savedAt: number | null; finished: boolean; disabled: boolean;
  onRetry: () => void; onDiscard: () => void;
}) {
  return <Stack spacing={1}>
    {!ready && !error && <Typography role="status">Restoring your draft…</Typography>}
    {ready && !finished && <Typography variant="caption" color="text.secondary" role="status">
      {savedAt ? `Last saved on this device at ${new Date(savedAt).toLocaleTimeString()}.` : 'Changes are saved automatically on this device.'}
    </Typography>}
    {error && <Alert severity="error">{error}
      {(ready || finished) && <Button disabled={disabled} onClick={onRetry}>{finished ? 'Retry draft cleanup' : 'Retry draft save'}</Button>}
    </Alert>}
    {!finished && <Button disabled={disabled} onClick={onDiscard}>Discard draft</Button>}
  </Stack>;
}
