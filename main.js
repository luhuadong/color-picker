// 获取 DOM 元素
const pickBtn = document.getElementById('pickBtn');
const overlay = document.getElementById('overlay');
const magnifier = document.getElementById('magnifier');
const magnifierCanvas = document.getElementById('magnifierCanvas');
const magnifierCtx = magnifierCanvas.getContext('2d');
const magnifierColorPreview = document.querySelector('.magnifier-color-preview');
const magnifierColorValue = document.querySelector('.magnifier-color-value');
const screenVideo = document.getElementById('screenVideo');
const screenCanvas = document.getElementById('screenCanvas');
const screenCtx = screenCanvas.getContext('2d');
const resultSection = document.querySelector('.result-section');
const colorPreview = document.getElementById('colorPreview');
const rgbValue = document.getElementById('rgbValue');
const hexValue = document.getElementById('hexValue');
const hslValue = document.getElementById('hslValue');
const copyBtn = document.getElementById('copyBtn');
const statusBar = document.getElementById('statusBar');

// 放大镜配置
const MAGNIFIER_SIZE = 200;
const MAGNIFICATION = 10; // 放大倍数

// 设置放大镜 Canvas 大小
magnifierCanvas.width = MAGNIFIER_SIZE;
magnifierCanvas.height = MAGNIFIER_SIZE;

let stream = null;
let isPicking = false;

// RGB 转 HEX
function rgbToHex(r, g, b) {
    return '#' + [r, g, b].map(x => {
        const hex = x.toString(16);
        return hex.length === 1 ? '0' + hex : hex;
    }).join('').toUpperCase();
}

// RGB 转 HSL
function rgbToHsl(r, g, b) {
    r /= 255;
    g /= 255;
    b /= 255;

    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    let h, s, l = (max + min) / 2;

    if (max === min) {
        h = s = 0;
    } else {
        const d = max - min;
        s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
        
        switch (max) {
            case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
            case g: h = ((b - r) / d + 2) / 6; break;
            case b: h = ((r - g) / d + 4) / 6; break;
        }
    }

    h = Math.round(h * 360);
    s = Math.round(s * 100);
    l = Math.round(l * 100);

    return `hsl(${h}, ${s}%, ${l}%)`;
}

// 更新颜色显示
function updateColorDisplay(r, g, b) {
    const hex = rgbToHex(r, g, b);
    const hsl = rgbToHsl(r, g, b);
    
    // 显示结果区域
    resultSection.classList.remove('hidden');
    
    // 更新主界面
    rgbValue.textContent = `rgb(${r}, ${g}, ${b})`;
    hexValue.textContent = hex;
    hslValue.textContent = hsl;
    
    // 设置颜色预览背景色（覆盖默认的白色背景和背景图片）
    const color = `rgb(${r}, ${g}, ${b})`;
    colorPreview.style.backgroundColor = color;
    colorPreview.style.backgroundImage = 'none';
    
    // 更新复制按钮
    copyBtn.disabled = false;
    copyBtn.dataset.hex = hex;
    
    // 调整 color-preview 高度以匹配 color-info（保持正方形）
    requestAnimationFrame(() => {
        adjustColorPreviewHeight();
    });
}

// 调整 color-preview 高度以匹配 color-info（保持正方形）
function adjustColorPreviewHeight() {
    const colorInfo = document.querySelector('.color-info');
    if (colorInfo && colorPreview) {
        const colorInfoHeight = colorInfo.offsetHeight;
        // 保持正方形，使用 color-info 的高度
        colorPreview.style.height = colorInfoHeight + 'px';
        colorPreview.style.width = colorInfoHeight + 'px';
    }
}

// 更新放大镜显示
function updateMagnifier(canvasX, canvasY) {
    if (!stream || !screenCanvas.width || !screenCanvas.height) return;
    
    const halfSize = MAGNIFIER_SIZE / 2;
    const sourceSize = halfSize / MAGNIFICATION;
    
    // 计算源图像区域（以鼠标位置为中心）
    const sourceX = Math.max(0, Math.min(screenCanvas.width - 1, canvasX - sourceSize));
    const sourceY = Math.max(0, Math.min(screenCanvas.height - 1, canvasY - sourceSize));
    const sourceWidth = Math.min(sourceSize * 2, screenCanvas.width - sourceX);
    const sourceHeight = Math.min(sourceSize * 2, screenCanvas.height - sourceY);
    
    // 绘制放大区域到放大镜 Canvas
    magnifierCtx.clearRect(0, 0, MAGNIFIER_SIZE, MAGNIFIER_SIZE);
    magnifierCtx.imageSmoothingEnabled = false;
    
    try {
        magnifierCtx.drawImage(
            screenCanvas,
            sourceX, sourceY, sourceWidth, sourceHeight,
            0, 0, MAGNIFIER_SIZE, MAGNIFIER_SIZE
        );
        
        // 获取鼠标位置的颜色
        const clampedX = Math.max(0, Math.min(screenCanvas.width - 1, Math.round(canvasX)));
        const clampedY = Math.max(0, Math.min(screenCanvas.height - 1, Math.round(canvasY)));
        const imageData = screenCtx.getImageData(clampedX, clampedY, 1, 1);
        const [r, g, b] = imageData.data;
        
        // 更新放大镜信息
        const hex = rgbToHex(r, g, b);
        magnifierColorPreview.style.backgroundColor = `rgb(${r}, ${g}, ${b})`;
        magnifierColorValue.textContent = hex;
    } catch (e) {
        console.error('更新放大镜失败:', e);
    }
}

