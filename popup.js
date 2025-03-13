document.addEventListener('DOMContentLoaded', function() {
  const toggle = document.getElementById('pluginToggle');
  const content = document.getElementById('content');

  // 从存储中获取开关状态
  chrome.storage.local.get(['pluginEnabled'], function(result) {
    toggle.checked = result.pluginEnabled !== false; // 默认为开启状态
    updateContentState(toggle.checked);
  });

  // 监听开关变化
  toggle.addEventListener('change', function() {
    const enabled = this.checked;
    // 保存开关状态
    chrome.storage.local.set({ pluginEnabled: enabled });
    updateContentState(enabled);

    // 通知content script
    chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
      chrome.tabs.sendMessage(tabs[0].id, {
        action: "togglePlugin",
        enabled: enabled
      });
    });
  });

  function updateContentState(enabled) {
    content.classList.toggle('disabled', !enabled);
  }

  // 速度按钮相关代码
  const speeds = [0.5, 0.75, 1.0, 1.25, 1.5, 1.75, 2.0, 2.5, 3.0];
  const buttonContainer = document.getElementById('speedButtons');

  speeds.forEach(speed => {
    const button = document.createElement('button');
    button.className = 'speed-btn';
    button.textContent = `${speed}x`;
    button.addEventListener('click', () => {
      chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
        chrome.tabs.sendMessage(tabs[0].id, {
          action: "setSpeed",
          speed: speed
        });
      });
    });
    buttonContainer.appendChild(button);
  });


  /** 暗黑模式 */ 
  const toggleThemeMode = document.getElementById('darkModeToggle');
  
  
  // 获取当前状态
  chrome.storage.sync.get(['darkMode'], function(result) {
    toggleThemeMode.checked = result.darkMode || false;
  });
  
  // 监听开关变化
  toggleThemeMode.addEventListener('change', async function() {
    const enabled = toggleThemeMode.checked;
    
    try {
      // 保存设置
      await chrome.storage.sync.set({darkMode: enabled});
      
      // 获取当前标签页
      const tabs = await chrome.tabs.query({active: true, currentWindow: true});
      const currentTab = tabs[0];
      // console.log('currentTab', currentTab);
      
      // 注入内容脚本（如果尚未注入）
      await chrome.scripting.executeScript({
        target: {tabId: currentTab.id},
        files: ['content.js']
      }).catch(() => {
        // 如果脚本已经存在，忽略错误
      });
      
      // 发送消息
      chrome.tabs.sendMessage(currentTab.id, {
        action: "toggleDarkMode",
        enabled: enabled
      }, function(response) {
        if (chrome.runtime.lastError) {
          console.log('重试中...');
          // 如果失败，尝试重新加载页面
          chrome.tabs.reload(currentTab.id);
        }
      });
      
    } catch (error) {
      console.error('Error:', error);
    }
  });
  /** 暗黑模式 */ 
});