import { Alert, Box, Button, Paper, Stack, Typography } from '@mui/material';

// Presentation only. Return workflows and data access will be implemented later.
export default function Returns() {
    return <Paper variant="outlined" sx={{p: {xs: 2, sm: 3}, borderRadius: 4}}>
        <Stack spacing={3}>
            <Box sx={{display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 2, flexWrap: 'wrap'}}>
                <Typography component="h2" variant="h5">Item returns</Typography>
                <Button variant="contained" disabled>Add item return</Button>
            </Box>
            <Alert severity="info">Returns are not available yet.</Alert>
            <Box sx={{py: 5, textAlign: 'center', border: '1px dashed', borderColor: 'divider', borderRadius: 3}}>
                <Typography color="text.secondary">Return records will appear here when returns are available.</Typography>
            </Box>
        </Stack>
    </Paper>;
}
