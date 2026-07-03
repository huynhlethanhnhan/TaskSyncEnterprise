/**
 * Formats a date string or object into relative time or clean absolute date format
 * @param {string | Date} dateInput
 * @returns {string} Relative time string (e.g. "5 phút trước", "Hôm qua lúc 10:15")
 */
export function formatRelativeTime(dateInput) {
  if (!dateInput) return "Chưa rõ thời gian";
  
  const now = new Date();
  const date = new Date(dateInput);
  
  // Calculate difference in milliseconds
  const diffMs = now.getTime() - date.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHr = Math.floor(diffMin / 60);
  
  if (diffSec < 60) {
    return "Vừa xong";
  }
  
  if (diffMin < 60) {
    return `${diffMin} phút trước`;
  }
  
  if (diffHr < 24) {
    return `${diffHr} giờ trước`;
  }
  
  // Check if yesterday
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  
  const timeStr = date.toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" });
  
  if (date.toDateString() === yesterday.toDateString()) {
    return `Hôm qua lúc ${timeStr}`;
  }
  
  const dateStr = date.toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric" });
  return `${dateStr} lúc ${timeStr}`;
}

/**
 * Groups list of items by date categories: "Hôm nay", "Hôm qua", "Cũ hơn"
 * @param {Array} items
 * @param {string} dateField
 * @returns {Object} Object with keys "Hôm nay", "Hôm qua", "Cũ hơn" containing lists of items
 */
export function groupNotificationsByDate(items, dateField = "created_at") {
  const groups = {
    today: [],
    yesterday: [],
    older: []
  };
  
  const now = new Date();
  const todayStr = now.toDateString();
  
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  const yesterdayStr = yesterday.toDateString();
  
  items.forEach(item => {
    const itemDate = new Date(item[dateField]);
    const itemDateStr = itemDate.toDateString();
    
    if (itemDateStr === todayStr) {
      groups.today.push(item);
    } else if (itemDateStr === yesterdayStr) {
      groups.yesterday.push(item);
    } else {
      groups.older.push(item);
    }
  });
  
  return groups;
}
