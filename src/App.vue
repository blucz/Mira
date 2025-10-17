<script setup lang="ts">
import { ref, Ref, toRaw } from 'vue';
import { supportedExtensions, findFilesWithExtensions, shuffleArray } from './utils';
import { Image } from './image';
import { ipcRenderer } from 'electron';

const dropIcon : Ref<HTMLElement | null> = ref(null);

defineProps<{ }>();

const imagePaths = new Set<string>();
const images : Image[] = [];

const slideshowDurations = [ 1000, 2000, 5000, 10000, 15000, 20000, 30000, 60000 ];

const index               : Ref<number>            = ref(-1);
const count               : Ref<number>            = ref(-1);
const image               : Ref<Image | undefined> = ref(undefined);
const isSlideshow         : Ref<boolean>           = ref(false);
const slideshowDurationMs : Ref<number>            = ref(10000);
const showCaptions        : Ref<boolean>           = ref(true);
const showInfo            : Ref<boolean>           = ref(localStorage.getItem('showInfo') === 'true');
const videoProgress       : Ref<number>            = ref(0);
const isMuted             : Ref<boolean>           = ref(true);
const isLoopEnabled       : Ref<boolean>           = ref(false);


type IntervalId = ReturnType<typeof setInterval>;
let slideshowIntervalTimer : IntervalId | undefined = undefined;

function update() {
  if (index.value < 0 && images.length > 0) index.value = 0;
  if (index.value >= images.length)         index.value = images.length - 1;
  image.value = images[index.value];
  count.value = images.length;
  videoProgress.value = 0; // Reset video progress when changing images

  // Set represented file for macOS title bar
  if (image.value) {
    ipcRenderer.invoke('set-represented-file', { path: image.value.path });
  }
}

function formatFileSize(size: number): string {
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
  if (size < 1024 * 1024 * 1024) return `${(size / (1024 * 1024)).toFixed(1)} MB`;
  return `${(size / (1024 * 1024 * 1024)).toFixed(1)} GB`;
}

function addImageFiles(paths: string[]): void {
  const oldCount = images.length;
  for (let path of paths) {
    if (imagePaths.has(path)) {
      // If image already exists, jump to it
      const existingIndex = images.findIndex(img => img.path === path);
      if (existingIndex >= 0) {
        index.value = existingIndex;
      }
    } else {
      imagePaths.add(path);
      images.push(new Image(path));
    }
  }
  const newCount = images.length;
  if (newCount > oldCount) {
    index.value = oldCount;
  }
  update();
}

function toggleSlideshow() {
console.log("toggleslideshow")
  if (slideshowIntervalTimer) {
    clearInterval(slideshowIntervalTimer);
    slideshowIntervalTimer = undefined;
    isSlideshow.value = false;
  } else {
    slideshowIntervalTimer = setInterval(function() {
      const oldValue = index.value;
      index.value = index.value + 1;

      // If we reached the end
      if (index.value >= images.length) {
        if (isLoopEnabled.value) {
          index.value = 0; // Loop back to start
        } else {
          index.value = oldValue; // Stay at last image
          toggleSlideshow(); // Stop slideshow
          return;
        }
      }

      update();

      // If we couldn't advance (shouldn't happen with new logic, but keep as safeguard)
      if (oldValue == index.value) {
        toggleSlideshow();
      }
    }, slideshowDurationMs.value);
    isSlideshow.value = true;
  }
  update();
}

function resetSlideshow() {
  if (slideshowIntervalTimer) {
    toggleSlideshow();
    toggleSlideshow();
  }
}

function increaseSlideshowDuration() {
  const currentIndex = slideshowDurations.indexOf(slideshowDurationMs.value);
  if (currentIndex !== slideshowDurations.length - 1) {
    slideshowDurationMs.value = slideshowDurations[currentIndex + 1];
    resetSlideshow();
  }
}

function decreaseSlideshowDuration() {
  const currentIndex = slideshowDurations.indexOf(slideshowDurationMs.value);
  if (currentIndex !== 0) {
    slideshowDurationMs.value = slideshowDurations[currentIndex - 1];
    resetSlideshow();
  }
}

function goToFirst() { if (index.value >= 0) { index.value = 0; } resetSlideshow(); }
function goToLast()  { index.value = images.length - 1;           resetSlideshow(); }
function nextImage() { index.value = index.value + 1;             resetSlideshow(); }
function prevImage() { index.value = index.value - 1;             resetSlideshow(); }

function removeCurrent() {
  console.log("removeCurrent()");
  if (image) {
    imagePaths.delete(image.value!.path);
    images.splice(index.value, 1)
  }
}

function openFileUsingSystemViewer() {
    ipcRenderer.invoke('open-file', { 'path': image.value!.path });
}

