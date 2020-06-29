import express from 'express';
import dotenv from 'dotenv';
import { logSleep } from './controller';

dotenv.config({ path: __dirname + '/../secret/.env' });

const app = express();

app.use(express.urlencoded({extended: false}));
app.use(express.json());

app.set('view engine', 'pug');
app.set('views', __dirname + '/views');
app.use('/js', express.static(__dirname + '/views/js'));

app.post('/api/sleep', logSleep);
app.get('/sleep', async (req, res) => res.render('sleep.pug'));

const PORT = '8000';
app.listen(PORT, async (err: Error) => {
  if (err) return;
  console.log(`Server is listening on port ${PORT}`);
});
