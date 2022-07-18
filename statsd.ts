import { PrismaClient } from "@prisma/client";
import StatsD from "hot-shots";

export function statsDSetup(prisma: PrismaClient) {
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
}
