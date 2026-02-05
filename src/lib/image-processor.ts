import gm from 'gm';
import { promisify } from 'util';
import path from 'path';

// GraphicsMagick 인스턴스 생성
const imageMagick = gm.subClass({ imageMagick: false });

export interface ImageProcessOptions {
  width?: number;
  height?: number;
  quality?: number;
  format?: string;
  crop?: {
    width: number;
    height: number;
    x: number;
    y: number;
  };
}

/**
 * 이미지 리사이즈
 */
export async function resizeImage(
  inputPath: string,
  outputPath: string,
  width: number,
  height?: number
): Promise<void> {
  return new Promise((resolve, reject) => {
    const img = imageMagick(inputPath);

    if (height) {
      img.resize(width, height);
    } else {
      img.resize(width);
    }

    img.write(outputPath, (err) => {
      if (err) reject(err);
      else resolve();
    });
  });
}

/**
 * 이미지 압축 (품질 조정)
 */
export async function compressImage(
  inputPath: string,
  outputPath: string,
  quality: number = 80
): Promise<void> {
  return new Promise((resolve, reject) => {
    imageMagick(inputPath)
      .quality(quality)
      .write(outputPath, (err) => {
        if (err) reject(err);
        else resolve();
      });
  });
}

/**
 * 이미지 포맷 변환
 */
export async function convertImageFormat(
  inputPath: string,
  outputPath: string,
  format: string
): Promise<void> {
  return new Promise((resolve, reject) => {
    imageMagick(inputPath)
      .setFormat(format)
      .write(outputPath, (err) => {
        if (err) reject(err);
        else resolve();
      });
  });
}

/**
 * 이미지 자르기
 */
export async function cropImage(
  inputPath: string,
  outputPath: string,
  width: number,
  height: number,
  x: number = 0,
  y: number = 0
): Promise<void> {
  return new Promise((resolve, reject) => {
    imageMagick(inputPath)
      .crop(width, height, x, y)
      .write(outputPath, (err) => {
        if (err) reject(err);
        else resolve();
      });
  });
}

/**
 * 이미지 회전
 */
export async function rotateImage(
  inputPath: string,
  outputPath: string,
  degrees: number
): Promise<void> {
  return new Promise((resolve, reject) => {
    imageMagick(inputPath)
      .rotate('white', degrees)
      .write(outputPath, (err) => {
        if (err) reject(err);
        else resolve();
      });
  });
}

/**
 * 이미지 정보 가져오기
 */
export async function getImageInfo(inputPath: string): Promise<{
  width: number;
  height: number;
  format: string;
  size: number;
}> {
  return new Promise((resolve, reject) => {
    imageMagick(inputPath).identify((err, data) => {
      if (err) {
        reject(err);
      } else {
        resolve({
          width: data.size.width,
          height: data.size.height,
          format: data.format,
          size: data.filesize || 0,
        });
      }
    });
  });
}

/**
 * 썸네일 생성
 */
export async function createThumbnail(
  inputPath: string,
  outputPath: string,
  width: number = 200,
  height: number = 200
): Promise<void> {
  return new Promise((resolve, reject) => {
    imageMagick(inputPath)
      .thumbnail(width, height)
      .write(outputPath, (err) => {
        if (err) reject(err);
        else resolve();
      });
  });
}

/**
 * PDF를 이미지로 변환 (첫 페이지)
 */
export async function pdfToImage(
  pdfPath: string,
  outputPath: string,
  page: number = 0
): Promise<void> {
  return new Promise((resolve, reject) => {
    imageMagick(`${pdfPath}[${page}]`)
      .setFormat('png')
      .write(outputPath, (err) => {
        if (err) reject(err);
        else resolve();
      });
  });
}

/**
 * 워터마크 추가
 */
export async function addWatermark(
  inputPath: string,
  outputPath: string,
  watermarkPath: string,
  gravity: string = 'SouthEast'
): Promise<void> {
  return new Promise((resolve, reject) => {
    imageMagick(inputPath)
      .composite(watermarkPath)
      .gravity(gravity)
      .write(outputPath, (err) => {
        if (err) reject(err);
        else resolve();
      });
  });
}

/**
 * 이미지 일괄 처리
 */
export async function processImage(
  inputPath: string,
  outputPath: string,
  options: ImageProcessOptions
): Promise<void> {
  return new Promise((resolve, reject) => {
    let img = imageMagick(inputPath);

    if (options.width || options.height) {
      img = img.resize(options.width, options.height);
    }

    if (options.quality) {
      img = img.quality(options.quality);
    }

    if (options.format) {
      img = img.setFormat(options.format);
    }

    if (options.crop) {
      img = img.crop(
        options.crop.width,
        options.crop.height,
        options.crop.x,
        options.crop.y
      );
    }

    img.write(outputPath, (err) => {
      if (err) reject(err);
      else resolve();
    });
  });
}

export default {
  resizeImage,
  compressImage,
  convertImageFormat,
  cropImage,
  rotateImage,
  getImageInfo,
  createThumbnail,
  pdfToImage,
  addWatermark,
  processImage,
};
