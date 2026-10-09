import type { SxProps, Theme } from "@mui/material/styles";

export const styles = {
    page: {maxWidth: 440, mx: "auto", my: {xs: 3, md: 8}},
    panel: {p: {xs: 3, md: 4}, borderRadius: 4, borderColor: "#d7c5b8"},
    heading: {fontFamily: "Georgia, serif", color: "#49352b", mb: 2},
    button: {bgcolor: "#79543f", "&:hover": {bgcolor: "#60412f"}},
} satisfies Record<string, SxProps<Theme>>;
