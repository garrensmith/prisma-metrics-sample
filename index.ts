import { PrismaClient } from "@prisma/client";
import { inspect } from "util";
import express, { request, Request, response, Response } from "express";
import { trace } from "@opentelemetry/api";
import { otelSetup } from "./otel";
import { statsDSetup } from "./statsd";
import { v4 as uuid } from "uuid";

const app = express();
const port = 4000;

otelSetup();

const tracer = trace.getTracer("Application");

const prisma = new PrismaClient({
  // log: ["info", "error", "query", "warn"],
  // __internal: {
  //   engine: {
  //     endpoint: "http://127.0.0.1:4466",
  //   },
  // },
});

statsDSetup(prisma);

app.get("/", async (_req: Request, res: Response) => {
  await tracer.startActiveSpan("simple-query", async (span) => {
    try {
      let posts = [];
      posts.push({
        id: uuid(),
        description: uuid(),
      });

      await prisma.user.create({
        data: {
          id: `user-${Date.now()}`,
          name: `name-${Date.now()}`,
          posts: {
            create: posts,
          },
        },
      });
      let users = await prisma.user.findMany();
      res.status(200).json(users);
      span.setAttribute("http.status", 200);
    } catch (e) {
      span.setAttribute("http.status", 500);
      res.status(500).json({ error: 500, details: e });
    } finally {
      span.end();
    }
  });
});

app.get("/many", async (_req: Request, res: Response) => {
  tracer.startActiveSpan("lots-of-nested-queries", async (span) => {
    try {
      let users = await prisma.user.findMany();

      // let promises = users.map(({ id }) =>
      //   prisma.post.count({ where: { userId: id } })
      // );

      // let results = await Promise.all(promises);
      await tracer.startActiveSpan("raw-sleep", async (span) => {
        try {
          let r1 = prisma.$executeRaw`SELECT pg_sleep(1);`;
          let r2 = prisma.$executeRaw`SELECT pg_sleep(0.3);`;
          await Promise.allSettled([r1, r2]);
        } finally {
          span.end();
        }
      });

      await tracer.startActiveSpan("upsert", async (span) => {
        try {
          await prisma.user.upsert({
            create: { name: "bob", id: "user-bob" },
            update: { name: "hello - bob" },
            where: { id: "user-bob" },
          });
        } finally {
          span.end();
        }
      });
      let results = await tracer.startActiveSpan("itx", async (span) => {
        try {
          let p1 = prisma
            .$transaction(
              async (tx) => {
                await tx.$executeRaw`SELECT pg_sleep(0.1);`;
              },
              { timeout: 30000 }
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
        } finally {
          span.end();
        }
      });

      res.status(200).json({ count: results });
    } catch (e) {
      console.log("ERR", e);
      res.status(500).json(e);
    } finally {
      span.end();
    }
  });
});

app.get("/metrics", async (_req, res: Response) => {
  try {
    res.set("Content-Type", "text");
    await prisma.$connect();
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
