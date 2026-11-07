import { createApp } from './app.js';
import { connectDatabase } from './db/connect.js';

const port = Number(process.env.PORT ?? 3000);

const app = createApp();

await connectDatabase();

app.listen(port, () => {
  console.log(`API disponível em http://localhost:${port}`);
});
