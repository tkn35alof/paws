import test from 'node:test'
import assert from 'node:assert/strict'
import { faceCropRect, largestFace, photoErrorMessage } from '../src/lib/face-photo.js'

function detection(x, y, width, height, score = 0.95) {
  return {
    boundingBox: { originX: x, originY: y, width, height },
    categories: [{ score }],
  }
}

test('photoErrorMessage returns a safe retry message', () => {
  assert.equal(photoErrorMessage(new Error('No clear face was found.')), 'No clear face was found.')
  assert.equal(photoErrorMessage({ message: '' }), 'Face check failed. Try another photo.')
})

test('largestFace returns the highest-area detection', () => {
  const faces = [detection(10, 10, 20, 20, 0.99), detection(60, 40, 80, 90, 0.8)]
  assert.equal(largestFace(faces), faces[1])
  assert.equal(largestFace([]), null)
})

test('faceCropRect uses MediaPipe pixel boxes for a landscape portrait', () => {
  const rect = faceCropRect({
    imageWidth: 1600,
    imageHeight: 1200,
    detection: detection(600, 400, 200, 240),
  })

  assert.equal(rect.width, 960)
  assert.equal(rect.height, 1200)
  assert.equal(rect.x, 220)
  assert.equal(rect.y, 0)
})

test('faceCropRect clamps a top-edge face inside the image', () => {
  const rect = faceCropRect({
    imageWidth: 1600,
    imageHeight: 1200,
    detection: detection(600, 0, 200, 200),
  })

  assert.equal(rect.width, 960)
  assert.equal(rect.height, 1200)
  assert.equal(rect.x, 220)
  assert.equal(rect.y, 0)
})

test('faceCropRect clamps a right-edge face inside the image', () => {
  const rect = faceCropRect({
    imageWidth: 1600,
    imageHeight: 1200,
    detection: detection(1400, 400, 200, 240),
  })

  assert.equal(rect.width, 960)
  assert.equal(rect.height, 1200)
  assert.equal(rect.x, 640)
  assert.ok(rect.y >= 0 && rect.y + rect.height <= 1200)
})

test('faceCropRect fits a narrow source without distortion', () => {
  const rect = faceCropRect({
    imageWidth: 600,
    imageHeight: 1200,
    detection: detection(200, 300, 180, 220),
  })

  assert.equal(rect.width, 600)
  assert.equal(rect.height, 750)
  assert.equal(rect.x, 0)
  assert.ok(rect.y >= 0 && rect.y + rect.height <= 1200)
})

test('faceCropRect rejects normalized boxes and invalid sizes', () => {
  assert.throws(
    () => faceCropRect({ imageWidth: 1000, imageHeight: 1000, detection: detection(0.4, 0.3, 0.2, 0.2) }),
    /outside the source image/,
  )
  assert.throws(
    () => faceCropRect({ imageWidth: 0, imageHeight: 1000, detection: detection(100, 100, 100, 100) }),
    /positive image size/,
  )
})
