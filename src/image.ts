import fs from 'fs';
import { stat } from 'fs/promises';
import path from 'path';
import { ref, Ref } from 'vue';

export class Image {
  path: string;
  exists: Ref<boolean | undefined>;

  constructor(path: string) {
    this.path = path;
    this.exists = ref(undefined);

    stat(path).then((value) => {
      this.exists.value = value.isFile();
    }).catch((reason) => {
      this.exists.value = false;
      console.log(`Image ${path} does not exist: ${reason}`);
    });
  }

  get url(): string {
    return "atom://"+this.path; 
  }
}

