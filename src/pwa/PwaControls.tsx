import { useState } from 'react'
import { Alert, Box, Button, Dialog, DialogActions, DialogContent, DialogTitle, LinearProgress, Typography } from '@mui/material'
import { applyUpdate, checkForUpdate, installApp, usePwa } from './state'

export function PwaNavigation() {
  const state = usePwa()
  const [help, setHelp] = useState(false)
  const apple = /iPhone|iPad|iPod/.test(navigator.userAgent) || navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1
  return <Box sx={{ px: 3, py: 1 }}>
    {!state.standalone && state.install && <Button fullWidth onClick={() => { void installApp() }}>Install Little Luxe</Button>}
    {!state.standalone && !state.install && apple && <Button fullWidth onClick={() => setHelp(true)}>How to install</Button>}
    <Button fullWidth onClick={() => { void checkForUpdate() }}>Check for updates</Button>
    {state.message && <Typography role="status" variant="caption">{state.message}</Typography>}
    <Dialog open={help} onClose={() => setHelp(false)}>
      <DialogTitle>Install Little Luxe</DialogTitle>
      <DialogContent>Open this site in Safari, tap Share, then Add to Home Screen and confirm Add. Depending on your iOS version, these options may be in the browser menu. Open the new Little Luxe icon to use the app.</DialogContent>
      <DialogActions><Button onClick={() => setHelp(false)}>Got it</Button></DialogActions>
    </Dialog>
  </Box>
}

export default function PwaUpdates() {
  const state = usePwa()
  const [dismissed, setDismissed] = useState(false)
  return <>
    {state.error && <Alert severity="warning" sx={{ position: 'fixed', bottom: 16, left: 16, right: 16, zIndex: 1500 }} action={<Button color="inherit" onClick={() => { void checkForUpdate() }}>Retry</Button>}>{state.error}</Alert>}
    <Dialog open={state.required || state.busy || state.ready && !dismissed} onClose={() => { if (!state.required && !state.busy) setDismissed(true) }}>
      <DialogTitle>{state.required ? 'Update required' : 'Little Luxe update available'}</DialogTitle>
      <DialogContent>
        <Typography>{state.required ? 'This version is no longer supported. Update to continue.' : 'A new version is ready. Finish any ongoing work before updating. Other open Little Luxe tabs will also reload.'}</Typography>
        <Typography sx={{ mt: 1 }}>Saved drafts and your cart stay on this device. Unsaved work in forms without draft support may be lost.</Typography>
        {state.busy && <LinearProgress aria-label="Applying update" sx={{ mt: 2 }} />}
        {state.required && !state.ready && <Typography sx={{ mt: 1 }}>Connect to the internet and check for the required update. If it is still downloading, please wait.</Typography>}
      </DialogContent>
      <DialogActions>
        {!state.required && <Button disabled={state.busy} onClick={() => setDismissed(true)}>Later</Button>}
        <Button disabled={state.busy} onClick={() => { void applyUpdate() }}>{state.busy ? 'Updating…' : state.ready ? 'Update now' : 'Check for update'}</Button>
      </DialogActions>
    </Dialog>
    {state.ready && dismissed && !state.required && <Button variant="contained" sx={{ position: 'fixed', bottom: 16, right: 16, zIndex: 1200 }} onClick={() => setDismissed(false)}>Update available</Button>}
  </>
}
