import express from 'express';
import { logSleep } from './controller';

const app = express();

app.use(express.urlencoded({extended: false}));
app.use(express.json());

app.set('view engine', 'pug');
app.set('views', __dirname + '/views');
app.use('/js', express.static(__dirname + '/views/js'));

app.post('/api/sleep', logSleep);
app.get('/sleep', async (req, res) => res.render("sleep.pug"));

const PORT = '8000';
app.listen(PORT, async (err: Error) => {
  if (err) return;
  console.log(`Server is listening on port ${PORT}`);
});
