chrome.runtime.onInstalled.addListener(() => {
  console.log('ActionsBoard-Solo extension installed');
  // Initialize alarm for periodic polling
  chrome.alarms.create('pollActions', { periodInMinutes: 1 });
});

// Alarm for periodic polling
chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === 'pollActions') {
    // Polling logic will be here
  }
});
