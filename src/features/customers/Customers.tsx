import { useQuery } from "@tanstack/react-query";
import { Alert, Button, CircularProgress } from "@mui/material";
import CustomerRecords from "./components/CustomerRecords";
import { getCustomers, saveCustomer } from "./customer.api";
export default function Customers() {
  const query = useQuery({ queryKey: ["customers"], queryFn: getCustomers });
  if (query.isPending)
    return <CircularProgress aria-label="Loading customers" />;
  if (query.error)
    return (
      <Alert severity="error">
        {query.error.message}
        <Button onClick={() => void query.refetch()}>Retry</Button>
      </Alert>
    );
  return (
    <CustomerRecords
      title="Customers"
      singular="customer"
      queryKey={["customers"]}
      rows={query.data.map((c) => ({
        ...Object.fromEntries(
          Object.entries(c).map(([k, v]) => [k, v == null ? "" : String(v)]),
        ),
        id: c.customer_id,
      }))}
      fields={[
        { name: "first_name", label: "First name", required: true },
        { name: "last_name", label: "Last name", required: true },
        { name: "email", label: "Email", type: "email" },
        { name: "phone_number", label: "Phone number" },
        { name: "address", label: "Address", multiline: true },
        { name: "customer_notes", label: "Notes", multiline: true },
        {
          name: "is_active",
          label: "Active",
          defaultValue: "true",
          options: [
            { value: "true", label: "Yes" },
            { value: "false", label: "No" },
          ],
        },
      ]}
      onSave={saveCustomer}
    />
  );
}
