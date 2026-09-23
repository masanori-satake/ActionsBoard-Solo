const {
  getWorkflowStatus,
  shouldNotify,
  parseNotificationUrl,
  escapeHtml,
} = require('../projects/app/utils');

describe('getWorkflowStatus', () => {
  test('returns neutral for null, undefined, or none status', () => {
    expect(getWorkflowStatus(null)).toBe('neutral');
    expect(getWorkflowStatus(undefined)).toBe('neutral');
    expect(getWorkflowStatus({ status: 'none' })).toBe('neutral');
  });

  test('returns failure for error status or failure conclusion', () => {
    expect(getWorkflowStatus({ status: 'error' })).toBe('failure');
    expect(getWorkflowStatus({ status: 'completed', conclusion: 'failure' })).toBe('failure');
  });

  test('returns progress for in-flight or action-required runs', () => {
    const progressStatuses = ['queued', 'in_progress', 'waiting', 'pending', 'requested'];
    progressStatuses.forEach((status) => {
      expect(getWorkflowStatus({ status })).toBe('progress');
    });
    expect(
      getWorkflowStatus({ status: 'completed', conclusion: 'action_required' }),
    ).toBe('progress');
  });

  test('returns success for completed runs with success conclusion', () => {
    expect(getWorkflowStatus({ status: 'completed', conclusion: 'success' })).toBe('success');
  });

  test('returns neutral for cancelled runs or unknown statuses', () => {
    expect(getWorkflowStatus({ status: 'completed', conclusion: 'cancelled' })).toBe('neutral');
    expect(getWorkflowStatus({ status: 'unknown_status' })).toBe('neutral');
  });
});

describe('shouldNotify', () => {
  test('returns false if event type is not enabled in settings', () => {
    const context = {
      notificationSettings: { events: ['pages'], scope: 'all' },
    };
    expect(shouldNotify('failure', { actor: 'octocat' }, context)).toBe(false);
  });

  test('returns true for scope "all"', () => {
    const context = {
      notificationSettings: { events: ['failure'], scope: 'all' },
    };
    expect(shouldNotify('failure', { actor: 'octocat' }, context)).toBe(true);
  });

  test('handles scope "my-activity" with case-insensitive actor comparison', () => {
    const context = {
      notificationSettings: { events: ['failure'], scope: 'my-activity' },
      currentUser: 'OctoCat',
    };
    expect(shouldNotify('failure', { actor: 'octocat' }, context)).toBe(true);
    expect(shouldNotify('failure', { actor: 'someone_else' }, context)).toBe(false);
    expect(shouldNotify('failure', null, context)).toBe(false);
  });

  test('handles scope "workspaces"', () => {
    const context = {
      notificationSettings: { events: ['failure'], scope: 'workspaces', workspaces: ['ws-1'] },
      itemWorkspaces: [{ id: 'ws-1' }],
    };
    expect(shouldNotify('failure', { actor: 'anyone' }, context)).toBe(true);

    const contextOther = {
      notificationSettings: { events: ['failure'], scope: 'workspaces', workspaces: ['ws-2'] },
      itemWorkspaces: [{ id: 'ws-1' }],
    };
    expect(shouldNotify('failure', { actor: 'anyone' }, contextOther)).toBe(false);
  });

  test('returns false for unknown scope', () => {
    const context = {
      notificationSettings: { events: ['failure'], scope: 'unknown-scope' },
    };
    expect(shouldNotify('failure', { actor: 'anyone' }, context)).toBe(false);
  });
});

describe('parseNotificationUrl', () => {
  test('parses valid notification URL format', () => {
    const id = 'notif|https://github.com/masanori-satake/ActionsBoard-Solo/actions/runs/12345|1700000000';
    expect(parseNotificationUrl(id)).toBe(
      'https://github.com/masanori-satake/ActionsBoard-Solo/actions/runs/12345',
    );
  });

  test('returns null for non-notif ID or invalid URL format', () => {
    expect(parseNotificationUrl('random-id')).toBeNull();
    expect(parseNotificationUrl('notif|javascript:alert(1)|1700000000')).toBeNull();
    expect(parseNotificationUrl(null)).toBeNull();
    expect(parseNotificationUrl(123)).toBeNull();
  });
});

describe('escapeHtml', () => {
  test('returns empty string for null, undefined, or empty input', () => {
    expect(escapeHtml(null)).toBe('');
    expect(escapeHtml(undefined)).toBe('');
    expect(escapeHtml('')).toBe('');
  });

  test('escapes special HTML characters', () => {
    expect(escapeHtml('<script>alert("xss & \'test\'")</script>')).toBe(
      '&lt;script&gt;alert(&quot;xss &amp; &#39;test&#39;&quot;)&lt;/script&gt;',
    );
  });
});
