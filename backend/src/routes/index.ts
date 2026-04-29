import { Router } from 'express';

import adminRoutes from './adminRoutes';
import authRoutes from './authRoutes';
import commentRoutes from './commentRoutes';
import friendRoutes from './friendRoutes';
import messageRoutes from './messageRoutes';
import publicRoutes from './publicRoutes';
import questionRoutes from './questionRoutes';
import supportRoutes from './supportRoutes';
import teacherRoutes from './teacherRoutes';

const router = Router();

router.use('/auth', authRoutes);
router.use('/questions', questionRoutes);
router.use('/teacher', teacherRoutes);
router.use('/public', publicRoutes);
router.use('/', commentRoutes);
router.use('/friends', friendRoutes);
router.use('/messages', messageRoutes);
router.use('/admin', adminRoutes);
router.use('/support', supportRoutes);

export default router;
