import 'dotenv/config';
import prisma from '../src/services/prisma.service';

async function main() {
  const docs = await prisma.document.findMany({ orderBy: { createdAt: 'desc' }, take: 20 });
  console.log(JSON.stringify(docs, null, 2));
  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  prisma.$disconnect();
  process.exit(1);
});
