window.HELP_IMPROVE_VIDEOJS = false;

// More Works Dropdown Functionality
function toggleMoreWorks() {
    const dropdown = document.getElementById('moreWorksDropdown');
    const button = document.querySelector('.more-works-btn');
    
    if (dropdown.classList.contains('show')) {
        dropdown.classList.remove('show');
        button.classList.remove('active');
    } else {
        dropdown.classList.add('show');
        button.classList.add('active');
    }
}

// Close dropdown when clicking outside
document.addEventListener('click', function(event) {
    const container = document.querySelector('.more-works-container');
    const dropdown = document.getElementById('moreWorksDropdown');
    const button = document.querySelector('.more-works-btn');
    
    if (container && !container.contains(event.target)) {
        dropdown.classList.remove('show');
        button.classList.remove('active');
    }
});

// Close dropdown on escape key
document.addEventListener('keydown', function(event) {
    if (event.key === 'Escape') {
        const dropdown = document.getElementById('moreWorksDropdown');
        const button = document.querySelector('.more-works-btn');
        dropdown.classList.remove('show');
        button.classList.remove('active');
    }
});

// Copy BibTeX to clipboard
function copyBibTeX() {
    const bibtexElement = document.getElementById('bibtex-code');
    const button = document.querySelector('.copy-bibtex-btn');
    const copyText = button.querySelector('.copy-text');
    
    if (bibtexElement) {
        navigator.clipboard.writeText(bibtexElement.textContent).then(function() {
            // Success feedback
            button.classList.add('copied');
            copyText.textContent = 'Copied';
            
            setTimeout(function() {
                button.classList.remove('copied');
                copyText.textContent = 'Copy';
            }, 2000);
        }).catch(function(err) {
            console.error('Failed to copy: ', err);
            // Fallback for older browsers
            const textArea = document.createElement('textarea');
            textArea.value = bibtexElement.textContent;
            document.body.appendChild(textArea);
            textArea.select();
            document.execCommand('copy');
            document.body.removeChild(textArea);
            
            button.classList.add('copied');
            copyText.textContent = 'Copied';
            setTimeout(function() {
                button.classList.remove('copied');
                copyText.textContent = 'Copy';
            }, 2000);
        });
    }
}

// Scroll to top functionality
function scrollToTop() {
    window.scrollTo({
        top: 0,
        behavior: 'smooth'
    });
}

// Show/hide scroll to top button
window.addEventListener('scroll', function() {
    const scrollButton = document.querySelector('.scroll-to-top');
    if (window.pageYOffset > 300) {
        scrollButton.classList.add('visible');
    } else {
        scrollButton.classList.remove('visible');
    }
});

// Abstract video gallery auto-rotation
const ABSTRACT_VIDEO_ROTATE_DELAY = 5000;
let abstractVideoRotationTimer = null;
let currentAbstractVideoIndex = 0;

function getPreviewItems() {
    return Array.from(document.querySelectorAll('.preview-column .preview-item'));
}

