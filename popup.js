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
});
