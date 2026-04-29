import 'express-async-errors';

import path from 'node:path';

import cors from 'cors';
import express from 'express';

import { errorHandler } from './middleware/errorHandler';
import { ipBanGuard } from './middleware/ipBanGuard';
import { withRequestContext } from './middleware/requestContext';
import routes from './routes';

const app = express();

app.use(
  cors({
    origin: '*',
    credentials: true
  })
);
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(withRequestContext);
app.use(ipBanGuard);

app.use(
  '/uploads',
  express.static(path.resolve(__dirname, '../uploads'), {
    maxAge: '1d'
  })
);

app.get('/health', (_req, res) => {
  res.json({ status: 'ok' });
});

app.use('/api', routes);

app.use(errorHandler);

export default app;
