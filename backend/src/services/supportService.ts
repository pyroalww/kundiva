import PQueue from 'p-queue';

import { logger } from '../utils/logger';
import { prisma } from '../utils/prisma';
import { aiService } from './aiService';
import { usageService } from './usageService';

const supportQueue = new PQueue({
  concurrency: 1,
  interval: 1_500,
  intervalCap: 1,
  timeout: 90_000,
  throwOnTimeout: true
});

const FAQS = [
  {
    question: 'Kundiva hangi proje kapsamında geliştirildi?',
    answer:
      'Kundiva, Şeyh İsa Anadolu Lisesi tarafından TÜBİTAK 4006 Bilim Fuarı kapsamında hayata geçirilmiştir.'
  },
  {
    question: 'Yazılım ekibinde kimler yer alıyor?',
    answer: 'Yazılım geliştirme ekibi Çağan DOĞAN ve Ömer BÜKE tarafından oluşturulmuştur.'
  },
  {
    question: 'Canlı destek nasıl çalışıyor?',
    answer:
      'Canlı destek istekleri güvenli bir kuyruğa alınır ve yanıtlar Gemini Flash Lite modeli tarafından hazırlanır. Sıranız geldiğinde bot yanıtı otomatik olarak görürsünüz.'
  },
  {
    question: 'Dosya yüklerken sınırlar nelerdir?',
    answer:
      'Görsel dosyaları 20 MB, video dosyaları ise 100 MB sınırındadır. Büyük videolar sistem tarafından otomatik olarak sıkıştırılır.'
  }
];

const SUPPORT_INFO = {
  project: 'Şeyh İsa Anadolu Lisesi TÜBİTAK 4006 Projesi',
  softwareTeam: 'Yazılım: Çağan DOĞAN ve Ömer BÜKE',
  description:
    'Kundiva, öğrencilerin sorularını güvenli ve düzenli bir şekilde öğretmenlere iletmesini sağlayan bir eğitim destek platformudur.'
};

type SenderType = 'USER' | 'BOT';

const formatConversation = (messages: Array<{ senderType: SenderType; content: string }>) =>
  messages
    .map((message) => {
      const prefix = message.senderType === 'USER' ? 'Kullanıcı' : 'Destek Botu';
      return `${prefix}: ${message.content}`;
    })
    .join('\n');

const getOrCreateTicket = async (userId: string) => {
  const existing = await prisma.supportTicket.findFirst({
    where: {
      userId,
      status: 'OPEN'
    }
  });

  if (existing) {
    return existing;
  }

  return prisma.supportTicket.create({
    data: {
      userId,
      status: 'OPEN',
      subject: 'Kundiva Canlı Destek'
    }
  });
};

const fetchMessages = async (ticketId: string) =>
  prisma.supportMessage.findMany({
    where: { ticketId },
    orderBy: { createdAt: 'asc' }
  });

export const supportService = {
  getStaticContent: () => ({
    info: SUPPORT_INFO,
    faqs: FAQS
  }),
  getActiveSession: async (userId: string) => {
    const ticket = await prisma.supportTicket.findFirst({
      where: { userId, status: 'OPEN' },
      orderBy: { createdAt: 'desc' }
    });

    if (!ticket) {
      return null;
    }

    const messages = await fetchMessages(ticket.id);
    return {
      ticket,
      messages
    };
  },
  enqueueMessage: async (params: { userId: string; content: string }) => {
    const ticket = await getOrCreateTicket(params.userId);

    const created = await prisma.supportMessage.create({
      data: {
        ticketId: ticket.id,
        senderType: 'USER',
        content: params.content
      }
    });

    await prisma.supportTicket.update({
      where: { id: ticket.id },
      data: { updatedAt: new Date() }
    });

    void usageService.log('SUPPORT_MESSAGE', {
      ticketId: ticket.id,
      sender: 'USER'
    });

    const currentQueueLength = supportQueue.size + supportQueue.pending + 1;
    const jobContext = logger.withContext({
      ticketId: ticket.id,
      messageId: created.id,
      queueLength: currentQueueLength
    });

    try {
      const response = await supportQueue.add(async () => {
        const history = await fetchMessages(ticket.id);
        const conversation = formatConversation(
          history.map((item) => ({
            senderType: item.senderType as SenderType,
            content: item.content
          }))
        );

        jobContext.info('Destek botu için yanıt hazırlanıyor');

        const botAnswer = await aiService.generateSupportResponse(
          conversation,
          currentQueueLength > 1 ? 'rate-limit' : 'normal'
        );

        const botMessage = await prisma.supportMessage.create({
          data: {
            ticketId: ticket.id,
            senderType: 'BOT',
            content: botAnswer
          }
        });

        await prisma.supportTicket.update({
          where: { id: ticket.id },
          data: { updatedAt: new Date() }
        });

        void usageService.log('SUPPORT_MESSAGE', {
          ticketId: ticket.id,
          sender: 'BOT'
        });

        jobContext.info('Destek botu yanıtı oluşturuldu', { botMessageId: botMessage.id });

        return botMessage;
      });

      const messages = await fetchMessages(ticket.id);

      return {
        ticketId: ticket.id,
        queuePosition: Math.max(currentQueueLength - 1, 0),
        response: response,
        messages
      };
    } catch (error) {
      jobContext.error('Destek yanıtı oluşturulamadı', { error });

      const fallbackMessage =
        'Şu anda beklenmeyen bir hata yaşandı. Ekibimiz en kısa sürede sizinle iletişime geçecek.';

      const botMessage = await prisma.supportMessage.create({
        data: {
          ticketId: ticket.id,
          senderType: 'BOT',
          content: fallbackMessage
        }
      });

      return {
        ticketId: ticket.id,
        queuePosition: currentQueueLength,
        response: botMessage,
        messages: await fetchMessages(ticket.id)
      };
    }
  }
};