// 获取屏幕颜色
function getColorAtPosition(canvasX, canvasY) {
    if (!screenCanvas.width || !screenCanvas.height) return null;
    
    try {
        const clampedX = Math.max(0, Math.min(screenCanvas.width - 1, Math.round(canvasX)));
        const clampedY = Math.max(0, Math.min(screenCanvas.height - 1, Math.round(canvasY)));
        const imageData = screenCtx.getImageData(clampedX, clampedY, 1, 1);
        return {
            r: imageData.data[0],
            g: imageData.data[1],
            b: imageData.data[2]
        };
    } catch (e) {
        console.error('获取颜色失败:', e);
        return null;
    }
}

// 停止拾取
function stopPicking() {
    if (!isPicking) return;
    
    isPicking = false;
    overlay.classList.add('hidden');
    magnifier.style.display = 'none';
    
    // 停止视频流
    if (stream) {
        stream.getTracks().forEach(track => track.stop());
        stream = null;
    }
    
    screenVideo.srcObject = null;
    pickBtn.textContent = 'Pick';
}

// 开始拾取
async function startPicking() {
    try {
        // 请求屏幕捕获权限
        stream = await navigator.mediaDevices.getDisplayMedia({
            video: {
                displaySurface: 'screen',
                cursor: 'always'
            },
            audio: false
        });
        
        // 监听停止事件
        stream.getVideoTracks()[0].addEventListener('ended', stopPicking);
        
        // 将视频流设置到 video 元素
        screenVideo.srcObject = stream;
        
        // 等待视频加载
        screenVideo.onloadedmetadata = () => {
            // 设置 Canvas 尺寸（与视频尺寸一致）
            screenCanvas.width = screenVideo.videoWidth;
            screenCanvas.height = screenVideo.videoHeight;
            
            // 立即绘制第一帧
            if (screenVideo.readyState >= screenVideo.HAVE_METADATA) {
                screenCtx.drawImage(screenVideo, 0, 0);
            }
            
            // 持续绘制视频帧
            function drawFrame() {
                if (isPicking && screenVideo.readyState >= screenVideo.HAVE_CURRENT_DATA) {
                    screenCtx.drawImage(screenVideo, 0, 0);
                }
                if (isPicking) {
                    requestAnimationFrame(drawFrame);
                }
            }
            drawFrame();
        };
        
        // 显示覆盖层
        isPicking = true;
        overlay.classList.remove('hidden');
        magnifier.style.display = 'block';
        pickBtn.textContent = 'Picking...';
        pickBtn.disabled = true;
        
    } catch (error) {
        console.error('无法访问屏幕:', error);
        alert('无法访问屏幕。请确保已授予屏幕共享权限。');
        stopPicking();
    }
}

// 鼠标移动事件
overlay.addEventListener('mousemove', (e) => {
    if (!isPicking || !screenCanvas.width || !screenCanvas.height) return;
    
    // 更新放大镜位置
    magnifier.style.left = e.clientX + 'px';
    magnifier.style.top = e.clientY + 'px';
    
    // 将浏览器窗口坐标转换为 Canvas 坐标
    // getDisplayMedia 捕获的是整个屏幕，但视频尺寸可能与屏幕不同
    // 这里假设视频尺寸比例与窗口相同（实际可能不同，取决于浏览器实现）
    const scaleX = screenCanvas.width / window.innerWidth;
    const scaleY = screenCanvas.height / window.innerHeight;
    
    const canvasX = e.clientX * scaleX;
    const canvasY = e.clientY * scaleY;
    
    // 更新放大镜（传入 Canvas 坐标）
    updateMagnifier(canvasX, canvasY);
});

// 点击拾取颜色
overlay.addEventListener('click', (e) => {
    if (!isPicking || !screenCanvas.width || !screenCanvas.height) return;
    
    // 将浏览器窗口坐标转换为 Canvas 坐标
    const scaleX = screenCanvas.width / window.innerWidth;
    const scaleY = screenCanvas.height / window.innerHeight;
    
    const canvasX = e.clientX * scaleX;
    const canvasY = e.clientY * scaleY;
    
    const color = getColorAtPosition(canvasX, canvasY);
    if (color) {
        updateColorDisplay(color.r, color.g, color.b);
        stopPicking();
        pickBtn.disabled = false;
    }
});

// ESC 键取消
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && isPicking) {
        stopPicking();
        pickBtn.disabled = false;
    }
});

// 开始拾取按钮
pickBtn.addEventListener('click', () => {
    if (!isPicking) {
        startPicking();
    }
});

// 复制按钮
copyBtn.addEventListener('click', () => {
    const hex = copyBtn.dataset.hex;
    if (hex) {
        navigator.clipboard.writeText(hex).then(() => {
            const originalText = copyBtn.textContent;
            copyBtn.textContent = 'Copied!';
            
            // 显示状态栏
            statusBar.classList.remove('hidden');
            
            setTimeout(() => {
                copyBtn.textContent = originalText;
                statusBar.classList.add('hidden');
            }, 1500);
        }).catch(err => {
            console.error('复制失败:', err);
            alert('复制失败，请手动复制: ' + hex);
        });
    }
});
