import test, { after } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { randomUUID } from "node:crypto";
const { PGlite } = await import(
  process.env.PGLITE_MODULE || "@electric-sql/pglite"
);
const sql = (path) => readFileSync(new URL(path, import.meta.url), "utf8");
const customer = "11111111-1111-4111-8111-111111111111",
  staff = "22222222-2222-4222-8222-222222222222";
const item = "33333333-3333-4333-8333-333333333333";
const shared = new PGlite();
await shared.exec(sql("./fixtures/order_base.sql"));
await shared.exec(sql("../migrations/20261027000000_order_reservations.sql"));
after(() => shared.close());
async function setup() {
  const db = shared;
  await db.exec(
    'reset role; truncate order_private.requests,order_status_history,stock_reservation,order_details,"order",customer,stock,item restart identity cascade',
  );
  await db.query(
    "insert into item(item_id,item_name,sale_price) values($1,$2,20)",
    [item, "Dress"],
  );
  await db.query(
    "insert into stock(item_id,quantity_at_hand,cost_price,batch_number) values($1,4,5,$2),($1,6,8,$3)",
    [item, "A", "B"],
  );
  return db;
}
async function actor(db, id, role = "customer") {
  await db.exec("reset role");
  await db.query(
    "select set_config('request.jwt.claim.sub',$1,false),set_config('request.jwt.claims',$2,false)",
    [id, JSON.stringify({ user_role: role })],
  );
  await db.exec("set role authenticated");
}
const lines = (quantity = 3, price = 20) =>
  JSON.stringify([{ item_id: item, quantity, sale_price: price }]);
async function online(db, quantity = 3, key = randomUUID(), price = 20) {
  return (
    await db.query("select create_online_order($1::jsonb,$2::uuid) id", [
      lines(quantity, price),
      key,
    ])
  ).rows[0].id;
}
async function totals(db) {
  await db.exec("reset role");
  return (
    await db.query(
      "select sum(quantity_at_hand)::int physical,sum(quantity_reserved)::int reserved from stock",
    )
  ).rows[0];
}
async function change(db, id, status, reason = "Test decline") {
  return (
    await db.query("select update_order_status($1,$2,$3) result", [
      id,
      status,
      reason,
    ])
  ).rows[0].result;
}
async function age(db, id) {
  await db.exec("reset role");
  await db.query(
    "update public.\"order\" set expected_expiry_date=clock_timestamp()-interval '1 second' where order_id=$1",
    [id],
  );
}

test("online identity, multi-batch reservations and server idempotency", async () => {
  const db = await setup();
  try {
    await actor(db, customer);
    const key = randomUUID(),
      id = await online(db, 7, key);
    assert.equal(await online(db, 7, key), id);
    assert.deepEqual(await totals(db), { physical: 10, reserved: 7 });
    const o = (await db.query('select * from "order"')).rows[0];
    assert.equal(o.customer_id, customer);
    assert.equal(o.added_by, customer);
    assert.equal(o.order_origin, "online");
    assert.ok(
      new Date(o.expected_expiry_date) - new Date(o.added_on) >=
        12 * 3600000 - 100,
    );
    assert.equal(
      (await db.query("select * from stock_reservation")).rows.length,
      2,
    );
    await actor(db, customer);
    await assert.rejects(() => online(db, 6, key), /different order/);
    await assert.rejects(() => change(db, id, "processed"), /Staff permission/);
  } finally {
    await db.exec("reset role");
  }
});

test("all discrepancies reject atomically; cleanup rolls back with a rejected checkout", async () => {
  const db = await setup();
  try {
    await actor(db, customer);
    const old = await online(db, 8);
    await age(db, old);
    await actor(db, customer);
    await assert.rejects(
      () => online(db, 9, randomUUID(), 19),
      (e) => JSON.parse(e.detail).some((i) => i.code === "PRICE_CHANGED"),
    );
    assert.deepEqual(await totals(db), { physical: 10, reserved: 8 });
    assert.equal(
      (
        await db.query('select order_status from "order" where order_id=$1', [
          old,
        ])
      ).rows[0].order_status,
      "received",
    );
    await actor(db, customer);
    await online(db, 9);
    assert.deepEqual(await totals(db), { physical: 10, reserved: 9 });
    assert.equal(
      (
        await db.query('select order_status from "order" where order_id=$1', [
          old,
        ])
      ).rows[0].order_status,
      "declined",
    );
  } finally {
    await db.exec("reset role");
  }
});

