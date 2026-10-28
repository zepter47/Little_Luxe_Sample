import { useRef, type ReactNode } from 'react';
import { Box, IconButton } from '@mui/material';
import { styles } from './Admin.styles';

export default function AdminNavigation({label, children}: {label: string; children: ReactNode}) {
    const strip = useRef<HTMLDivElement>(null);
    return <Box sx={{display: 'flex', alignItems: 'center', minWidth: 0, my: 3, bgcolor: '#f5eee9', borderRadius: 3}}>
        <IconButton aria-label={`Scroll ${label} left`} onClick={() => strip.current?.scrollBy({left: -220, behavior: 'smooth'})} sx={{flexShrink: 0}}>‹</IconButton>
        <Box ref={strip} component="nav" aria-label={label} tabIndex={0}
            onFocus={event => {if (event.target instanceof HTMLElement && event.target !== event.currentTarget) event.target.scrollIntoView({block: 'nearest', inline: 'nearest'});}}
            sx={{...styles.menu, my: 0, flex: 1, minWidth: 0, scrollbarWidth: 'thin'}}>{children}</Box>
        <IconButton aria-label={`Scroll ${label} right`} onClick={() => strip.current?.scrollBy({left: 220, behavior: 'smooth'})} sx={{flexShrink: 0}}>›</IconButton>
    </Box>;
}
