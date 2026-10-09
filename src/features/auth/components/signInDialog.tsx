import { Button, Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle } from "@mui/material";
import { Link } from "@tanstack/react-router";
import { styles } from "./Auth.styles";

export default function SignInDialog({open, onClose, message}: {
    open: boolean; onClose: () => void; message: string;
}) {
    return <Dialog open={open} onClose={onClose} aria-labelledby="sign-in-title" maxWidth="xs" fullWidth
        slotProps={{paper: {sx: {borderRadius: 4, p: 1}}}}>
        <DialogTitle id="sign-in-title" sx={styles.heading}>Sign in to continue</DialogTitle>
        <DialogContent><DialogContentText>{message}</DialogContentText></DialogContent>
        <DialogActions>
            <Button onClick={onClose}>Cancel</Button>
            <Button component={Link} to="/login" variant="contained" sx={styles.button}>Sign in</Button>
        </DialogActions>
    </Dialog>;
}
