const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const user = await prisma.user.findFirst({
    where: { phone: '905551234567' }
  });
  
  if (user) {
    await prisma.user.update({
      where: { id: user.id },
      data: {
        employmentType: '4/D Sürekli İşçi',
        email: 'apple-test@kamulog.net'
      }
    });
    console.log('User updated successfully!');
  } else {
    console.log('User not found.');
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
