Use `LabeledTextField` for new text inputs, textareas (`multiline`), and combo boxes (`select` with `MenuItem` children). It places the label above the outlined input and shares the category/product form styles.

Pass normal MUI TextField props, including `label`, `required`, `error`, `helperText`, and `slotProps`. With React Hook Form, pass the controller's `ref` as `inputRef` so validation focuses the input. IDs are generated when omitted. Select labels are associated with the combobox through `labelId`.

For autocomplete, preserve all MUI renderInput parameters:

```tsx
<Autocomplete
    options={options}
    renderInput={params => <LabeledTextField {...params} label="Category" />}
/>
```

`Field.styles.ts` controls shared label spacing, typography, input height, and corners. Both `ProductForm.styles.ts` and `Admin.styles.ts` expose these styles. Use the optional `fieldStyles` prop for component-specific group, label, or input styling, and `sx` for individual input overrides. Preserve the separate label and accessible association when building a custom field.
