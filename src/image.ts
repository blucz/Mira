import fs from 'fs';
import { stat } from 'fs/promises';
import path from 'path';
import { ref, Ref } from 'vue';

const videoExtensions = ['.mp4', '.webm', '.mov', '.avi', '.mkv', '.ogg'];

export class Image {
  path: string;
  exists: Ref<boolean | undefined>;
  caption: Ref<string | undefined>;
  fileSize: Ref<number | undefined>;
  width: Ref<number | undefined>;
  height: Ref<number | undefined>;
  duration: Ref<number | undefined>;
  hasAudio: Ref<boolean | undefined>;

  constructor(path: string) {
    this.path = path;
    this.exists = ref(undefined);
    this.caption = ref(undefined);
    this.fileSize = ref(undefined);
    this.width = ref(undefined);
    this.height = ref(undefined);
    this.duration = ref(undefined);
    this.hasAudio = ref(undefined);

    stat(path).then((value) => {
      this.exists.value = value.isFile();
      this.fileSize.value = value.size;

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

  isVideo(): boolean {
    const ext = path.extname(this.path).toLowerCase();
    return videoExtensions.includes(ext);
  }

  get filename(): string {
    return path.basename(this.path);
  }

  get format(): string {
    return path.extname(this.path).slice(1).toUpperCase();
  }

  get resolution(): string {
    if (this.width?.value && this.height?.value) {
      return `${this.width.value} × ${this.height.value}`;
    }
    return 'Loading...';
  }

  get fileSizeFormatted(): string {
    if (!this.fileSize?.value) return 'Unknown';
    const size = this.fileSize.value;
    if (size < 1024) return `${size} B`;
    if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
    if (size < 1024 * 1024 * 1024) return `${(size / (1024 * 1024)).toFixed(1)} MB`;
    return `${(size / (1024 * 1024 * 1024)).toFixed(1)} GB`;
  }
}

