let currentSpeed = 1.0;
let aKeyPressed = false;
let aKeyTimer = null;
let pluginEnabled = true; // 默认启用状态
let lastSpeed = 1.0; // 用于存储关闭前的速度值

// 创建速度显示器
const speedDisplay = document.createElement('div');
speedDisplay.className = 'bilibili-speed-display';
document.body.appendChild(speedDisplay);

// 初始化时获取插件状态和速度值
chrome.storage.local.get(['pluginEnabled', 'playbackSpeed', 'lastSpeed'], function(result) {
    pluginEnabled = result.pluginEnabled !== false;
    lastSpeed = result.lastSpeed || 1.0;
    
    if (pluginEnabled) {
        // 如果插件启用，使用存储的播放速度
        currentSpeed = result.playbackSpeed || 1.0;
        setVideoSpeed(currentSpeed);
    } else {
        // 如果插件禁用，使用默认速度
        currentSpeed = 1.0;
        setVideoSpeed(1.0);
    }
});

// 监听来自popup的消息
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "togglePlugin") {
        pluginEnabled = request.enabled;
        if (!pluginEnabled) {
            // 禁用时，保存当前速度并重置为1.0
            lastSpeed = currentSpeed;
            chrome.storage.local.set({ lastSpeed: lastSpeed });
            setVideoSpeed(1.0);
        } else {
            // 启用时，恢复上次的速度
            setVideoSpeed(lastSpeed);
        }
    } else if (request.action === "setSpeed" && pluginEnabled) {
        setVideoSpeed(request.speed);
    }
});

// 设置视频速度
function setVideoSpeed(speed) {
    // 将速度限制在合理范围内并保留两位小数
    speed = Math.round(speed * 100) / 100;
    speed = Math.max(0.25, Math.min(speed, 16.0));

    const video = document.querySelector('video');
    if (video) {
        video.playbackRate = speed;
        currentSpeed = speed;
        
        // 只在插件启用时保存速度设置
        if (pluginEnabled) {
            chrome.storage.local.set({ 
                playbackSpeed: speed,
                lastSpeed: speed 
            });
        }
        
        showSpeedDisplay();
    }
}

// 显示速度提示
function showSpeedDisplay() {
    speedDisplay.textContent = `${currentSpeed.toFixed(2)}x`;
    speedDisplay.style.opacity = '1';
    setTimeout(() => {
        speedDisplay.style.opacity = '0';
    }, 1000);
}

// 键盘快捷键控制
document.addEventListener('keydown', (e) => {
    if (!pluginEnabled) return; // 如果插件被禁用，直接返回

    // 忽略输入框中的快捷键
    if (document.activeElement.tagName === 'INPUT' || 
        document.activeElement.tagName === 'TEXTAREA') {
        return;
    }

    // A键预设处理
    if (e.key.toLowerCase() === 'a') {
        e.preventDefault();
        aKeyPressed = true;
        
        // 清除之前的定时器
        if (aKeyTimer) clearTimeout(aKeyTimer);
        
        // 设置新的定时器，如果500ms内没有按下数字键，则重置为1倍速
        aKeyTimer = setTimeout(() => {
            if (aKeyPressed) {
                setVideoSpeed(1.0);
                aKeyPressed = false;
            }
        }, 500);
        return;
    }

    // 数字键预设（当A键被按下时）
    if (aKeyPressed && /^[0-9]$/.test(e.key)) {
        e.preventDefault();
        const speed = parseFloat(e.key);
        if (speed === 0) {
            setVideoSpeed(1.0); // 当按0时设置为1倍速
        } else {
            setVideoSpeed(speed);
        }
        aKeyPressed = false;
        if (aKeyTimer) clearTimeout(aKeyTimer);
        return;
    }

    // Ctrl + 方向键调速
    if (e.ctrlKey) {
        switch(e.key) {
            case 'ArrowUp':
                e.preventDefault();
                // 增加速度，每次增加 0.25
                setVideoSpeed(currentSpeed + 0.25);
                break;
            case 'ArrowDown':
                e.preventDefault();
                // 减少速度，每次减少 0.25
                setVideoSpeed(currentSpeed - 0.25);
                break;
        }
    }
});

// 键盘抬起时重置A键状态
document.addEventListener('keyup', (e) => {
    if (e.key.toLowerCase() === 'a') {
        // 不要立即重置aKeyPressed，让定时器处理它
    }
});

