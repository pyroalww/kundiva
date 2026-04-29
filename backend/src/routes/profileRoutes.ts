import { Router, Request, Response } from 'express';
import { profileService } from '../services/profileService';
import { authenticate } from '../middleware/auth';
import { ApiError } from '../middleware/errorHandler';
import { applyRateLimit } from '../middleware/rateLimiter';

const router = Router();

// Public: get any user's profile
router.get('/:username', async (req: Request, res: Response) => {
  const viewerId = req.user?.id;
  const profile = await profileService.getProfile(req.params.username, viewerId);
  res.json(profile);
});

// Public: get user's questions
router.get('/:username/questions', async (req: Request, res: Response) => {
  const take = req.query.take ? Number(req.query.take) : 20;
  const skip = req.query.skip ? Number(req.query.skip) : 0;
  const questions = await profileService.getProfileQuestions(req.params.username, take, skip);
  res.json(questions);
});

// Public: get user's solutions
router.get('/:username/solutions', async (req: Request, res: Response) => {
  const take = req.query.take ? Number(req.query.take) : 20;
  const skip = req.query.skip ? Number(req.query.skip) : 0;
  const solutions = await profileService.getProfileSolutions(req.params.username, take, skip);
  res.json(solutions);
});

// Public: get user's posts
router.get('/:username/posts', async (req: Request, res: Response) => {
  const take = req.query.take ? Number(req.query.take) : 20;
  const skip = req.query.skip ? Number(req.query.skip) : 0;
  const posts = await profileService.getPosts(req.params.username, take, skip);
  res.json(posts);
});

// Public: get user's followers
router.get('/:username/followers', async (req: Request, res: Response) => {
  const followers = await profileService.getFollowers(req.params.username);
  res.json(followers);
});

// Public: get user's following
router.get('/:username/following', async (req: Request, res: Response) => {
  const following = await profileService.getFollowing(req.params.username);
  res.json(following);
});

// Auth: update own bio
router.patch('/me/bio', authenticate, async (req: Request, res: Response) => {
  if (!req.user) throw new ApiError(401, 'Yetkilendirme gerekli.');
  const { bio } = req.body;
  if (typeof bio !== 'string') throw new ApiError(400, 'Geçersiz biyografi.');
  const result = await profileService.updateBio(req.user.id, bio);
  res.json(result);
});

// Auth: create a post
router.post(
  '/me/posts',
  authenticate,
  applyRateLimit({ windowMs: 60_000, max: 5, message: 'Çok sık gönderi paylaşıyorsunuz.' }),
  async (req: Request, res: Response) => {
    if (!req.user) throw new ApiError(401, 'Yetkilendirme gerekli.');
    const { title, content } = req.body;
    if (!title || !content) throw new ApiError(400, 'Başlık ve içerik gerekli.');
    const post = await profileService.createPost(req.user.id, title, content);
    res.status(201).json(post);
  }
);

// Auth: update a post
router.patch('/me/posts/:postId', authenticate, async (req: Request, res: Response) => {
  if (!req.user) throw new ApiError(401, 'Yetkilendirme gerekli.');
  const { title, content } = req.body;
  if (!title || !content) throw new ApiError(400, 'Başlık ve içerik gerekli.');
  const post = await profileService.updatePost(req.user.id, req.params.postId, title, content);
  res.json(post);
});

// Auth: delete a post
router.delete('/me/posts/:postId', authenticate, async (req: Request, res: Response) => {
  if (!req.user) throw new ApiError(401, 'Yetkilendirme gerekli.');
  const isAdmin = req.user.role === 'ADMIN';
  await profileService.deletePost(req.user.id, req.params.postId, isAdmin);
  res.status(204).send();
});

// Auth: follow a user
router.post('/:username/follow', authenticate, async (req: Request, res: Response) => {
  if (!req.user) throw new ApiError(401, 'Yetkilendirme gerekli.');
  await profileService.follow(req.user.id, req.params.username);
  res.json({ success: true });
});

// Auth: unfollow a user
router.delete('/:username/follow', authenticate, async (req: Request, res: Response) => {
  if (!req.user) throw new ApiError(401, 'Yetkilendirme gerekli.');
  await profileService.unfollow(req.user.id, req.params.username);
  res.json({ success: true });
});

export default router;
