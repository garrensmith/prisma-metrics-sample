## Prisma Metrics sample application

To get this running, run:

```
docker compose up -d
```

This creats a postgresdb, graphite for statsd, Prometheus and Grafana. Then migrate the db:

```
npx prisma migrate dev
```

Then seed the database:

```
node seed.js
```

At this point you can run the server:

```
ts-node statsd.ts
```

In another terminal run:

```
ab -v 4 -c 10  -t 320 http://127.0.0.1:4000/
```

This will generate some activity. Stats will be sent to Statsd and Prometheus will scrape the `/metrics` endpoint.

Navigate to `http://localhost:3000` to view grafana. You might need to login user/password: `admin/admin`.
Then click on the dashboard. There should be a Statsd and a Prometheus dashboard.
