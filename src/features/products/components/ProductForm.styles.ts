import type { SxProps, Theme } from "@mui/material/styles";

export const styles = {
  layout: {
    display: "grid",
    gridTemplateColumns: {
      xs: "1fr",
      md: "1fr 1fr",
    },
    alignItems: "center",
    gap: { xs: 4, md: 6 },
    px: { xs: 2, sm: 4, md: 6 },
    py: { xs: 4, md: 8 },
    textAlign: "left",
  },

  heading: {
    fontWeight: 700,
    fontSize: { xs: "2rem", md: "2.75rem" },
    mb: 2,
  },

  description: {
    maxWidth: "38ch",
    fontSize: "1.05rem",
    lineHeight: 1.7,
  },

  card: {
    minWidth: 0,
    borderRadius: 4,
    p: { xs: 3, sm: 4, md: 5 },
    boxShadow: "0 8px 40px rgba(0, 0, 0, 0.12)",
  },

  form: {
    width: "100%",
    maxWidth: 360,
    mx: "auto",
  },

  formTitle: {
    fontWeight: 600,
  },

  fieldGroup: {
    display: "flex",
    flexDirection: "column",
    gap: "6px", // Adjust the space between each label and textbox.
  },

  fieldLabel: {
    fontSize: "0.875rem",
    fontWeight: 500,
    color: "text.primary",
  },

  textField: {
    "& .MuiOutlinedInput-root": {
      borderRadius: "8px",
      fontSize: "0.95rem",
    },
    "& .MuiOutlinedInput-input:not(textarea)": {
      padding: "9px 12px", // Adjust the first value to change input height.
    },
    "& .MuiOutlinedInput-root.MuiInputBase-multiline": {
      padding: "9px 12px",
    },
    "& textarea.MuiOutlinedInput-input": {
      padding: 0,
    },
  },

  submitButton: {
    alignSelf: "flex-start",
    px: 3,
    py: 1.25,
    borderRadius: 2,
    textTransform: "none",
  },
} satisfies Record<string, SxProps<Theme>>;
