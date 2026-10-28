import { useId } from "react";
import { Box, FormLabel, TextField, type TextFieldProps } from "@mui/material";
import type { SxProps, Theme } from "@mui/material/styles";
import { fieldStyles as defaultStyles } from "./Field.styles";

type FieldStyles = Record<"fieldGroup" | "fieldLabel" | "textField", SxProps<Theme>>;
type Props = Omit<TextFieldProps<"outlined">, "variant"> & { fieldStyles?: FieldStyles };

/** Separate labels for text, multiline and select fields, or Autocomplete renderInput. */
export default function LabeledTextField({
    label, id, error, required, disabled, fullWidth, sx, slotProps,
    fieldStyles = defaultStyles, ...props
}: Props) {
    const generatedId = useId();
    const inputId = id ?? generatedId;
    const labelId = `${inputId}-label`;

    return <Box sx={[...(Array.isArray(fieldStyles.fieldGroup) ? fieldStyles.fieldGroup : [fieldStyles.fieldGroup]), {minWidth: 0, ...(fullWidth && {width: "100%", flex: 1})}]}>
        {label != null && <FormLabel id={labelId} htmlFor={inputId} error={error}
            required={required} disabled={disabled} sx={fieldStyles.fieldLabel}>
            {label}
        </FormLabel>}
        <TextField {...props} id={inputId} variant="outlined" size={props.size ?? "small"}
            error={error} required={required} disabled={disabled} fullWidth={fullWidth}
            sx={[...(Array.isArray(fieldStyles.textField) ? fieldStyles.textField : [fieldStyles.textField]), ...(Array.isArray(sx) ? sx : sx ? [sx] : [])]}
            slotProps={{...slotProps, select: ownerState => ({
                labelId: label != null ? labelId : undefined,
                ...(typeof slotProps?.select === "function" ? slotProps.select(ownerState) : slotProps?.select),
            })}} />
    </Box>;
}
