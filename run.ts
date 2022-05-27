import { PrismaClient } from "@prisma/client";
import { inspect } from "util";
import axios from "axios";
import express, { Request, Response } from "express";

const prisma = new PrismaClient({
  log: ["info", "error", "query", "warn"],
  __internal: {
    engine: {
      endpoint: "http://127.0.0.1:4466",
    },
  },
} as any);

let main = async () => {
  //   await prisma.user.upsert({
  //       create: {name: "bob", id: "user-bob"},
  //       update: {id: "user-bob-2"},
  //       where: {id: "user-bob"},
  //   })

  await prisma.$executeRaw`SELECT pg_sleep(0.5)`;
  // let res = await axios.get("http://127.0.0.1:4466/metrics?format=json");
  let res = await axios({
    method: "GET",
    url: "http://127.0.0.1:4466/metrics?format=json",
    data: {
      labelOne: "Fred",
      another_label: "Flintstone",
    },
  });

  console.log("JSON - metrics", inspect(res.data, false, null, true));

  // let res2 = await axios.get("http://127.0.0.1:4466/metrics");
  let res2 = await axios({
    method: "GET",
    url: "http://127.0.0.1:4466/metrics",
    data: {
      labelOne: "Fred",
      another_label: "Flintstone",
    },
  });
  console.log("Prometheus - metrics", inspect(res2.data, false, null, true));
};

main()
  .then(() => console.log("done"))
  .catch((err) => console.error(err));

// let metrics = prisma.$metrics({
//   globalLabels: {
//     app: "web-app-one",
//     db: "postgres1",
//   },
//   format: "json" | "prometheus",
// });

let m2 = {
  counters: [
    {
      key: "query_total_operations",
      labels: {},
      value: 420667,
      description: "The total number of operations executed",
    },
    {
      key: "query_total_queries",
      labels: {},
      value: 499245,
      description: "The total number of queries executed",
    },
  ],
  gauges: [
    {
      key: "pool_active_connections",
      labels: {},
      value: 0,
      description: "The number of active connections in use",
    },
    {
      key: "pool_idle_connections",
      labels: {},
      value: 21,
      description: "The number of connections that are not being used",
    },
    {
      key: "pool_wait_count",
      labels: {},
      value: 12,
      description: "The number of workers waiting for a connection",
    },
    {
      key: "query_active_transactions",
      labels: {},
      value: 0,
      description: "The number of active transactions",
    },
  ],
  histograms: [
    {
      key: "pool_wait_duration",
      labels: {},
      value: {
        buckets: [
          [0, 0],
          [1, 22128],
          [5, 23627],
          [10, 29630],
          [50, 94171],
          [100, 115077],
          [500, 413141],
          [1000, 425811],
          [5000, 425844],
          [50000, 425844],
        ],
        sum: 108187058.72382092,
        count: 425844,
      },
      description: "The wait time for a worker to get a connection.",
    },
    {
      key: "query_total_elapsed_time",
      labels: {},
      value: {
        buckets: [
          [0, 0],
          [1, 2942],
          [5, 381814],
          [10, 421509],
          [50, 456083],
          [100, 468723],
          [500, 494064],
          [1000, 494069],
          [5000, 499245],
          [50000, 499245],
        ],
        sum: 12756438.839113984,
        count: 499245,
      },
      description: "The execution time for all queries executed",
    },
  ],
};