test("online transitions, shipped decline, and repeated delivery never double-deduct", async () => {
  const db = await setup();
  try {
    await actor(db, customer);
    const id = await online(db);
    await actor(db, staff, "staff");
    await assert.rejects(() => change(db, id, "delivered"), /Invalid order/);
    await change(db, id, "processed");
    await change(db, id, "shipped");
    await change(db, id, "delivered");
    await change(db, id, "delivered");
    assert.deepEqual(await totals(db), { physical: 7, reserved: 0 });
    await actor(db, staff, "staff");
    await assert.rejects(() => change(db, id, "declined"), /Invalid order/);
    await actor(db, customer);
    const second = await online(db, 2);
    await actor(db, staff, "staff");
    await change(db, second, "processed");
    await change(db, second, "shipped");
    await change(db, second, "declined");
    assert.deepEqual(await totals(db), { physical: 7, reserved: 0 });
    assert.equal(
      (
        await db.query(
          "select count(*)::int n from order_status_history where order_id=$1 and new_status='delivered'",
          [id],
        )
      ).rows[0].n,
      1,
    );
  } finally {
    await db.exec("reset role");
  }
});

test("staff selects existing customer; cash sale bypasses processing/shipping", async () => {
  const db = await setup();
  try {
    await actor(db, customer);
    await assert.rejects(
      () =>
        db.query("select create_staff_order($1,$2::jsonb,$3)", [
          customer,
          lines(),
          randomUUID(),
        ]),
      /Staff permission/,
    );
    await actor(db, staff, "staff");
    await assert.rejects(
      () =>
        db.query("select create_staff_order($1,$2::jsonb,$3)", [
          customer,
          lines(),
          randomUUID(),
        ]),
      /existing active customer/,
    );
    const cid = (await db.query("select save_customer('Walk','In') id")).rows[0]
      .id;
    const id = (
      await db.query("select create_staff_order($1,$2::jsonb,$3) id", [
        cid,
        lines(),
        randomUUID(),
      ])
    ).rows[0].id;
    await assert.rejects(() => change(db, id, "processed"), /Invalid order/);
    await change(db, id, "delivered");
    assert.deepEqual(await totals(db), { physical: 7, reserved: 0 });
    const row = (
      await db.query(
        'select customer_id,added_by from "order" where order_id=$1',
        [id],
      )
    ).rows[0];
    assert.equal(row.customer_id, cid);
    assert.equal(row.added_by, staff);
  } finally {
    await db.exec("reset role");
  }
});

test("expiry is received-only; expiry during a staff action commits its audit and release", async () => {
  const db = await setup();
  try {
    await actor(db, customer);
    const expired = await online(db, 3);
    const processed = await online(db, 2);
    await actor(db, staff, "staff");
    await change(db, processed, "processed");
    await age(db, expired);
    await age(db, processed);
    await actor(db, staff, "staff");
    assert.equal((await change(db, expired, "processed")).outcome, "expired");
    assert.deepEqual(await totals(db), { physical: 10, reserved: 2 });
    assert.equal(
      (
        await db.query('select order_status from "order" where order_id=$1', [
          processed,
        ])
      ).rows[0].order_status,
      "processed",
    );
    assert.equal(
      (await db.query("select order_private.expire_received_orders() n"))
        .rows[0].n,
      0,
    );
  } finally {
    await db.exec("reset role");
  }
});

