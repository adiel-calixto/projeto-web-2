import mongoose from 'mongoose';

export async function connectDatabase(uri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/psw2') {
  mongoose.set('strictQuery', true);
  await mongoose.connect(uri);
  return mongoose.connection;
}

export async function disconnectDatabase() {
  await mongoose.disconnect();
}
