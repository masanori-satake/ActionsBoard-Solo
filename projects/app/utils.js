/**
 * Shared utility functions for ActionsBoard-Solo
 */

/**
 * Determine workflow status category for UI display and filtering.
 * @param {Object} run Workflow run object
 * @returns {string} Status string: 'failure' | 'progress' | 'success' | 'neutral'
 */
function getWorkflowStatus(run) {
  if (!run || run.status === 'none') return 'neutral';
  if (run.status === 'error' || run.conclusion === 'failure') return 'failure';
  if (
    run.status === 'queued' ||
    run.status === 'in_progress' ||
    run.status === 'waiting' ||
    run.status === 'pending' ||
    run.status === 'requested' ||
    run.conclusion === 'action_required'
  ) {
    return 'progress';
  }
  if (run.conclusion === 'success') return 'success';
  if (run.conclusion === 'cancelled') return 'neutral';
  return 'neutral';
}

/**
 * Check whether notification should be dispatched based on settings and context.
 * @param {string} type Event type ('failure' | 'pages')
 * @param {Object} run Workflow run object
 * @param {Object} context Notification context { notificationSettings, currentUser, itemWorkspaces }
 * @returns {boolean} True if notification should be shown
 */
function shouldNotify(type, run, context) {
  const { notificationSettings, currentUser, itemWorkspaces } = context || {};

  // 1. Event type check
  if (!notificationSettings?.events?.includes(type)) return false;

  // 2. Scope check
  if (notificationSettings.scope === 'all') return true;

  if (notificationSettings.scope === 'my-activity') {
    return !!currentUser && !!run?.actor && run.actor.toLowerCase() === currentUser.toLowerCase();
  }

  if (notificationSettings.scope === 'workspaces') {
    return (
      itemWorkspaces?.some((ws) => notificationSettings.workspaces?.includes(ws.id)) || false
    );
  }

  return false;
}

/**
 * Parse embedded target URL from notification ID string format (notif|URL|TIMESTAMP).
 * @param {string} notificationId Notification identifier
 * @returns {string|null} Parsed URL if valid http/https URL, otherwise null
 */
function parseNotificationUrl(notificationId) {
  if (notificationId && typeof notificationId === 'string' && notificationId.startsWith('notif|')) {
    const firstPipe = notificationId.indexOf('|');
    const lastPipe = notificationId.lastIndexOf('|');
    if (firstPipe !== -1 && lastPipe > firstPipe) {
      const url = notificationId.substring(firstPipe + 1, lastPipe);
      if (url && (url.startsWith('http://') || url.startsWith('https://'))) {
        return url;
      }
    }
  }
  return null;
}

/**
 * Escape HTML special characters for safe insertion into HTML strings.
 * @param {string} str Input text string
 * @returns {string} Escaped HTML string
 */
function escapeHtml(str) {
  return str
    ? String(str).replace(
        /[&<>"']/g,
        (m) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[m],
      )
    : '';
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    getWorkflowStatus,
    shouldNotify,
    parseNotificationUrl,
    escapeHtml,
  };
}
