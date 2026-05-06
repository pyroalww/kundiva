import { PrismaClient } from '@prisma/client';
import axios from 'axios';
import { v4 as uuidv4 } from 'uuid';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

const API_URL = process.env.API_URL || 'http://localhost:4000/api';
const NUM_STUDENTS = 10; // 10 öğrenci ile daha hızlı test
const QUESTIONS_PER_STUDENT = 2; // Toplam 20 soru

// Rastgele gecikme eklemek için fonksiyon
const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

async function setupTestUsers() {
  console.log('🔄 Test öğrencileri oluşturuluyor...');
  const users = [];
  const passwordHash = await bcrypt.hash('TestSifre123', 10);

  // Veritabanına doğrudan kayıt ekleyerek admin onayını ve rate limitleri aşıyoruz
  for (let i = 0; i < NUM_STUDENTS; i++) {
    const username = `test_ogr_${uuidv4().substring(0, 8)}`;
    process.stdout.write(`👤 ${i+1}/${NUM_STUDENTS} oluşturuluyor... `);
    const user = await prisma.user.create({
      data: {
        email: `${username}@kundiva.local`,
        username,
        passwordHash,
        firstName: 'Test',
        lastName: `Öğrenci ${i + 1}`,
        studentNumber: `100${i}`,
        role: 'STUDENT',
        profileCompleted: true,
        aiCredits: 50
      }
    });
    users.push(user);
    console.log('✅');
  }
  console.log(`\n✅ ${NUM_STUDENTS} adet test öğrencisi hazır.`);
  return users;
}

async function loginUsers(users: any[]) {
  console.log('🔄 Kullanıcılar giriş yapıyor...');
  const tokens = [];
  for (const user of users) {
    try {
      const res = await axios.post(`${API_URL}/auth/login`, {
        identifier: user.username,
        password: 'TestSifre123'
      });
      tokens.push(res.data.token);
    } catch (err: any) {
      console.error(`❌ Giriş hatası (${user.username}):`, err.response?.data?.message || err.message);
    }
  }
  console.log(`✅ ${tokens.length} kullanıcı başarıyla giriş yaptı.`);
  return tokens;
}

async function askQuestions(tokens: string[]) {
  console.log(`🔄 Aynı anda ${tokens.length * QUESTIONS_PER_STUDENT} adet soru gönderme işlemi başlatılıyor...`);
  const startTime = Date.now();
  let successCount = 0;
  let failCount = 0;

  const requests = [];

  for (const token of tokens) {
    for (let i = 0; i < QUESTIONS_PER_STUDENT; i++) {
      // Bir miktar rastgele asenkron gecikme (gerçek kullanıcı simülasyonu)
      const randomDelay = Math.floor(Math.random() * 1000);
      
      const reqPromise = sleep(randomDelay).then(() => {
        return axios.post(
          `${API_URL}/questions`,
          {
            firstName: 'Test',
            lastName: 'Öğrenci',
            studentNumber: '12345',
            category: 'Lise',
            title: `Stres Testi Sorusu ${uuidv4().substring(0, 5)}`,
            course: 'Matematik',
            subjectArea: 'Cebir',
            subjectName: 'Denklemler',
            educationLevel: 'Lise',
            questionText: 'Bu soru stres testi amacıyla otomatik olarak oluşturulmuştur. Lütfen dikkate almayınız.',
            useKundivaAi: false // AI API kotalarını tüketmemek için false
          },
          {
            headers: {
              Authorization: `Bearer ${token}`
            }
          }
        );
      }).then(() => {
        successCount++;
        process.stdout.write('🟢 ');
      }).catch((err) => {
        failCount++;
        process.stdout.write('🔴 ');
        const errMsg = err.response?.data?.message || err.message;
        console.log(`\n❌ Soru gönderme hatası: ${errMsg}`);
      });

      requests.push(reqPromise);
    }
  }

  await Promise.all(requests);
  const duration = (Date.now() - startTime) / 1000;
  console.log('\n\n📊 STRES TESTİ SONUÇLARI');
  console.log('------------------------');
  console.log(`⏱️  Geçen Süre: ${duration.toFixed(2)} saniye`);
  console.log(`✅ Başarılı İstek: ${successCount}`);
  console.log(`❌ Hatalı İstek: ${failCount}`);
  console.log(`⚡ Saniye Başına İstek (RPS): ${((successCount + failCount) / duration).toFixed(2)}`);
}

async function cleanupTestUsers(users: any[]) {
  console.log('\n🧹 Test verileri temizleniyor...');
  const userIds = users.map(u => u.id);
  
  // Önce ilişkili tabloları temizle (cascade fkey hatalarını önlemek için)
  const questions = await prisma.question.findMany({
    where: { studentId: { in: userIds } },
    select: { id: true }
  });
  const questionIds = questions.map(q => q.id);

  if (questionIds.length > 0) {
    await prisma.teacherQueue.deleteMany({
      where: { questionId: { in: questionIds } }
    });
    await prisma.question.deleteMany({
      where: { id: { in: questionIds } }
    });
  }

  // Kullanıcıları sil
  await prisma.user.deleteMany({
    where: { id: { in: userIds } }
  });
  console.log('✅ Temizlik tamamlandı.');
}

async function runTest() {
  console.log('🚀 KUNDIVA STRES TESTİ BAŞLATILIYOR...\n');
  let users = [];
  try {
    users = await setupTestUsers();
    const tokens = await loginUsers(users);
    
    // Küçük bir mola
    await sleep(1000);
    
    await askQuestions(tokens);
  } catch (error: any) {
    console.error('Test sırasında beklenmeyen bir hata oluştu:', error.message);
  } finally {
    if (users.length > 0) {
      await cleanupTestUsers(users);
    }
    await prisma.$disconnect();
    console.log('🏁 Test tamamlandı.');
  }
}

runTest();