// 修复后的双缓冲切换逻辑 (更稳健)
function updateMainAbstractVideoFromItem(item) {
    const layer1 = document.getElementById('video-layer-1');
    const layer2 = document.getElementById('video-layer-2');
    const caption = document.getElementById('abstractVideoCaption');

    if (!layer1 || !layer2 || !item) return;

    const newSrc = item.getAttribute('data-video-src');
    const newLabel = item.getAttribute('data-video-label') || '';

    if (!newSrc) return;

    // 1. 稳健地判断当前显示的是哪一层
    // 如果 layer1 有 active 类，那它就是当前层；否则认为 layer2 是当前层
    let activeVideo = layer1.classList.contains('active-layer') ? layer1 : layer2;
    let nextVideo = activeVideo === layer1 ? layer2 : layer1;

    // 2. 如果点击的是当前正在播放的视频，直接忽略，防止闪烁
    if (activeVideo.getAttribute('src') && activeVideo.src.includes(newSrc)) {
        return;
    }

    // 更新标题
    if (caption) caption.textContent = newLabel;

    // 3. 准备下一层视频
    nextVideo.src = newSrc;
    nextVideo.load(); // 强制重新加载

    // 定义切换动作：交换 active/hidden 类
    const performSwitch = () => {
        nextVideo.classList.add('active-layer');
        nextVideo.classList.remove('hidden-layer');
        
        activeVideo.classList.remove('active-layer');
        activeVideo.classList.add('hidden-layer');
        
        // 延迟暂停旧视频，给 CSS 过渡留出时间 (0.6s)
        setTimeout(() => {
            activeVideo.pause();
            activeVideo.currentTime = 0;
        }, 600);
    };

    // 4. 使用 onloadeddata 属性 (而不是 addEventListener)
    // 这样每次赋值都会覆盖上一次的监听，防止快速点击时事件堆积
    nextVideo.onloadeddata = () => {
        // 尝试播放
        const playPromise = nextVideo.play();

        if (playPromise !== undefined) {
            playPromise
                .then(() => {
                    // 播放成功，执行切换
                    performSwitch();
                })
                .catch(error => {
                    console.warn("Auto-play prevented, switching anyway:", error);
                    // 【关键修复】即使播放失败(如浏览器限制)，也要强制切换画面，否则会卡死
                    performSwitch();
                });
        } else {
            // 旧浏览器兼容
            performSwitch();
        }
        
        // 清理事件，防止后续重复触发
        nextVideo.onloadeddata = null;
    };
}

function highlightPreviewItemByIndex(index) {
    const items = getPreviewItems();
    if (items.length === 0) {
        return;
    }

    const safeIndex = ((index % items.length) + items.length) % items.length;
    currentAbstractVideoIndex = safeIndex;

    items.forEach((btn, idx) => {
        const isCurrent = idx === safeIndex;
        btn.classList.toggle('is-active', isCurrent);
        btn.setAttribute('aria-selected', isCurrent ? 'true' : 'false');
    });

    updateMainAbstractVideoFromItem(items[safeIndex]);
}

function scheduleAbstractVideoRotation() {
    if (abstractVideoRotationTimer) {
        clearTimeout(abstractVideoRotationTimer);
    }

    abstractVideoRotationTimer = setTimeout(() => {
        const items = getPreviewItems();
        if (items.length === 0) {
            return;
        }

        const nextIndex = (currentAbstractVideoIndex + 1) % items.length;
        highlightPreviewItemByIndex(nextIndex);
        scheduleAbstractVideoRotation();
    }, ABSTRACT_VIDEO_ROTATE_DELAY);
}

function handleManualPreviewSelection(index) {
    highlightPreviewItemByIndex(index);
    scheduleAbstractVideoRotation();
}

function initAbstractVideoGallery() {
    const items = getPreviewItems();

    if (items.length === 0) {
        return;
    }

    items.forEach((item, idx) => {
        item.addEventListener('click', () => {
            handleManualPreviewSelection(idx);
        });

        item.addEventListener('keydown', (event) => {
            if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault();
                handleManualPreviewSelection(idx);
            }
        });
    });

    highlightPreviewItemByIndex(0);
    scheduleAbstractVideoRotation();
}

// Video carousel autoplay when in view
function setupVideoCarouselAutoplay() {
    const carouselVideos = document.querySelectorAll('.results-carousel video');
    
    if (carouselVideos.length === 0) return;
    
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            const video = entry.target;
            if (entry.isIntersecting) {
                // Video is in view, play it
                video.play().catch(e => {
                    // Autoplay failed, probably due to browser policy
                    console.log('Autoplay prevented:', e);
                });
            } else {
                // Video is out of view, pause it
                video.pause();
            }
        });
    }, {
        threshold: 0.5 // Trigger when 50% of the video is visible
    });
    
    carouselVideos.forEach(video => {
        observer.observe(video);
    });
}

$(document).ready(function() {
    // Check for click events on the navbar burger icon

    var options = {
		slidesToScroll: 1,
		slidesToShow: 1,
		loop: true,
		infinite: true,
		autoplay: true,
		autoplaySpeed: 5000,
    }

	// Initialize all div with carousel class
    var carousels = bulmaCarousel.attach('.carousel', options);
	
    bulmaSlider.attach();
    
    // Setup video autoplay for carousel
    setupVideoCarouselAutoplay();

    initAbstractVideoGallery();
    initProgressiveVideoShowcase();

})

