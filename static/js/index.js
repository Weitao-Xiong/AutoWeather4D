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

// 双缓冲视频切换逻辑
function updateMainAbstractVideoFromItem(item) {
    // 获取两个视频层
    const layer1 = document.getElementById('video-layer-1');
    const layer2 = document.getElementById('video-layer-2');
    const caption = document.getElementById('abstractVideoCaption');

    if (!layer1 || !layer2 || !item) return;

    const newSrc = item.getAttribute('data-video-src');
    const newLabel = item.getAttribute('data-video-label') || '';

    if (!newSrc) return;

    // 1. 确定谁是当前显示的 (active)，谁是后台的 (hidden)
    let activeVideo, nextVideo;
    if (layer1.classList.contains('active-layer')) {
        activeVideo = layer1;
        nextVideo = layer2;
    } else {
        activeVideo = layer2;
        nextVideo = layer1;
    }

    // 如果点的就是当前视频，啥也不做
    // 注意：这里比较的是 src 的相对/绝对路径，可能需要处理一下，或者简单比较文件名
    if (activeVideo.getAttribute('src').includes(newSrc)) {
        return;
    }

    // 2. 更新标题 (可以立即更新，或者等视频切过去再更新，这里选择立即更新)
    if (caption) caption.textContent = newLabel;

    // 3. 在后台层加载新视频
    nextVideo.src = newSrc;
    nextVideo.load();

    // 4. 监听 'loadeddata' 事件，等视频准备好了再切换
    // 定义一个一次性处理函数
    const handleReadyToSwitch = () => {
        // 只有当新视频真的可以播放时
        nextVideo.play().then(() => {
            // A. 让后台视频浮现
            nextVideo.classList.remove('hidden-layer');
            nextVideo.classList.add('active-layer');

            // B. 让前台视频隐退
            activeVideo.classList.remove('active-layer');
            activeVideo.classList.add('hidden-layer');

            // C. 隐退的视频暂停，节省资源 (延迟一点点，等转场动画结束)
            setTimeout(() => {
                activeVideo.pause();
                activeVideo.currentTime = 0; // 重置进度
            }, 600); // 这个时间要和 CSS 里的 transition 时间一致

        }).catch(err => console.error("Video play failed:", err));

        // 清理监听器
        nextVideo.removeEventListener('loadeddata', handleReadyToSwitch);
    };

    // 绑定监听
    nextVideo.addEventListener('loadeddata', handleReadyToSwitch);
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

})
