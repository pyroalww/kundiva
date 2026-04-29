import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('Resetting database...');

  // Delete all records in a logical order to avoid foreign key constraints
  await prisma.comment.deleteMany();
  await prisma.solutionVote.deleteMany();
  await prisma.studentSolution.deleteMany();
  await prisma.teacherQueue.deleteMany();
  await prisma.message.deleteMany();
  await prisma.friendship.deleteMany();
  await prisma.answerAttachment.deleteMany();
  await prisma.answer.deleteMany();
  await prisma.questionAttachment.deleteMany();
  await prisma.question.deleteMany();
  await prisma.user.deleteMany();

  console.log('Database cleared.');

  // Create admin user
  const hashedPassword = await bcrypt.hash('yonetici305', 10);
  await prisma.user.create({
    data: {
      username: 'yonetici',
      email: 'yonetici@kundiva.com',
      passwordHash: hashedPassword,
      firstName: 'Admin',
      lastName: 'User',
      role: 'ADMIN',
      profileCompleted: true
    }
  });

  console.log('Admin account created: yonetici / yonetici305');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