function removeAll() {
  console.log("removeAll()");
  images.length = 0;
  imagePaths.clear();
}

function deleteCurrent() {
  console.log("deleteCurrent()");
  if (image) {
    imagePaths.delete(image.value!.path);
    images.splice(index.value, 1)
    ipcRenderer.invoke('delete-image', { 'path': image.value!.path });
  }
}

const handleKey = (event: any) => {
  console.log(`on keydown keycode=${event.keyCode}`);
  if (event.keyCode == 8 || event.keyCode == 46 || (event.keyCode == 68 && event.shiftKey)) { // 'D'/del/backspace, delete file
    deleteCurrent();
  } else if (event.keyCode === 37 || event.keyCode == 65) {        // Left arrow / 'a' - Previous Image
    prevImage();
  } else if (event.keyCode === 39 || event.keyCode == 68) { // Right arrow / 'd' - Next Image
    nextImage();
  } else if (event.keyCode === 38 || event.keyCode == 87) { // Up arrow / 'w' - Increase Slideshow Duration
    increaseSlideshowDuration();
  } else if (event.keyCode === 40 || event.keyCode === 83) { // Down arrow / 's' - Decrease Slideshow Duration
    decreaseSlideshowDuration();
  } else if (event.keyCode == 82) { // 'r' - Randomize
    shuffleArray(images);
  } else if (event.keyCode == 32) { // ' ' - Start/Stop Slideshow
    toggleSlideshow();
  } else if (event.keyCode == 36) { // Home, go to first image
    goToFirst();
  } else if (event.keyCode == 35) { // End, go to last image
    goToLast();
  } else if (event.keyCode == 88) { // 'x', remove current image
    removeCurrent()
  } else if (event.keyCode == 67 && event.shiftKey) { // 'C', toggle captions
    showCaptions.value = !showCaptions.value;
  } else if (event.keyCode == 67) { // 'c', remove all images
    removeAll();
  } else if (event.keyCode == 79) { // 'o', open file using system viewer
    openFileUsingSystemViewer();
  } else if (event.keyCode == 73) { // 'i', toggle info overlay
    showInfo.value = !showInfo.value;
    localStorage.setItem('showInfo', showInfo.value.toString());
  } else if (event.keyCode == 77) { // 'm', toggle mute
    isMuted.value = !isMuted.value;
  } else if (event.keyCode == 76) { // 'l', toggle loop
    isLoopEnabled.value = !isLoopEnabled.value;
  }
  update();
};

const onImageLoad = (event: Event) => {
  const img = event.target as HTMLImageElement;
  const currentImage = image.value;
  if (currentImage && currentImage.url === img.src) {
    // Use toRaw to get the actual Image object with its Ref properties
    const rawImage = toRaw(currentImage);
    console.log('rawImage:', rawImage);
    console.log('rawImage.width:', rawImage.width);
    console.log('rawImage.height:', rawImage.height);
    if (rawImage.width && rawImage.height) {
      rawImage.width.value = img.naturalWidth;
      rawImage.height.value = img.naturalHeight;
      console.log('Set dimensions:', rawImage.width.value, rawImage.height.value);
    }
  }
};

const onVideoLoad = (event: Event) => {
  const video = event.target as HTMLVideoElement;
  const currentImage = image.value;
  if (currentImage && currentImage.url === video.src) {
    const rawImage = toRaw(currentImage);
    if (rawImage.width && rawImage.height) {
      rawImage.width.value = video.videoWidth;
      rawImage.height.value = video.videoHeight;
    }
    if (rawImage.duration) {
      rawImage.duration.value = video.duration;
    }
    if (rawImage.hasAudio) {
      // Default to true (assume audio) - will hide if we detect no audio
      rawImage.hasAudio.value = true;

      // Check after a short delay to allow audio tracks to be detected
      setTimeout(() => {
        const hasAudioTrack = (video as any).mozHasAudio ||
                             Boolean((video as any).webkitAudioDecodedByteCount) ||
                             Boolean((video as any).audioTracks && (video as any).audioTracks.length);
        rawImage.hasAudio.value = hasAudioTrack;
      }, 100);
    }
  }
};

const onVideoTimeUpdate = (event: Event) => {
  const video = event.target as HTMLVideoElement;
  if (video.duration > 0) {
    const newProgress = (video.currentTime / video.duration) * 100;
    // If progress went backwards (video looped), reset to 0 first for crisp restart
    if (newProgress < videoProgress.value - 10) {
      videoProgress.value = 0;
      // Use setTimeout to allow the DOM to update before setting new progress
      setTimeout(() => {
        videoProgress.value = newProgress;
      }, 0);
    } else {
      videoProgress.value = newProgress;
    }
  }
};

