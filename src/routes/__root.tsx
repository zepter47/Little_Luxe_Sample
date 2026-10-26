import { useState } from 'react'
import { Link, Outlet, createRootRouteWithContext } from '@tanstack/react-router'
import { TanStackRouterDevtools } from '@tanstack/react-router-devtools'
import {
  Avatar, Badge, Box, Button, CssBaseline, Divider, Drawer, IconButton, List, ListItem,
  ListItemButton, ListItemIcon, ListItemText, SvgIcon, Typography,
  useMediaQuery, useTheme,
} from '@mui/material'
import { canManageStore, type AuthState } from "../features/auth/auth.types";
import { useCart } from '../features/cart/cart.hooks'
import { styles } from '../components/Navigation.styles'

const navigationItems = [
  { label: 'Home', to: '/', path: 'M3 10 12 3l9 7v11h-6v-7H9v7H3Z' },
  { label: 'Admin', to: '/admin', path: 'M12 3 3 7v5c0 5 9 9 9 9s9-4 9-9V7ZM8 12l3 3 5-6' },
  { label: 'Stock Management', to: '/stock-management', path: 'M3 7h18v14H3ZM2 3h20v4H2Zm7 8h6m-3-4v14' },
  { label: 'Products', to: '/products', path: 'm12 3 9 5v9l-9 5-9-5V8l9-5Zm-9 5 9 4 9-4m-9 4v10' },
  { label: 'Categories', to: '/category', path: 'M3 3h7v7H3Zm11 0h7v7h-7ZM3 14h7v7H3Zm11 0h7v7h-7Z' },
  { label: 'Dashboard', to: '/dashboard', path: 'M3 3h7v7H3Zm11 0h7v7h-7ZM3 14h7v7H3Zm11 0h7v7h-7Z' },
  { label: 'Cart', to: '/cart', path: 'M3 3h2l3 12h10l3-9H6M9 20h.01M18 20h.01' },
  { label: 'About', to: '/about', path: 'M12 8h.01M12 11v6m9-5a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z' },
] as const

export const Route = createRootRouteWithContext<{auth: AuthState}>()({ component: RootComponent })

function RootComponent() {
  const {auth} = Route.useRouteContext();
  const { items } = useCart()
  const cartCount = items.length
  const [mobileOpen, setMobileOpen] = useState(false)
  const theme = useTheme()
  const isDesktop = useMediaQuery(theme.breakpoints.up('md'))

  return (
    <Box sx={styles.shell}>
      <CssBaseline />
      <Box component="a" href="#page-content" sx={styles.skipLink}>Skip to content</Box>
      <Box component="header" sx={styles.mobileHeader}>
        <IconButton
          aria-label="Open navigation"
          aria-controls={mobileOpen ? 'primary-navigation' : undefined}
          aria-expanded={mobileOpen}
          onClick={() => setMobileOpen(true)}
        >
          <SvgIcon sx={styles.icon}><path d="M4 6h16M4 12h16M4 18h16" /></SvgIcon>
        </IconButton>
        <Typography sx={styles.brand}>Little Luxe</Typography>
      </Box>
      <Drawer
        variant={isDesktop ? 'permanent' : 'temporary'}
        open={isDesktop || mobileOpen}
        onClose={() => setMobileOpen(false)}
        sx={styles.drawer}
      >
        <Box component="nav" id="primary-navigation" aria-label="Main navigation" sx={styles.navigation}>
          <Box sx={styles.navigationHeader}>
            <Typography sx={styles.brand}>Little Luxe</Typography>
            {!isDesktop && (
              <IconButton aria-label="Close navigation" onClick={() => setMobileOpen(false)}>
                <SvgIcon sx={styles.icon}><path d="m6 6 12 12M6 18 18 6" /></SvgIcon>
              </IconButton>
            )}
          </Box>
          <Divider sx={styles.divider} />
          {auth.isAuthenticated && <Box sx={{px: 3, py: 1}}>
            <IconButton component={Link} to="/profile" aria-label="Your profile" onClick={() => setMobileOpen(false)}>
              <Avatar sx={{bgcolor: "#79543f"}}>{auth.email?.slice(0, 1).toUpperCase() || "U"}</Avatar>
            </IconButton>
          </Box>}
          <Typography component="h2" sx={styles.sectionLabel}>Navigation</Typography>
          <List disablePadding sx={styles.list}>
            {navigationItems.filter(item => (item.to !== "/admin" && item.to !== "/category" && item.to !== "/stock-management") || canManageStore(auth)).map((item) => (
              <ListItem key={item.to} disablePadding>
                <ListItemButton
                  component={Link}
                  to={item.to}
                  activeOptions={{ exact: item.to === '/' }}
                  onClick={() => setMobileOpen(false)}
                  sx={styles.link}
                >
                  <ListItemIcon sx={styles.itemIcon}>
                    <Badge badgeContent={item.to === "/cart" ? cartCount : 0} color="primary"><SvgIcon sx={styles.icon}><path d={item.path} /></SvgIcon></Badge>
                  </ListItemIcon>
                  <ListItemText primary={item.label} sx={styles.itemText} />
                </ListItemButton>
              </ListItem>
            ))}
          </List>
          {!auth.isAuthenticated && <Box sx={{mt: "auto", p: 3}}>
            <Button component={Link} to="/login" fullWidth variant="outlined" onClick={() => setMobileOpen(false)}>Sign in / Sign up</Button>
          </Box>}
        </Box>
      </Drawer>
      <Box component="main" id="page-content" tabIndex={-1} sx={styles.content}>
        <Outlet />
      </Box>
      {import.meta.env.DEV && <TanStackRouterDevtools />}
    </Box>
  )
}
