import { PrismaClient } from "@prisma/client";
import { inspect } from "util";
import axios from "axios";
import express, { Request, Response } from "express";
import StatsD from "hot-shots";

const app = express();
const port = 4000;

const prisma = new PrismaClient({
  log: ["info", "error", "query", "warn"],
  __internal: {
    engine: {
      endpoint: "http://127.0.0.1:4466",
    },
  },
} as any);

app.get("/", async (req: Request, res: Response) => {
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
    res.status(200).json({ count: results });
  } catch (e) {
    console.log("ERR", e);
    res.status(500).json(e);
  }
});

app.get("/metrics", async (_req, res: Response) => {
  try {
    // console.log("exporting");
    res.set("Content-Type", "text");
    let res2 = await axios.get("http://127.0.0.1:4466/metrics");
    res.end(res2.data);
  } catch (ex) {
    console.log("export error", ex);
    res.status(500).end(ex);
  }
});

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`);
});
