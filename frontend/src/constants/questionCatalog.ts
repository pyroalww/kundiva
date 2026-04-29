export const COURSE_OPTIONS = [
  'Matematik',
  'Fizik',
  'Kimya',
  'Biyoloji',
  'Türk Dili ve Edebiyatı',
  'Tarih',
  'Coğrafya',
  'Felsefe',
  'İngilizce',
  'Din Kültürü ve Ahlak Bilgisi',
  'Bilgisayar Bilimi',
  'Rehberlik'
];

export const COURSE_TO_BRANCH: Record<string, string> = {
  Matematik: 'Sayısal',
  Fizik: 'Fen Bilimleri',
  Kimya: 'Fen Bilimleri',
  Biyoloji: 'Fen Bilimleri',
  'Türk Dili ve Edebiyatı': 'Sözel',
  Tarih: 'Sözel',
  Coğrafya: 'Sözel',
  Felsefe: 'Sosyal Bilimler',
  İngilizce: 'Yabancı Dil',
  'Din Kültürü ve Ahlak Bilgisi': 'Din Kültürü',
  'Bilgisayar Bilimi': 'Teknoloji',
  Rehberlik: 'Sosyal Beceriler'
};

export const COURSE_TO_CATEGORY: Record<string, string> = {
  Matematik: 'Akademik',
  Fizik: 'Akademik',
  Kimya: 'Akademik',
  Biyoloji: 'Akademik',
  'Türk Dili ve Edebiyatı': 'Dil & İletişim',
  Tarih: 'Sınav Hazırlık',
  Coğrafya: 'Sınav Hazırlık',
  Felsefe: 'Sosyal Bilimler',
  İngilizce: 'Dil & İletişim',
  'Din Kültürü ve Ahlak Bilgisi': 'Değerler Eğitimi',
  'Bilgisayar Bilimi': 'Proje & Ödev',
  Rehberlik: 'Sosyal Beceriler'
};

export const BRANCH_OPTIONS = [
  'Sayısal',
  'Fen Bilimleri',
  'Sözel',
  'Eşit Ağırlık',
  'Sosyal Bilimler',
  'Yabancı Dil',
  'Din Kültürü',
  'Teknoloji',
  'Sosyal Beceriler'
];

export const CATEGORY_OPTIONS = [
  'Akademik',
  'Sınav Hazırlık',
  'Proje & Ödev',
  'Dil & İletişim',
  'Değerler Eğitimi',
  'Sosyal Beceriler',
  'STEM Atölye',
  'Kariyer & Rehberlik'
];

export const LEVEL_OPTIONS = [
  '1. Sınıf',
  '2. Sınıf',
  '3. Sınıf',
  '4. Sınıf',
  '5. Sınıf',
  '6. Sınıf',
  '7. Sınıf',
  '8. Sınıf',
  '9. Sınıf',
  '10. Sınıf',
  '11. Sınıf',
  '12. Sınıf',
  'Mezun'
];

export const TOPIC_LIBRARY: Record<string, string[]> = {
  Matematik: ['Fonksiyonlar', 'Limit ve Süreklilik', 'Türev', 'İntegral', 'Parabol', 'Olasılık'],
  Fizik: ['Kuvvet ve Hareket', 'Elektrik', 'Modern Fizik', 'Dalgalar', 'Optik'],
  Kimya: ['Kimyasal Tepkimeler', 'Organik Kimya', 'Asit Baz', 'Kimya ve Enerji'],
  Biyoloji: ['Hücre', 'Genetik', 'Ekosistem', 'İnsan Fizyolojisi'],
  'Türk Dili ve Edebiyatı': ['Şiir İncelemesi', 'Roman/Öykü', 'Dil Bilgisi', 'Söz Sanatları'],
  Tarih: ['Kurtuluş Savaşı', 'Osmanlı Tarihi', 'İnkılap Tarihi', 'Çağdaş Türk ve Dünya Tarihi'],
  Coğrafya: ['Doğa ve İnsan', 'Nüfus ve Yerleşme', 'Harita Bilgisi', 'İklim Bilgisi'],
  Felsefe: ['Bilgi Felsefesi', 'Varlık Felsefesi', 'Etik', 'Siyaset Felsefesi'],
  İngilizce: ['Grammar', 'Reading Comprehension', 'Essay Writing', 'Vocabulary'],
  'Din Kültürü ve Ahlak Bilgisi': ['İslamda Ahlak', 'Peygamberimizin Hayatı', 'İbadetler', 'Dinler Tarihi'],
  'Bilgisayar Bilimi': ['Algoritma Tasarımı', 'Programlama', 'Veri Yapıları', 'Yapay Zeka'],
  Rehberlik: ['Sınav Kaygısı', 'Zaman Yönetimi', 'Kariyer Planlama', 'Sosyal İletişim']
};

export const ALL_TOPIC_OPTIONS = Array.from(
  new Set(Object.values(TOPIC_LIBRARY).flat())
).sort((a, b) => a.localeCompare(b));

export const getTopicsForCourse = (course?: string) => {
  if (course && TOPIC_LIBRARY[course]) {
    return TOPIC_LIBRARY[course];
  }
  return ALL_TOPIC_OPTIONS;
};