// 修改监听视频元素的部分
const observer = new MutationObserver(() => {
    const video = document.querySelector('video');
    if (video && !video.dataset.speedControlled) {
        video.dataset.speedControlled = true;
        if (pluginEnabled) {
            // 只在插件启用时应用存储的速度
            chrome.storage.local.get(['playbackSpeed'], function(result) {
                if (result.playbackSpeed) {
                    video.playbackRate = result.playbackSpeed;
                    currentSpeed = result.playbackSpeed;
                }
            });

            // 添加视频属性变化监听
            const videoObserver = new MutationObserver((mutations) => {
                for (const mutation of mutations) {
                    // 检查是否是src属性变化或其他关键属性变化
                    if (mutation.type === 'attributes' && 
                        (mutation.attributeName === 'src' || 
                         mutation.attributeName === 'data-src' ||
                         mutation.attributeName === 'currentSrc')) {
                        console.log('Video source changed, restoring speed...');
                        // 给予一点延迟以确保视频已经准备就绪
                        setTimeout(() => {
                            if (pluginEnabled && currentSpeed !== video.playbackRate) {
                                video.playbackRate = currentSpeed;
                                // 更新任何打开的倍速菜单中的滑块
                                const speedMenu = document.querySelector('.bpx-player-ctrl-playbackrate-menu');
                                if (speedMenu) {
                                    const sliderValue = speedMenu.querySelector('.speed-slider-value');
                                    const slider = speedMenu.querySelector('.speed-slider');
                                    if (sliderValue && slider) {
                                        sliderValue.textContent = `${currentSpeed.toFixed(2)}x`;
                                        slider.value = currentSpeed;
                                    }
                                }
                            }
                        }, 100);
                    }
                }
            });

            // 配置视频观察器
            videoObserver.observe(video, {
                attributes: true,
                attributeFilter: ['src', 'data-src', 'currentSrc']
            });
        }
    }
});

observer.observe(document.body, {
    childList: true,
    subtree: true
});

// 自定义样式
const customStyles = `
.bpx-player-ctrl-playbackrate-menu {
    background: rgba(28, 28, 28, 0.95) !important;
    border-radius: 8px !important;
    padding: 6px !important;
    border: none !important;
    backdrop-filter: blur(16px) !important;
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.2) !important;
    min-width: 180px !important;
    transform-origin: bottom center !important;
    animation: menuFadeIn 0.2s ease !important;
    border: 1px solid rgba(255, 255, 255, 0.1) !important;
}

/* 添加滑块容器样式 */
.speed-slider-container {
    padding: 10px 12px !important;
    border-top: 1px solid rgba(255, 255, 255, 0.1) !important;
    margin-top: 4px !important;
}

.speed-slider-header {
    display: flex !important;
    justify-content: space-between !important;
    align-items: center !important;
    margin-bottom: 8px !important;
    color: rgba(255, 255, 255, 0.85) !important;
    font-size: 12px !important;
}

.speed-slider-value {
    font-weight: 600 !important;
    color: #0ACF83 !important;
}

.speed-slider {
    -webkit-appearance: none !important;
    width: 100% !important;
    height: 4px !important;
    border-radius: 2px !important;
    background: rgba(255, 255, 255, 0.1) !important;
    outline: none !important;
    transition: all 0.2s ease !important;
}

.speed-slider::-webkit-slider-thumb {
    -webkit-appearance: none !important;
    appearance: none !important;
    width: 12px !important;
    height: 12px !important;
    border-radius: 50% !important;
    background: #0ACF83 !important;
    cursor: pointer !important;
    transition: all 0.2s ease !important;
    box-shadow: 0 0 0 0 rgba(33, 243, 138, 0.3) !important;
}

.speed-slider::-webkit-slider-thumb:hover {
    transform: scale(1.2) !important;
    box-shadow: 0 0 0 4px rgba(33, 243, 138, 0.3) !important;
}

.bpx-player-ctrl-playbackrate-menu .bpx-player-ctrl-playbackrate-menu-item {
    height: 32px !important;
    line-height: 32px !important;
    padding: 0 12px !important;
    color: rgba(255, 255, 255, 0.85) !important;
    font-size: 13px !important;
    transition: all 0.2s ease !important;
    border-radius: 4px !important;
    margin: 2px 0 !important;
    position: relative !important;
    font-weight: 500 !important;
    display: flex !important;
    align-items: center !important;
    justify-content: space-between !important;
}

.bpx-player-ctrl-playbackrate-menu .bpx-player-ctrl-playbackrate-menu-item:hover {
    background: rgba(255, 255, 255, 0.1) !important;
    color: #FFFFFF !important;
}

.bpx-player-ctrl-playbackrate-menu .bpx-player-ctrl-playbackrate-menu-item.bpx-state-active {
    color: #FFFFFF !important;
    background: #0ACF83 !important;
    font-weight: 600 !important;
}

.bpx-player-ctrl-playbackrate {
    opacity: 0.85 !important;
    transition: opacity 0.2s ease !important;
    font-weight: 600 !important;
    font-size: 13px !important;
}

.bpx-player-ctrl-playbackrate:hover {
    opacity: 1 !important;
}

/* 添加选中标记 */
.bpx-player-ctrl-playbackrate-menu .bpx-player-ctrl-playbackrate-menu-item.bpx-state-active::after {
    content: '✓' !important;
    font-size: 12px !important;
    margin-left: 4px !important;
}

/* 动画效果 */
@keyframes menuFadeIn {
    from {
        opacity: 0;
        transform: translateY(4px) scale(0.98);
    }
    to {
        opacity: 1;
        transform: translateY(0) scale(1);
    }
}

/* 美化滚动条 */
.bpx-player-ctrl-playbackrate-menu::-webkit-scrollbar {
    width: 4px !important;
}

.bpx-player-ctrl-playbackrate-menu::-webkit-scrollbar-track {
    background: transparent !important;
}

.bpx-player-ctrl-playbackrate-menu::-webkit-scrollbar-thumb {
    background: rgba(255, 255, 255, 0.2) !important;
    border-radius: 2px !important;
}

.bpx-player-ctrl-playbackrate-menu::-webkit-scrollbar-thumb:hover {
    background: rgba(255, 255, 255, 0.3) !important;
}

/* 添加菜单项悬浮效果 */
.bpx-player-ctrl-playbackrate-menu .bpx-player-ctrl-playbackrate-menu-item {
    transform: translateX(0);
    transition: transform 0.2s ease, background 0.2s ease, color 0.2s ease !important;
}

.bpx-player-ctrl-playbackrate-menu .bpx-player-ctrl-playbackrate-menu-item:hover {
    transform: translateX(4px);
}

/* 当前速度显示优化 */
.bpx-player-ctrl-playbackrate-menu .bpx-player-ctrl-playbackrate-menu-item.bpx-state-active {
    box-shadow: 0 2px 8px rgba(33, 243, 138, 0.3) !important;
}
`;

