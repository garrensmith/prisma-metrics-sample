const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
const u = require("uuid");

let uuid = u.v4;

const random = (min, max) => {
  return Math.floor(Math.random() * (max - min + 1)) + min;
};

async function main() {
  // Create 75 users
  for (let i = 0; i < 75; i++) {
    const posts = [];
    // Every user has between 0 and 50 posts
    for (let k = 0; k < 50; k++) {
      posts.push({
        id: uuid(),
        description: random(11111, 99999).toString(),
      });
    }
    // create user with posts
    await prisma.user.create({
      data: {
        id: `user-${i}`,
        name: random(11111, 99999).toString(),
        posts: {
          create: posts,
        },
      },
    });
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
