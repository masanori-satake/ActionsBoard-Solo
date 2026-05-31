chrome.runtime.onInstalled.addListener(() => {
  console.log('ActionsBoard-Solo extension installed');
});

// Alarm for periodic polling
chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === 'pollActions') {
    // Polling logic will be here
  }
});
