import type { SxProps, Theme } from "@mui/material/styles";

export const fieldStyles = {
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
    "& .MuiAutocomplete-inputRoot": {
      paddingTop: 0,
      paddingBottom: 0,
    },
    "& .MuiAutocomplete-inputRoot .MuiAutocomplete-input": {
      padding: "9px 12px",
    },
    "& textarea.MuiOutlinedInput-input": {
      padding: 0,
    },
  },

} satisfies Record<string, SxProps<Theme>>;
