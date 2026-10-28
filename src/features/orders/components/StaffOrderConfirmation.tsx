import { Button, Dialog, DialogActions, DialogContent, DialogTitle } from "@mui/material";

export default function StaffOrderConfirmation({open, pending, onNo, onYes}: {
  open: boolean; pending: boolean; onNo: () => void; onYes: () => void;
}) {
  return <Dialog open={open} onClose={() => {if (!pending) onNo();}} aria-labelledby="staff-order-confirmation-title">
    <DialogTitle id="staff-order-confirmation-title">Confirm staff order</DialogTitle>
    <DialogContent>Would you like to create this order and reserve its items?</DialogContent>
    <DialogActions><Button autoFocus disabled={pending} onClick={onNo}>No</Button>
      <Button disabled={pending} onClick={onYes}>Yes</Button></DialogActions>
  </Dialog>;
}