const getProgressTransition = () => {
  // Smooth transition that matches typical timeupdate interval (~250ms)
  return 'width 0.5s linear';
};

function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

const handleDragEnter = (event: DragEvent) => { event.preventDefault(); if (dropIcon.value) dropIcon.value.classList.add('drag-over'); };
const handleDragOver  = (event: DragEvent) => { event.preventDefault(); };
const handleDragLeave = (event: DragEvent) => { if (dropIcon.value) dropIcon.value.classList.remove('drag-over'); };
const handleDrop = (event: DragEvent) => {
  event.preventDefault();
  const files = Array.from(event.dataTransfer!.files);
  const paths = files.map(file => file.path);
  const imageFiles = findFilesWithExtensions(paths, supportedExtensions);
  addImageFiles(imageFiles);
};

window.addEventListener('keydown', handleKey);

</script>

<template>
  <div class="app-container">
    <div id="image-container" @dragenter="handleDragEnter" @dragover="handleDragOver" @dragleave="handleDragLeave" @drop="handleDrop">
      <div ref='dropIcon' class="bi bi-card-image" style='font-size: 160px' v-if='!image' />
      <img id='image' v-if='image && !image.isVideo()' :src='image.url' @load='onImageLoad' />
      <video id='video' v-if='image && image.isVideo()' :src='image.url' autoplay loop :muted='isMuted' @loadedmetadata='onVideoLoad' @timeupdate='onVideoTimeUpdate' />
      <div id='caption' v-if='image && image.caption && showCaptions'>{{ image.caption }}</div>
      <div id='video-progress' v-if='image && image.isVideo()'>
        <div id='video-progress-bar' :style="{ width: videoProgress + '%', transition: videoProgress < 5 ? 'none' : getProgressTransition() }"></div>
      </div>
    </div>
    <div id='info-overlay' v-if='image && showInfo'>
      <div>{{ image.filename }}</div>
      <div>
        {{ image.format }}
        <span v-if='image.fileSize'> • {{ formatFileSize(image.fileSize as any) }}</span>
        <span v-if='image.duration'> • {{ formatDuration(image.duration as any) }}</span>
        <span v-if='image.width && image.height'> • {{ image.width }} × {{ image.height }}</span>
      </div>
    </div>
    <div id='xofy' v-if='index >= 0'>
      <div>
        {{index+1}} / {{count}}
      </div>
      <div style='text-align:right'>
        <span v-if='isSlideshow'>
          <i v-if='isLoopEnabled' class='bi bi-arrow-repeat' style='margin-right: 4px'></i>
          {{slideshowDurationMs/1000}}s
        </span>
      </div>
    </div>
    <div id='audio-control' v-if='image && image.isVideo() && image.hasAudio' @click='isMuted = !isMuted'>
      <i :class="isMuted ? 'bi bi-volume-mute-fill' : 'bi bi-volume-up-fill'"></i>
    </div>
  </div>
</template>

<style>
  .app-container {
    width: 100%;
    height: 100%;
    margin: 0;
    padding: 0;
  }
  #caption {
    position: absolute;
    bottom: 0;
    left: 0;
    right: 0;
    background-color: rgba(0, 0, 0, 0.75);
    color: #fff;
    padding: 16px;
    text-align: center;
    font-size: 1.1em;
  }
  #info-overlay {
    position: absolute;
    left: 8px;
    top: 8px;
    background-color: rgba(0, 0, 0, 0.75);
    color: #eee;
    padding: 8px 10px;
    font-family: monospace;
    font-size: 0.75em;
    line-height: 1.4;
  }
  #xofy {
    position: absolute;
    right: 8px;
    top: 8px;
    background-color: rgba(0, 0, 0, 0.6);
    color: #eee;
    padding: 8px;
  }
  #audio-control {
    position: absolute;
    right: 8px;
    bottom: 8px;
    background-color: rgba(0, 0, 0, 0.6);
    color: #eee;
    padding: 8px;
    font-size: 1.2em;
    cursor: pointer;
  }
  #image-container {
      color: #666;
      height: 100%;
      width: 100%;
      display: flex;
      justify-content: center;
      align-items: center;
  }
  #image {
      height: 100%;
      width: 100%;
      object-fit: contain;
  }
  #video {
      height: 100%;
      width: 100%;
      object-fit: contain;
  }
  #video-progress {
    position: absolute;
    bottom: 0;
    left: 0;
    right: 0;
    height: 3px;
    background-color: rgba(255, 255, 255, 0.1);
  }
  #video-progress-bar {
    height: 100%;
    background-color: rgba(255, 255, 255, 0.4);
  }
  .drag-over {
    color: #aaa;
    transition: color 0.5s ease;
  }
</style>
