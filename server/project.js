export default function ({
  db,
  router,
  run,
  get,
  all,
  tx,
  id,
  now,
  text,
  integer,
  choice,
  required,
}) {
  db.exec(`CREATE TABLE IF NOT EXISTS subscriptions(id TEXT PRIMARY KEY,owner TEXT NOT NULL REFERENCES users(id),customer TEXT NOT NULL,amount INTEGER NOT NULL CHECK(amount>0),interval TEXT NOT NULL CHECK(interval IN ('month','year')),active INTEGER NOT NULL DEFAULT 1);
 CREATE TABLE IF NOT EXISTS invoices(id TEXT PRIMARY KEY,subscription_id TEXT REFERENCES subscriptions(id),period TEXT NOT NULL,amount INTEGER NOT NULL,status TEXT NOT NULL DEFAULT 'open',UNIQUE(subscription_id,period));
 CREATE TABLE IF NOT EXISTS events(event_id TEXT PRIMARY KEY,invoice_id TEXT REFERENCES invoices(id),created_at TEXT NOT NULL);`);
  router.get("/subscriptions", (req, res) =>
    res.json(all("SELECT * FROM subscriptions WHERE owner=?", req.user.id)),
  );
  router.post("/subscriptions", (req, res) => {
    const sid = id();
    run(
      "INSERT INTO subscriptions VALUES(?,?,?,?,?,1)",
      sid,
      req.user.id,
      text(req.body.customer),
      integer(req.body.amount, 1),
      choice(req.body.interval, ["month", "year"]),
    );
    res.status(201).json({ id: sid });
  });
  router.patch("/subscriptions/:id", (req, res) => {
    required(
      get(
        "SELECT id FROM subscriptions WHERE id=? AND owner=?",
        req.params.id,
        req.user.id,
      ),
    );
    run(
      "UPDATE subscriptions SET active=? WHERE id=?",
      req.body.active === true ? 1 : 0,
      req.params.id,
    );
    res.json({ ok: true });
  });
  router.post("/invoices", (req, res) => {
    const s = required(
      get(
        "SELECT * FROM subscriptions WHERE id=? AND owner=?",
        req.body.subscriptionId,
        req.user.id,
      ),
    );
    const period = text(req.body.period, 7);
    if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(period))
      return res.status(422).json({ error: "YYYY-AA dönemi gerekli" });
    const iid = id();
    run(
      "INSERT INTO invoices(id,subscription_id,period,amount) VALUES(?,?,?,?)",
      iid,
      s.id,
      period,
      s.amount,
    );
    res.status(201).json({ id: iid });
  });
  router.get("/invoices", (req, res) =>
    res.json(
      all(
        "SELECT i.*,s.customer FROM invoices i JOIN subscriptions s ON s.id=i.subscription_id WHERE s.owner=? ORDER BY i.period DESC",
        req.user.id,
      ),
    ),
  );
  router.post("/payment-events", (req, res) => {
    const invoice = required(
      get(
        "SELECT i.id FROM invoices i JOIN subscriptions s ON s.id=i.subscription_id WHERE i.id=? AND s.owner=?",
        req.body.invoiceId,
        req.user.id,
      ),
    );
    const event = text(req.body.eventId);
    const result = tx(() => {
      if (get("SELECT event_id FROM events WHERE event_id=?", event))
        return { applied: false };
      run("INSERT INTO events VALUES(?,?,?)", event, invoice.id, now());
      run("UPDATE invoices SET status='paid' WHERE id=?", invoice.id);
      return { applied: true };
    });
    res.json(result);
  });
  router.get("/summary", (req, res) => {
    const rows = all(
      "SELECT amount,interval FROM subscriptions WHERE owner=? AND active=1",
      req.user.id,
    );
    res.json({
      active: rows.length,
      mrr: Math.round(
        rows.reduce(
          (n, s) => n + s.amount / (s.interval === "year" ? 12 : 1),
          0,
        ),
      ),
    });
  });
}
