import { discountedPrice } from "../../items/item.pricing";
import { Controller, useFieldArray, useFormContext } from "react-hook-form";
import { Alert, Button, MenuItem, Stack } from "@mui/material";
import LabeledTextField from "./LabeledTextField";
import type { StaffOrderFormData } from "../order.types";

export default function StaffOrderLines({items, disabled, onStructureChange}: {
  items: {item_id: string; item_name: string; sale_price: number}[]; disabled: boolean; onStructureChange: () => void;
}) {
  const {control, setValue, getValues, formState: {errors}} = useFormContext<StaffOrderFormData>();
  const {fields, append, remove} = useFieldArray({control, name: "items"});
  const arrayError = errors.items?.root?.message || errors.items?.message;
  return <Stack spacing={2}>
    {fields.map((line, index) => <Stack key={line.id} direction={{xs: "column", sm: "row"}} spacing={1}>
      <Controller name={`items.${index}.item_id`} control={control} render={({field: {ref, ...field}, fieldState}) =>
        <LabeledTextField {...field} inputRef={ref} label="Item" select required fullWidth disabled={disabled}
          error={!!fieldState.error} helperText={fieldState.error?.message} onChange={event => {
            field.onChange(event.target.value);
            const price = items.find(item => item.item_id === event.target.value)?.sale_price ?? 0;
            setValue(`items.${index}.original_sale_price`, price, {shouldDirty: true});
            setValue(`items.${index}.order_discount`, 0, {shouldDirty: true});
            setValue(`items.${index}.sale_price`, price, {shouldDirty: true, shouldValidate: true});
          }}>
          {items.map(item => <MenuItem key={item.item_id} value={item.item_id}>{item.item_name}</MenuItem>)}
        </LabeledTextField>} />
      <Controller name={`items.${index}.quantity`} control={control} render={({field: {ref, ...field}, fieldState}) =>
        <LabeledTextField {...field} inputRef={ref} label="Quantity" type="number" required fullWidth disabled={disabled}
          value={Number.isNaN(field.value) ? "" : field.value} onChange={event => field.onChange(event.target.value === "" ? NaN : Number(event.target.value))}
          slotProps={{htmlInput: {min: 1, max: 999, step: 1}}} error={!!fieldState.error} helperText={fieldState.error?.message} />} />
      <Controller name={`items.${index}.order_discount`} control={control} render={({field: {ref, ...field}, fieldState}) =>
        <LabeledTextField {...field} inputRef={ref} label="Discount (%)" type="number" fullWidth disabled={disabled}
          value={Number.isNaN(field.value) ? "" : field.value ?? 0}
          slotProps={{htmlInput: {min: 0, max: 100, step: 1}}}
          onChange={event => {
            const discount = event.target.value === "" ? NaN : Number(event.target.value);
            field.onChange(discount);
            const line = getValues(`items.${index}`);
            // Keep the draft's price baseline until staff explicitly refresh current prices.
            const original = line.original_sale_price ?? line.sale_price;
            if (Number.isInteger(discount) && discount >= 0 && discount <= 100) {
              setValue(`items.${index}.original_sale_price`, original, {shouldDirty: true});
              setValue(`items.${index}.sale_price`, discountedPrice(original, discount), {shouldDirty: true, shouldValidate: true});
            }
          }} error={!!fieldState.error} helperText={fieldState.error?.message} />} />
      <Controller name={`items.${index}.sale_price`} control={control} render={({field: {ref, ...field}, fieldState}) =>
        <LabeledTextField {...field} inputRef={ref} label="Sale price" fullWidth slotProps={{input: {readOnly: true}}}
          error={!!fieldState.error} helperText={fieldState.error?.message} />} />
      <Button disabled={disabled || fields.length === 1} onClick={() => {remove(index); onStructureChange();}}>Remove</Button>
    </Stack>)}
    {arrayError && <Alert severity="error">{arrayError}</Alert>}
    <Button disabled={disabled || fields.length >= 100} onClick={() => {append({lineId: crypto.randomUUID(), item_id: "", quantity: 1, sale_price: 0, original_sale_price: 0, order_discount: 0}); onStructureChange();}}>Add item</Button>
  </Stack>;
}

