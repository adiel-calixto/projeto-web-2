import { RequestLog } from '../models/request-log.js';

function toEntry({ timestamp, method, path }) {
  return { timestamp: new Date(timestamp), method, path };
}

export function createRequestLogsStore() {
  return {
    async create(entry) {
      await RequestLog.create(entry);
    },

    async list() {
      const logs = await RequestLog.find().lean();
      return logs.map(toEntry);
    },
  };
}
