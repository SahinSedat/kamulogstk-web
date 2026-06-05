const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
  const stks = await prisma.sTKOrganization.findMany({
    select: { id: true, name: true, logo: true, type: true }
  })
  console.log(JSON.stringify(stks, null, 2))
}

main()
  .catch(e => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
