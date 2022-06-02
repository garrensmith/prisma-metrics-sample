import { PrismaClient } from "@prisma/client";
import { inspect } from "util";
import axios from "axios";
import express, { Request, Response } from "express";
import StatsD from "hot-shots";

const app = express();
const port = 4000;

const prisma = new PrismaClient({
  log: ["info", "error", "query", "warn"],
});

let statsd = new StatsD({
  port: 8125,
});

let diffMetrics = (metrics: any) => {
  return metrics.map((metric: any) => {
    let prev = 0;
    let diffBuckets = metric.value.buckets.map((values: any) => {
      let [bucket, value] = values;
      let diff = value - prev;
      prev = value;
      return [bucket, diff];
    });
    metric.value.buckets = diffBuckets;
    return metric;
  });
};

let previousHistograms: any = null;
let statsdSender = async () => {
  let metrics = await prisma.$metrics.json();

  metrics.counters.forEach((counter: any) => {
    statsd.gauge("prisma." + counter.key, counter.value, (...res) => {});
  });

  metrics.gauges.forEach((counter: any) => {
    statsd.gauge("prisma." + counter.key, counter.value, (...res) => {});
  });

  if (previousHistograms === null) {
    previousHistograms = diffMetrics(metrics.histograms);
    return;
  }

  let diffHistograms = diffMetrics(metrics.histograms);

  diffHistograms.forEach((diffHistograms: any, histogramIndex: any) => {
    diffHistograms.value.buckets.forEach((values: any, bucketIndex: any) => {
      let [bucket, count] = values;
      let [_, prev] =
        previousHistograms[histogramIndex].value.buckets[bucketIndex];
      let change = count - prev;

      for (let sendTimes = 0; sendTimes < change; sendTimes++) {
        statsd.timing("prisma." + diffHistograms.key, bucket);
      }
    });
  });

  previousHistograms = diffHistograms;
};

setInterval(async () => await statsdSender(), 10000);

app.get("/", async (_req: Request, res: Response) => {
  try {
    let users = await prisma.user.findMany();

    let promises = users.map(({ id }) =>
      prisma.post.count({ where: { userId: id } })
    );

    let results = await Promise.all(promises);
    let r1 = prisma.$executeRaw`SELECT pg_sleep(1);`;
    let r2 = prisma.$executeRaw`SELECT pg_sleep(0.3);`;
    await Promise.allSettled([r1, r2]);

    await prisma.user.upsert({
      create: { name: "bob", id: "user-bob" },
      update: { name: "hello - bob" },
      where: { id: "user-bob" },
    });

    let p1 = prisma
      .$transaction(
        async (tx) => {
          await tx.$executeRaw`SELECT pg_sleep(0.3);`;
        },
        { timeout: 50000 }
      )
      .catch((err) => {
        console.log("tx err", err);
      });

    let p2 = prisma.user.findMany({
      include: {
        posts: true,
      },
    });

    await Promise.allSettled([p1, p2]);
    res.status(200).json({ count: results });
  } catch (e) {
    console.log("ERR", e);
    res.status(500).json(e);
  }
});

app.get("/metrics", async (_req, res: Response) => {
  try {
    res.set("Content-Type", "text");
    let metrics = await prisma.$metrics.prometheus();
    res.end(metrics);
  } catch (ex) {
    console.log("export error", ex);
    res.status(500).end(ex);
  }
});

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`);
});
