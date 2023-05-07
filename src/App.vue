<script setup lang="ts">
import { ref, Ref } from 'vue';
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
const slideshowDurationMs : Ref<number>            = ref(5000);


type IntervalId = ReturnType<typeof setInterval>;
let slideshowIntervalTimer : IntervalId | undefined = undefined;

function update() {
  if (index.value < 0 && images.length > 0) index.value = 0;
  if (index.value >= images.length)         index.value = images.length - 1;
  image.value = images[index.value];
  count.value = images.length;
}

function addImageFiles(paths: string[]): void {
  const oldCount = images.length;
  for (let path of paths) {
    if (imagePaths.has(path)) continue;
    imagePaths.add(path);
    images.push(new Image(path));
  }
  const newCount = images.length;
  if (newCount > oldCount) {
    index.value = oldCount+1;
  }
  update();
}

function toggleSlideshow() {
  if (slideshowIntervalTimer) {
    clearInterval(slideshowIntervalTimer);
    slideshowIntervalTimer = undefined;
  } else {
    slideshowIntervalTimer = setInterval(function() {
      const oldValue = index.value;
      index.value = index.value + 1;
      update();

      // If we couldn't advance, stop slideshow
      if (oldValue == index.value) {
        toggleSlideshow();
      }
    }, slideshowDurationMs.value);
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
  if (event.keyCode === 37) { // Left arrow - Previous Image
    prevImage();
  } else if (event.keyCode === 39) { // Right arrow - Next Image
    nextImage();
  } else if (event.keyCode === 38) { // Up arrow - Increase Slideshow Duration
    increaseSlideshowDuration();
  } else if (event.keyCode === 40) { // Down arrow - Decreas Slideshow Duration
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
    removeCurrent();
  } else if (event.keyCode == 67) { // 'c', remove all images
    removeAll();
  } else if (event.keyCode == 68) { // 'd', delete file 
    deleteCurrent();
  }
  update();
};

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
      <img id='image' v-if='image' :src='image.url' />

    </div>
    <div id='xofy' v-if='index >= 0'>
      <div>
        {{index+1}} / {{count}} 
      </div>
      <div style='text-align:right'>
        {{slideshowDurationMs/1000}}s
      </div>
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
  #xofy {
    position: absolute;
    right: 8px;
    top: 8px;
    background-color: rgba(0, 0, 0, 0.6);
    color: #eee;
    padding: 8px;
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
  .drag-over {
    color: #aaa;
    transition: color 0.5s ease;
  }
</style>