test("permissions prevent bypasses and hide other customers orders and staff notes", async () => {
  const db = await setup();
  try {
    await actor(db, customer);
    const id = await online(db, 2);
    await assert.rejects(
      () =>
        db.query(
          "update public.\"order\" set order_status='delivered' where order_id=$1",
          [id],
        ),
      /permission denied/,
    );
    await assert.rejects(
      () => db.query("update order_details set quantity_sold=999"),
      /permission denied/,
    );
    await assert.rejects(
      () => db.query("select order_private.expire_received_orders()"),
      /permission denied/,
    );
    await assert.rejects(
      () => db.query("select * from stock_reservation"),
      /permission denied/,
    );
    assert.equal(
      (await db.query("select * from order_status_history")).rows.length,
      0,
    );
    await actor(db, staff, "staff");
    await assert.rejects(
      () => db.exec("update stock set quantity_reserved=0"),
      /Reservations must/,
    );
    await actor(db, randomUUID());
    assert.equal((await db.query('select * from "order"')).rows.length, 0);
    await assert.rejects(
      () => db.query("select get_order_timeline($1)", [id]),
      /access denied/,
    );
    await actor(db, customer);
    const events = await db.query("select * from get_order_timeline($1)", [id]);
    assert.equal(events.rows.length, 1);
    assert.ok(!("changed_by" in events.rows[0]));
  } finally {
    await db.exec("reset role");
  }
});

test("invalid inputs and insufficient stock leave no orders or history", async () => {
  const db = await setup();
  try {
    await actor(db, customer);
    await assert.rejects(
      () => online(db, 11),
      (e) => e.detail.includes("INSUFFICIENT_STOCK"),
    );
    await assert.rejects(() => online(db, 0), /Invalid items/);
    await assert.rejects(
      () =>
        db.query("select create_online_order($1::jsonb,$2)", [
          JSON.stringify([
            { item_id: item, quantity: 1, sale_price: 20 },
            { item_id: item, quantity: 1, sale_price: 20 },
          ]),
          randomUUID(),
        ]),
      /Duplicate items/,
    );
    assert.deepEqual(await totals(db), { physical: 10, reserved: 0 });
    assert.equal(
      (await db.query('select count(*)::int n from "order"')).rows[0].n,
      0,
    );
    assert.equal(
      (await db.query("select count(*)::int n from order_status_history"))
        .rows[0].n,
      0,
    );
  } finally {
    await db.exec("reset role");
  }
});

test("on-demand expiry drains more than one batch and preserves reservation totals", async () => {
  const db = await setup();
  try {
    await db.exec("update stock set quantity_at_hand=200");
    await actor(db, customer);
    for (let n = 0; n < 101; n++) await online(db, 1);
    await db.exec(
      "reset role; update public.\"order\" set expected_expiry_date=clock_timestamp()-interval '1 second'",
    );
    await actor(db, customer);
    await online(db, 4);
    assert.deepEqual(await totals(db), { physical: 400, reserved: 4 });
    assert.equal(
      (
        await db.query(
          "select count(*)::int n from public.\"order\" where order_status='declined'",
        )
      ).rows[0].n,
      101,
    );
    assert.equal(
      (
        await db.query(
          "select count(*)::int n from stock st where st.quantity_reserved <> (select coalesce(sum(sr.quantity_reserved),0) from stock_reservation sr where sr.stock_id=st.stock_id and sr.reservation_status='active')",
        )
      ).rows[0].n,
      0,
    );
  } finally {
    await db.exec("reset role");
  }
});

test("anonymous calls cannot create orders", async () => {
  const db = await setup();
  try {
    await actor(db, "");
    await assert.rejects(() => online(db), /Authentication required/);
    await db.exec("reset role");
    await db.query(
      "select set_config('request.jwt.claim.sub',$1,false),set_config('request.jwt.claims',$2,false)",
      [customer, JSON.stringify({ is_anonymous: true })],
    );
    await db.exec("set role authenticated");
    await assert.rejects(() => online(db), /Authentication required/);
  } finally {
    await db.exec("reset role");
  }
});