// 修改 MutationObserver 的回调函数
const menuObserver = new MutationObserver((mutations) => {
    if (!pluginEnabled) return;

    for (const mutation of mutations) {
        for (const node of mutation.addedNodes) {
            if (node.nodeType === 1) { // 确保是元素节点
                const menu = node.classList?.contains('bpx-player-ctrl-playbackrate-menu') ? 
                           node : 
                           node.querySelector('.bpx-player-ctrl-playbackrate-menu');
                
                if (menu) {
                    console.log('Found menu:', menu);
                    // 确保样式已注入
                    if (!document.getElementById('bilibili-speed-styles')) {
                        injectStyles();
                    }
                    // 添加滑块
                    addSpeedSlider(menu);
                    return;
                }
            }
        }
    }
});

// 配置 observer 选项
const observerConfig = {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: ['class']
};

// 开始观察DOM变化
menuObserver.observe(document.body, observerConfig);

// 修改注入样式的函数
function injectStyles() {
    // 移除旧的样式（如果存在）
    const existingStyle = document.getElementById('bilibili-speed-styles');
    if (existingStyle) {
        existingStyle.remove();
    }

    // 创建新的样式元素
    const styleElement = document.createElement('style');
    styleElement.id = 'bilibili-speed-styles';
    styleElement.textContent = customStyles;
    document.head.appendChild(styleElement);
}

// 添加点击事件监听器来处理菜单打开
document.addEventListener('click', (e) => {
    if (!pluginEnabled) return;

    // 检查是否点击了倍速按钮
    if (e.target.closest('.bpx-player-ctrl-playbackrate')) {
        // 使用轮询方式等待菜单出现
        let attempts = 0;
        const maxAttempts = 10;
        const checkInterval = setInterval(() => {
            const speedMenu = document.querySelector('.bpx-player-ctrl-playbackrate-menu');
            if (speedMenu && !speedMenu.querySelector('.speed-slider-container')) {
                clearInterval(checkInterval);
                if (!document.getElementById('bilibili-speed-styles')) {
                    injectStyles();
                }
                addSpeedSlider(speedMenu);
            }
            attempts++;
            if (attempts >= maxAttempts) {
                clearInterval(checkInterval);
            }
        }, 50);
    }
}, true);

