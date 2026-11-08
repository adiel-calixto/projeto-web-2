import { createApp } from './app.js';
import { loadConfig } from './config.js';
import { connectDatabase } from './db/connect.js';
import { createMailer } from './mail/mailer.js';

const config = loadConfig();
const mailer = createMailer(config);
const port = Number(process.env.PORT ?? 3000);

const app = createApp({ config, mailer });

await connectDatabase();

app.listen(port, () => {
  console.log(`API disponível em http://localhost:${port}`);
});
