import { Schema, model } from 'mongoose';

const requestLogSchema = new Schema({
  timestamp: { type: Date, required: true },
  method: { type: String, required: true },
  path: { type: String, required: true },
});

export const RequestLog = model('RequestLog', requestLogSchema, 'RequestLogs');
export default RequestLog;
