import { createApp } from './app.js';
import { loadConfig } from './config.js';
import { connectDatabase } from './db/connect.js';
import { createMailer } from './mail/mailer.js';
import { RefreshToken } from './models/refresh-token.js';
import { User } from './models/user.js';
import { createS3Storage } from './storage/s3-storage.js';

const config = loadConfig();
const mailer = createMailer(config);
const storage = createS3Storage(config.s3);
const port = Number(process.env.PORT ?? 3000);

const app = createApp({ config, mailer, storage });

await connectDatabase();
await Promise.all([User.init(), RefreshToken.init()]);

app.listen(port, () => {
  console.log(`API disponível em http://localhost:${port}`);
});
