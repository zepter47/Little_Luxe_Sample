import { Controller, useFieldArray, useFormContext } from "react-hook-form";
import { Alert, Button, MenuItem, Stack } from "@mui/material";
import LabeledTextField from "./LabeledTextField";
import type { StaffOrderFormData } from "../order.types";

export default function StaffOrderLines({items, disabled}: {
  items: {item_id: string; item_name: string; sale_price: number}[]; disabled: boolean;
}) {
  const {control, setValue, formState: {errors}} = useFormContext<StaffOrderFormData>();
  const {fields, append, remove} = useFieldArray({control, name: "items"});
  const arrayError = errors.items?.root?.message || errors.items?.message;
  return <Stack spacing={2}>
    {fields.map((line, index) => <Stack key={line.id} direction={{xs: "column", sm: "row"}} spacing={1}>
      <Controller name={`items.${index}.item_id`} control={control} render={({field: {ref, ...field}, fieldState}) =>
        <LabeledTextField {...field} inputRef={ref} label="Item" select required fullWidth disabled={disabled}
          error={!!fieldState.error} helperText={fieldState.error?.message} onChange={event => {
            field.onChange(event.target.value);
            setValue(`items.${index}.sale_price`, items.find(item => item.item_id === event.target.value)?.sale_price ?? 0, {shouldDirty: true, shouldValidate: true});
          }}>
          {items.map(item => <MenuItem key={item.item_id} value={item.item_id}>{item.item_name}</MenuItem>)}
        </LabeledTextField>} />
      <Controller name={`items.${index}.quantity`} control={control} render={({field: {ref, ...field}, fieldState}) =>
        <LabeledTextField {...field} inputRef={ref} label="Quantity" type="number" required fullWidth disabled={disabled}
          value={Number.isNaN(field.value) ? "" : field.value} onChange={event => field.onChange(event.target.value === "" ? NaN : Number(event.target.value))}
          slotProps={{htmlInput: {min: 1, max: 999, step: 1}}} error={!!fieldState.error} helperText={fieldState.error?.message} />} />
      <Controller name={`items.${index}.sale_price`} control={control} render={({field: {ref, ...field}, fieldState}) =>
        <LabeledTextField {...field} inputRef={ref} label="Sale price" fullWidth slotProps={{input: {readOnly: true}}}
          error={!!fieldState.error} helperText={fieldState.error?.message} />} />
      <Button disabled={disabled || fields.length === 1} onClick={() => remove(index)}>Remove</Button>
    </Stack>)}
    {arrayError && <Alert severity="error">{arrayError}</Alert>}
    <Button disabled={disabled || fields.length >= 100} onClick={() => append({item_id: "", quantity: 1, sale_price: 0})}>Add item</Button>
  </Stack>;
}
