// // 监听标签页更新
// chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
//   console.log('标签页更新:', tabId, changeInfo, tab, tab.url?.includes('bilibili.com'));
//   if (changeInfo.status === 'complete' && tab.url?.includes('bilibili.com')) {
//     // 检查是否应该启用暗黑模式
//     chrome.storage.sync.get(['darkMode'], function(result) {
//       console.log('获取存储darkMode:', result);
//       if (result.darkMode) {
//         chrome.tabs.sendMessage(tabId, {
//           action: "toggleDarkMode",
//           enabled: true
//         });
//       }
//     });
//   }
// }); 
