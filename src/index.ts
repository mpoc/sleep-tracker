import express, { Request, Response, NextFunction } from 'express';
import dotenv from 'dotenv-safe';
import path from 'path';
import { logSleep } from './controller';
import { handleError } from './error';

dotenv.config({
  path: path.resolve(__dirname, '..', 'secret/.env'),
  example: path.resolve(__dirname, '..', 'secret/.env.example'),
});

const app = express();

app.use(express.urlencoded({extended: false}));
app.use(express.json());

app.set('view engine', 'pug');
app.set('views', __dirname + '/views');
app.use('/js', express.static(__dirname + '/views/js'));
app.use(express.static(__dirname + '/static'))

app.post('/api/sleep', logSleep);
app.get('/sleep', async (req, res) => res.render('sleep.pug'));

app.use((error: Error, req: Request, res: Response, next: NextFunction) => {
  handleError(res, error);
});

const PORT = '8000';
app.listen(PORT, async (err: Error) => {
  if (err) return;
  console.log(`Server is listening on port ${PORT}`);
});
