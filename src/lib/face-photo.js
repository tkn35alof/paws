import { FaceDetector, FilesetResolver } from '@mediapipe/tasks-vision'

export const FACE_MODEL_URL = 'https://storage.googleapis.com/mediapipe-models/face_detector/blaze_face_short_range/float16/1/blaze_face_short_range.tflite'
export const FACE_WASM_URL = 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@1.0.1/wasm'
export const FACE_MIN_CONFIDENCE = 0.65
export const FACE_OUTPUT_WIDTH = 800
export const FACE_OUTPUT_HEIGHT = 1000

let detectorPromise

class FacePhotoError extends Error {
  constructor(message, code) {
    super(message)
    this.name = 'FacePhotoError'
    this.code = code
  }
}

export function photoErrorMessage(error) {
  const message = typeof error?.message === 'string' ? error.message.trim() : ''
  return message || 'Face check failed. Try another photo.'
}

function boxFor(detection) {
  const box = detection?.boundingBox
  if (!box) return null
  const x = Number(box.originX)
  const y = Number(box.originY)
  const width = Number(box.width)
  const height = Number(box.height)
  if (![x, y, width, height].every(Number.isFinite) || width <= 0 || height <= 0) return null
  return { x, y, width, height }
}

function faceScore(detection) {
  return Number(detection?.categories?.[0]?.score ?? 0)
}

export function largestFace(detections = []) {
  return (detections || []).reduce((largest, detection) => {
    const box = boxFor(detection)
    if (!box) return largest
    const area = box.width * box.height
    const largestBox = boxFor(largest)
    const largestArea = largestBox ? largestBox.width * largestBox.height : 0
    return area > largestArea ? detection : largest
  }, null)
}

export function faceCropRect({ imageWidth, imageHeight, detection }) {
  const width = Number(imageWidth)
  const height = Number(imageHeight)
  const box = boxFor(detection)
  if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0 || !box) {
    throw new TypeError('A positive image size and a pixel face box are required')
  }
  if (![box.x, box.y, box.width, box.height].every(Number.isInteger)) {
    throw new RangeError('The detected face box is outside the source image')
  }
  if (box.x < 0 || box.y < 0 || box.x + box.width > width || box.y + box.height > height) {
    throw new RangeError('The detected face box is outside the source image')
  }

  // MediaPipe Tasks Vision reports integer pixel boxes for IMAGE-mode input.
  const facePixelWidth = box.width
  const facePixelHeight = box.height
  const faceCenterX = box.x + box.width / 2
  const faceCenterY = box.y + box.height / 2

  if (faceCenterX < 0 || faceCenterY < 0 || faceCenterX > width || faceCenterY > height) {
    throw new RangeError('The detected face box is outside the source image')
  }

  // Leave context around the face while keeping a narrow portrait source intact.
  let cropWidth = Math.min(width, Math.max(facePixelWidth * 2.2, Math.min(width, height * 0.8)))
  let cropHeight = cropWidth * 1.25
  if (cropHeight > height) {
    cropHeight = height
    cropWidth = cropHeight * 0.8
  }

  const x = Math.min(Math.max(0, faceCenterX - cropWidth / 2), Math.max(0, width - cropWidth))
  const idealTop = faceCenterY - cropHeight * 0.42
  const y = Math.min(Math.max(0, idealTop), Math.max(0, height - cropHeight))

  return { x, y, width: cropWidth, height: cropHeight }
}

async function loadDetector() {
  if (!detectorPromise) {
    detectorPromise = (async () => {
      const vision = await FilesetResolver.forVisionTasks(FACE_WASM_URL)
      return FaceDetector.createFromOptions(vision, {
        baseOptions: { modelAssetPath: FACE_MODEL_URL },
        minDetectionConfidence: FACE_MIN_CONFIDENCE,
      })
    })().catch((error) => {
      detectorPromise = null
      throw error
    })
  }
  return detectorPromise
}

function loadImage(source) {
  return new Promise((resolve, reject) => {
    const image = new Image()
    image.onload = () => resolve(image)
    image.onerror = () => reject(new FacePhotoError('That image could not be read.', 'IMAGE_READ_FAILED'))
    image.src = source
  })
}

function canvasBlob(canvas) {
  if (typeof canvas.convertToBlob === 'function') {
    return canvas.convertToBlob({ type: 'image/jpeg', quality: 0.92 })
  }
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => blob ? resolve(blob) : reject(new Error('Crop conversion failed')), 'image/jpeg', 0.92)
  })
}

export async function analyzePhoto(file) {
  if (!file || !String(file.type || '').startsWith('image/')) {
    throw new FacePhotoError('Choose a valid image file.', 'INVALID_IMAGE')
  }
  if (file.size > 15 * 1024 * 1024) {
    throw new FacePhotoError('Photos must be smaller than 15 MB.', 'IMAGE_TOO_LARGE')
  }

  const objectUrl = URL.createObjectURL(file)
  try {
    const image = await loadImage(objectUrl)
    const detector = await loadDetector()
    const detections = detector.detect(image).detections || []
    const faces = detections.filter((detection) => faceScore(detection) >= FACE_MIN_CONFIDENCE)
    const face = largestFace(faces)
    if (!face) {
      throw new FacePhotoError('No clear face was found. Upload a front-facing portrait and try again.', 'NO_FACE')
    }

    const crop = faceCropRect({
      imageWidth: image.naturalWidth,
      imageHeight: image.naturalHeight,
      detection: face,
    })
    const canvas = document.createElement('canvas')
    canvas.width = FACE_OUTPUT_WIDTH
    canvas.height = FACE_OUTPUT_HEIGHT
    const context = canvas.getContext('2d')
    context.imageSmoothingEnabled = true
    context.imageSmoothingQuality = 'high'
    context.drawImage(
      image,
      crop.x, crop.y, crop.width, crop.height,
      0, 0, FACE_OUTPUT_WIDTH, FACE_OUTPUT_HEIGHT,
    )

    return {
      blob: await canvasBlob(canvas),
      faceCount: faces.length,
      score: faceScore(face),
      crop,
    }
  } catch (error) {
    if (error instanceof FacePhotoError) throw error
    throw new FacePhotoError(`Face check failed: ${error.message}`, 'FACE_CHECK_FAILED')
  } finally {
    URL.revokeObjectURL(objectUrl)
  }
}
