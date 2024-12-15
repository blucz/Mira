import fs from 'fs';
import { stat } from 'fs/promises';
import path from 'path';
import { ref, Ref } from 'vue';

export class Image {
  path: string;
  exists: Ref<boolean | undefined>;
  caption: Ref<string | undefined>;

  constructor(path: string) {
    this.path = path;
    this.exists = ref(undefined);
    this.caption = ref(undefined);

    stat(path).then((value) => {
      this.exists.value = value.isFile();
      // Check for caption file
      const captionPath = path.replace(/\.[^/.]+$/, "") + ".txt";
      try {
        if (fs.existsSync(captionPath)) {
          this.caption.value = fs.readFileSync(captionPath, 'utf8');
        }
      } catch (error) {
        console.log(`Error reading caption file for ${path}: ${error}`);
      }
    }).catch((reason) => {
      this.exists.value = false;
      console.log(`Image ${path} does not exist: ${reason}`);
    });
  }

  get url(): string {
    return "atom://"+this.path; 
  }
}