// =========================================
// Progressive Snow Effect Showcase
// =========================================

function initProgressiveVideoShowcase() {
    const steps = document.querySelectorAll('.progressive-step');
    const progressBar = document.getElementById('progressiveTimelineProgress');
    
    if (steps.length === 0) return;

    let currentStep = 0;

    steps.forEach((step, index) => {
        step.addEventListener('click', () => {
            toggleStep(index);
        });

        step.addEventListener('keydown', (event) => {
            if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault();
                toggleStep(index);
            }
        });
    });

    function toggleStep(index) {
        if (index < 0 || index >= steps.length) return;
        
        const step = steps[index];
        const isCurrentlyActive = step.classList.contains('is-active');
        
        // If clicking the active step, deactivate it and go back to previous (or first)
        if (isCurrentlyActive) {
            // Find the previous active step (or go to first if current is first)
            let targetIndex = index > 0 ? index - 1 : 0;
            switchToStep(targetIndex);
        } else {
            // Normal switch to clicked step
            switchToStep(index);
        }
    }

    function switchToStep(index) {
        if (index < 0 || index >= steps.length) return;
        
        const step = steps[index];
        const videoSrc = step.getAttribute('data-video-src');
        const videoLabel = step.getAttribute('data-video-label');

        if (!videoSrc) return;

        // Update active state
        steps.forEach((s, i) => {
            s.classList.toggle('is-active', i === index);
        });

        // Update progress bar
        if (progressBar) {
            const progress = ((index + 1) / steps.length) * 100;
            progressBar.style.width = `${progress}%`;
        }

        // Switch video
        updateProgressiveVideo(videoSrc, videoLabel);
        currentStep = index;
    }

    // Initialize first step
    switchToStep(0);
}

function updateProgressiveVideo(newSrc, newLabel) {
    const layer1 = document.getElementById('progressive-video-layer-1');
    const layer2 = document.getElementById('progressive-video-layer-2');
    const caption = document.getElementById('progressiveVideoCaption');
    const loader = document.querySelector('.progressive-video-loader');

    if (!layer1 || !layer2) return;

    // Check if already playing this video
    let activeVideo = layer1.classList.contains('active-layer') ? layer1 : layer2;
    if (activeVideo.getAttribute('src') && activeVideo.src.includes(newSrc)) {
        return;
    }

    // Save current playback time to sync with next video
    const currentTime = activeVideo.currentTime;

    // Update caption
    if (caption && newLabel) {
        const icon = caption.querySelector('i');
        caption.innerHTML = icon ? `<i class="${icon.className}"></i> ${newLabel}` : `<i class="fas fa-video"></i> ${newLabel}`;
    }

    // Show loader
    if (loader) {
        loader.classList.add('show');
    }

    // Prepare next layer
    let nextVideo = activeVideo === layer1 ? layer2 : layer1;
    nextVideo.src = newSrc;
    nextVideo.load();

    const performSwitch = () => {
        // Set the same playback time before switching
        nextVideo.currentTime = currentTime;
        
        nextVideo.classList.add('active-layer');
        nextVideo.classList.remove('hidden-layer');
        
        activeVideo.classList.remove('active-layer');
        activeVideo.classList.add('hidden-layer');
        
        // Hide loader
        if (loader) {
            loader.classList.remove('show');
        }
        
        // Pause old video after transition (but keep its time for potential future use)
        setTimeout(() => {
            activeVideo.pause();
        }, 600);
    };

    nextVideo.onloadeddata = () => {
        // Set the playback time to match current video
        nextVideo.currentTime = currentTime;
        
        const playPromise = nextVideo.play();

        if (playPromise !== undefined) {
            playPromise
                .then(() => {
                    performSwitch();
                })
                .catch(error => {
                    console.warn("Auto-play prevented, switching anyway:", error);
                    performSwitch();
                });
        } else {
            performSwitch();
        }
        
        nextVideo.onloadeddata = null;
    };
}
