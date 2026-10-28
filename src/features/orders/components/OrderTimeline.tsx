import { Paper, Stack, Typography } from "@mui/material";
import type { OrderTimelineEntry } from "../order.types";

export default function OrderTimeline({entries, staff}: {entries: OrderTimelineEntry[]; staff: boolean}) {
  return <Stack spacing={1}>
    <Typography variant="h6">Status history</Typography>
    {entries.map(entry => <Paper key={entry.history_id} variant="outlined" sx={{p: 1}}>
      <Typography>{entry.previous_status ? `${entry.previous_status} → ` : ""}{entry.new_status} · {new Date(entry.changed_on).toLocaleString()}</Typography>
      {staff && "reason_code" in entry && "change_source" in entry && "changed_by" in entry && "reason_notes" in entry && <Typography>
        {String(entry.reason_code)} · {String(entry.change_source)} · {String(entry.changed_by || "System")}
        {entry.reason_notes ? ` · ${entry.reason_notes}` : ""}
      </Typography>}
    </Paper>)}
  </Stack>;
}