// 修改 addSpeedSlider 函数
function addSpeedSlider(speedMenu) {
    if (!speedMenu || speedMenu.querySelector('.speed-slider-container')) {
        return;
    }

    // 创建新的容器元素
    const sliderContainer = document.createElement('div');
    sliderContainer.className = 'speed-slider-container';
    
    // 设置HTML内容
    sliderContainer.innerHTML = `
        <div class="speed-slider-header">
            <span>自定义倍速</span>
            <span class="speed-slider-value">${currentSpeed.toFixed(2)}x</span>
        </div>
        <input type="range" class="speed-slider" min="0.25" max="4" step="0.05" value="${currentSpeed}">
    `;

    // 确保在最后添加
    speedMenu.appendChild(sliderContainer);

    // 获取滑块和显示值元素
    const slider = sliderContainer.querySelector('.speed-slider');
    const sliderValue = sliderContainer.querySelector('.speed-slider-value');
    
    // 更新滑块和显示值的函数
    const updateSliderAndValue = (speed) => {
        requestAnimationFrame(() => {
            slider.value = speed;
            sliderValue.textContent = `${speed.toFixed(2)}x`;
        });
    };

    // 使用多个事件来确保值的更新
    const updateSpeed = (e) => {
        // 如果插件被禁用，阻止任何速度更改
        if (!pluginEnabled) {
            e.preventDefault();
            // 重置滑块到1.0
            updateSliderAndValue(1.0);
            return;
        }

        const speed = parseFloat(e.target.value);
        setVideoSpeed(speed);
        updateSliderAndValue(speed);
        
        // 更新菜单中的选中状态
        const menuItems = speedMenu.querySelectorAll('.bpx-player-ctrl-playbackrate-menu-item');
        menuItems.forEach(item => {
            item.classList.remove('bpx-state-active');
        });
    };

    // 监听倍速列表点击事件
    const handleMenuItemClick = (e) => {
        // 如果插件被禁用，阻止任何速度更改
        if (!pluginEnabled) {
            e.preventDefault();
            return;
        }

        const menuItem = e.target.closest('.bpx-player-ctrl-playbackrate-menu-item');
        if (menuItem) {
            const speedText = menuItem.textContent.trim();
            const speed = parseFloat(speedText);
            if (!isNaN(speed)) {
                setVideoSpeed(speed);
                updateSliderAndValue(speed);
            }
        }
    };

    // 添加点击事件监听
    speedMenu.addEventListener('click', handleMenuItemClick);

    // 添加多个事件监听以确保可靠性
    slider.addEventListener('input', updateSpeed);
    slider.addEventListener('change', updateSpeed);
    slider.addEventListener('mousedown', (e) => {
        // 如果插件被禁用，阻止拖动
        if (!pluginEnabled) {
            e.preventDefault();
            return;
        }
        document.addEventListener('mousemove', updateSpeed);
    });
    
    // 停止拖动时移除鼠标移动监听
    document.addEventListener('mouseup', () => {
        document.removeEventListener('mousemove', updateSpeed);
    });

    // 防止点击滑块时关闭菜单
    sliderContainer.addEventListener('click', (e) => {
        e.stopPropagation();
    });

    // 监听视频速度变化
    const video = document.querySelector('video');
    if (video) {
        video.addEventListener('ratechange', () => {
            // 只在插件启用时更新滑块
            if (pluginEnabled && video.playbackRate !== parseFloat(slider.value)) {
                updateSliderAndValue(video.playbackRate);
            }
        });
    }

    // 创建一个 MutationObserver 来监听菜单项的选中状态变化
    const menuObserver = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
            if (mutation.type === 'attributes' && mutation.attributeName === 'class') {
                const menuItem = mutation.target;
                if (menuItem.classList.contains('bpx-state-active') && pluginEnabled) {
                    const speedText = menuItem.textContent.trim();
                    const speed = parseFloat(speedText);
                    if (!isNaN(speed)) {
                        updateSliderAndValue(speed);
                    }
                }
            }
        });
    });

    // 监听所有菜单项
    const menuItems = speedMenu.querySelectorAll('.bpx-player-ctrl-playbackrate-menu-item');
    menuItems.forEach(item => {
        menuObserver.observe(item, {
            attributes: true,
            attributeFilter: ['class']
        });
    });

    // 当插件状态改变时更新滑块状态
    const updateSliderState = () => {
        if (!pluginEnabled) {
            slider.disabled = true;
            sliderContainer.style.opacity = '0.5';
            updateSliderAndValue(1.0);
        } else {
            slider.disabled = false;
            sliderContainer.style.opacity = '1';
            updateSliderAndValue(currentSpeed);
        }
    };

    // 初始化滑块状态
    updateSliderState();
}
