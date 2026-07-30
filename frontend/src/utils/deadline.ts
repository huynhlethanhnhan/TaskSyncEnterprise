export interface DeadlineBadgeInfo {
  text: string;
  variant: 'success' | 'warning' | 'danger' | 'primary' | 'default';
}

export interface DeadlineDisplayInfo {
  hasDeadline: boolean;
  formattedDeadline: string; // e.g. "Deadline: 15/08/2026" or "No deadline"
  badge: DeadlineBadgeInfo | null;
}

export function getDeadlineDisplay(
  deadline: string | null | undefined,
  status?: string
): DeadlineDisplayInfo {
  if (!deadline) {
    return {
      hasDeadline: false,
      formattedDeadline: 'No deadline',
      badge: null,
    };
  }

  const deadlineDate = new Date(deadline);
  const formattedDate = deadlineDate.toLocaleDateString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });

  const todayDate = new Date();
  todayDate.setHours(0, 0, 0, 0);

  const targetDate = new Date(deadlineDate);
  targetDate.setHours(0, 0, 0, 0);

  const diffTime = targetDate.getTime() - todayDate.getTime();
  const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));

  if (status === 'Done') {
    return {
      hasDeadline: true,
      formattedDeadline: `Deadline: ${formattedDate}`,
      badge: {
        text: 'Completed',
        variant: 'success',
      },
    };
  }

  if (diffDays < 0) {
    const overdueDays = Math.abs(diffDays);
    return {
      hasDeadline: true,
      formattedDeadline: `Deadline: ${formattedDate}`,
      badge: {
        text: `Overdue by ${overdueDays} ${overdueDays === 1 ? 'day' : 'days'}`,
        variant: 'danger',
      },
    };
  }

  if (diffDays === 0) {
    return {
      hasDeadline: true,
      formattedDeadline: `Deadline: ${formattedDate}`,
      badge: {
        text: 'Due today',
        variant: 'warning',
      },
    };
  }

  return {
    hasDeadline: true,
    formattedDeadline: `Deadline: ${formattedDate}`,
    badge: {
      text: `Remaining: ${diffDays} ${diffDays === 1 ? 'day' : 'days'}`,
      variant: 'primary',
    },
  };
}
