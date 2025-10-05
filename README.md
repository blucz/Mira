# Mira

A dead-simple image viewer / slideshow app. Built using Electron and Vue3 in an evening. 

I've been a long time user of HexCat's ViewIt. After the company shut down, it became impossible to get new license keys for the software, and it doesn't work properly on arm64 macs either.

This implements the minimal subset of the ViewIt functionality that I cared about in a barebones fashion. Essentially, you can drag/drop files and folders onto the app that contain image or video files, start/stop a slideshow, and flip through the images.

This was developed in 2023 with a healthy dose of ChatGPT and Github CoPilot. The App icon was created using Stable Diffusion.

## Keyboard commands:

- Left / a: view previous image
- Right / d: view next image
- Up / w: Increase slideshow interval
- Down / s: Decrease slideshow interval
- Home: go to first image
- End: go to last image
- x: remove current image from the list
- D/Del/backspace: delete current image from disk
- c: remove all images from the list
- r: randomize order of images
- q: quit
- o: open using system viewer
- spacebar: start/stop slideshow


