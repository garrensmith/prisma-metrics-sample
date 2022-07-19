# Prisma Metrics and Tracing sample application

This application provides a basic setup to try out metrics and tracing in Prisma.
The application is a small webserver that has two endpoints.

- `/` - the default runs a query to create a user and a post. - Then a query to get all users.

- `/many` - an endpoint that runs lots of adhoc queries with most of them in nested
  spans to give an overview of what that would look like

## Setup

To get this running, run:

```
docker compose up -d
```

This creates a postgresdb, graphite for statsd, Prometheus, Jaeger for tracing and Grafana. You'll also need to run:

```
npm install
```

To install Prisma and the other dependencies needed to run the demo server.

Migrate the db:

```
npx prisma migrate dev
```

Then seed the database:

```
node seed.js
```

At this point you can run the server:

```
npm run dev
```

In another terminal run:

```
ab -v 4 -c 10  -t 320 http://localhost:4000/
```

This will generate some activity. Stats will be sent to Statsd and Prometheus will scrape the `/metrics` endpoint.

Navigate to `http://localhost:3000` to view grafana. You might need to login user/password: `admin/admin`.
Then click on the dashboard. There should be a Statsd and a Prometheus dashboard that you can navigate to and view the metrics.

## Tracing

Navigate to `http://localhost:16686` to view the traces being generated. Select on the dropdown `prisma-sample-app` and click
find traces to view all of them. Clicking on them will give you a detailed view of each trace
