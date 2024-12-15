import fs from 'fs';
import path from 'path';

export const supportedExtensions = [ '.jpg', '.png', '.gif', '.webp'/*, '.mp4' */];

export function findFilesWithExtensions(pathsOrDirs: string | string[], extensions: string[], fileList: string[] = []): string[] {
  if (!Array.isArray(pathsOrDirs)) {
    pathsOrDirs = [pathsOrDirs];
  }

  for (const pathOrDir of pathsOrDirs) {
    const stat = fs.statSync(pathOrDir);
    if (stat.isDirectory()) {
      const files = fs.readdirSync(pathOrDir);
      for (const file of files) {
        const filePath = path.join(pathOrDir, file);
        findFilesWithExtensions(filePath, extensions, fileList);
      }
    } else if (stat.isFile()) {
      const fileExtension = path.extname(pathOrDir);
      if (extensions.includes(fileExtension)) {
        fileList.push(pathOrDir);
      }
    }
  }
  return fileList;
}

export function shuffleArray<T>(array: T[]): T[] {
  // Loop over the array from the end to the beginning
  for (let i = array.length - 1; i > 0; i--) {
    // Generate a random index between 0 and i
    const j = Math.floor(Math.random() * (i + 1));
    // Swap the elements at index i and index j
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}
