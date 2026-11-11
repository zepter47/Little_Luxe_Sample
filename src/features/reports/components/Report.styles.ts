import type { SxProps, Theme } from '@mui/material/styles';
export const reportStyles = {
    page: {maxWidth: 1280, mx: 'auto', display: 'grid', gap: 3, pb: 4},
    hero: {p: {xs: 3, md: 4}, borderRadius: 4, background: 'linear-gradient(120deg, #153e35, #286755)', color: '#fff'},
    filters: {display: 'flex', flexWrap: 'wrap', gap: 2, alignItems: 'center'},
    panel: {minWidth: 0, p: {xs: 2, sm: 3}, border: '1px solid #e3e9e5', borderRadius: 3, boxShadow: 'none'},
    metrics: {display: 'grid', gridTemplateColumns: {xs: '1fr', sm: 'repeat(2, 1fr)', lg: 'repeat(4, 1fr)'}, gap: 2},
    metric: {p: 2.5, border: '1px solid #e3e9e5', borderRadius: 3, boxShadow: 'none', minWidth: 0},
    amounts: {display: 'grid', gridTemplateColumns: {xs: '1fr', sm: 'repeat(3, 1fr)'}, gap: 2},
} satisfies Record<string, SxProps<Theme>>;
