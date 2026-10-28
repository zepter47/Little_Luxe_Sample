import type { SxProps, Theme } from "@mui/material/styles";
export const styles = {
    heading: {fontFamily: "Georgia, serif", fontWeight: 500, fontSize: {xs: "2rem", md: "2.75rem"}, color: "#49352b"},
    menu: {display: "flex", flexWrap: "nowrap", overflowX: "auto", touchAction: "pan-x", gap: 1, p: 1, my: 3, bgcolor: "#f5eee9", borderRadius: 3},
    menuLink: {flexShrink: 0, whiteSpace: "nowrap", textTransform: "none", color: "#735b4c", px: 3, borderRadius: 2,
        '&[data-status="active"]': {bgcolor: "#fff", color: "#49352b", boxShadow: "0 2px 8px #49352b12", fontWeight: 700}},
} satisfies Record<string, SxProps<Theme>>;
