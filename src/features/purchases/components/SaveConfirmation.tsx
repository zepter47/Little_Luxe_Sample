import { Button, Dialog, DialogActions, DialogContent, DialogTitle } from "@mui/material";

// Owned by this feature so its approval UI can evolve independently.
export default function SaveConfirmation({open, pending, label, onNo, onYes}: {
    open: boolean; pending: boolean; label: string; onNo: () => void; onYes: () => void;
}) {
    return <Dialog open={open} onClose={() => {if (!pending) onNo();}} aria-labelledby="confirm-save-title">
        <DialogTitle id="confirm-save-title">Confirm {label} save</DialogTitle>
        <DialogContent>Would you like to save this {label}?</DialogContent>
        <DialogActions><Button autoFocus disabled={pending} onClick={onNo}>No</Button>
            <Button disabled={pending} onClick={onYes}>Yes</Button></DialogActions>
    </Dialog>;
}
