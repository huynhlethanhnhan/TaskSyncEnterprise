// 📂 FILE: src/api/auditApi.js
import api from "./axios";

export const auditApi = {
  // Nếu main.py của bạn là prefix="/api/v1", 
  // và audit.py là prefix="/audit-logs"
  // thì đường dẫn đầy đủ là /api/v1/audit-logs
  getLogs: () => api.get("/audit-logs"), 
};