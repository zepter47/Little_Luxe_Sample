import type { SxProps, Theme } from '@mui/material/styles'

const drawerWidth = 248

export const styles = {
  shell: {
    display: 'flex', minHeight: '100dvh',
    bgcolor: 'background.default', color: 'text.primary',
  },
  drawer: {
    width: { md: drawerWidth }, flexShrink: 0,
    '& .MuiDrawer-paper': {
      width: drawerWidth, boxSizing: 'border-box',
      bgcolor: '#fafafa', borderRight: '1px solid #e5e5e5',
    },
  },
  navigation: { py: 1.5 },
  navigationHeader: {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    minHeight: 48, px: 2.5,
  },
  brand: {
    fontFamily: '"Segoe UI", Roboto, sans-serif',
    fontSize: '1rem', fontWeight: 600, letterSpacing: '-0.02em',
  },
  divider: { mx: 2, my: 1.5, borderColor: '#e5e5e5' },
  sectionLabel: {
    px: 3, pt: 1, pb: 1.5, color: 'text.secondary',
    fontFamily: '"Segoe UI", Roboto, sans-serif',
    fontSize: '0.75rem', fontWeight: 600,
  },
  list: { px: 1.5 },
  link: {
    position: 'relative', minHeight: 42, px: 1.5, py: 0.5, mb: 0.5,
    borderRadius: '4px', color: '#424242',
    '&:hover': { bgcolor: '#ebebeb' },
    '&[data-status="active"]': {
      bgcolor: '#e8f0fa', color: '#0f548c',
      '& .MuiListItemText-primary': { fontWeight: 600 },
      '&::before': {
        content: '""', position: 'absolute', left: 0,
        top: 10, bottom: 10, width: 3, borderRadius: 2, bgcolor: '#0f6cbd',
      },
      '&:hover': { bgcolor: '#dce9f7' },
    },
    '&.Mui-focusVisible, &:focus-visible': {
      outline: '2px solid #0f6cbd', outlineOffset: 2,
    },
  },
  itemIcon: { minWidth: 32, color: 'inherit' },
  icon: {
    fontSize: 20, fill: 'none', stroke: 'currentColor',
    strokeWidth: 1.6, strokeLinecap: 'round', strokeLinejoin: 'round',
  },
  itemText: {
    '& .MuiListItemText-primary': {
      fontFamily: '"Segoe UI", Roboto, sans-serif', fontSize: '0.875rem',
    },
  },
  mobileHeader: {
    display: { xs: 'flex', md: 'none' }, alignItems: 'center', gap: 1.5,
    position: 'fixed', top: 0, left: 0, right: 0, height: 56, px: 1.5,
    bgcolor: 'background.paper', borderBottom: '1px solid #e5e5e5',
    zIndex: (theme) => theme.zIndex.appBar,
  },
  content: {
    flex: 1, minWidth: 0, p: { xs: 2, sm: 3, lg: 4 },
    mt: { xs: '56px', md: 0 }, overflowWrap: 'anywhere',
  },
  skipLink: {
    position: 'fixed', top: -100, left: 16,
    zIndex: (theme) => theme.zIndex.modal + 1,
    p: 1.5, borderRadius: 1, bgcolor: 'background.paper', color: '#0f548c',
    '&:focus': { top: 8 },
  },
} satisfies Record<string, SxProps<Theme>>
