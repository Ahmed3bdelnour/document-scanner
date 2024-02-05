import { simd } from 'wasm-feature-detect';

export async function loadOpenCV(
  paths: {
    asm?: string;
    wasm?: string;
    threads?: string;
    simd?: string;
    threadsSimd?: string;
  },
  onloadCallback: () => void,
  onErrorCallback: () => void
) {
  if (document.getElementById('opencv-script')) {
    onloadCallback();
    return;
  }

  let OPENCV_URL = '';
  let asmPath = '';
  let wasmPath = '';
  let simdPath = '';
  let threadsPath = '';
  let threadsSimdPath = '';

  if (!(paths instanceof Object)) {
    throw new Error(
      'The first input should be a object that points the path to the OpenCV.js'
    );
  }

  if ('asm' in paths) {
    asmPath = paths['asm'] as string;
  }

  if ('wasm' in paths) {
    wasmPath = paths['wasm'] as string;
  }

  if ('threads' in paths) {
    threadsPath = paths['threads'] as string;
  }

  if ('simd' in paths) {
    simdPath = paths['simd'] as string;
  }

  if ('threadsSimd' in paths) {
    threadsSimdPath = paths['threadsSimd'] as string;
  }

  let wasmSupported = !(typeof WebAssembly === 'undefined');

  if (!wasmSupported && OPENCV_URL === '' && asmPath != '') {
    OPENCV_URL = asmPath;
    console.log('The OpenCV.js for Asm.js is loaded now');
  } else if (!wasmSupported && asmPath == '') {
    throw new Error(
      'The browser supports the Asm.js only, but the path of OpenCV.js for Asm.js is empty'
    );
  }

  let simdSupported = wasmSupported ? await simd() : false;
  let threadsSupported = false;

  if (simdSupported && threadsSupported && threadsSimdPath != '') {
    OPENCV_URL = threadsSimdPath;
    console.log(
      'The OpenCV.js with simd and threads optimization is loaded now'
    );
  } else if (simdSupported && simdPath != '') {
    if (threadsSupported && threadsSimdPath === '') {
      console.log(
        'The browser supports simd and threads, but the path of OpenCV.js with simd and threads optimization is empty'
      );
    }
    OPENCV_URL = simdPath;
    console.log('The OpenCV.js with simd optimization is loaded now.');
  } else if (threadsSupported && threadsPath != '') {
    if (simdSupported && threadsSimdPath === '') {
      console.log(
        'The browser supports simd and threads, but the path of OpenCV.js with simd and threads optimization is empty'
      );
    }
    OPENCV_URL = threadsPath;
    console.log('The OpenCV.js with threads optimization is loaded now');
  } else if (wasmSupported && wasmPath != '') {
    if (simdSupported && threadsSupported) {
      console.log(
        'The browser supports simd and threads, but the path of OpenCV.js with simd and threads optimization is empty'
      );
    }

    if (simdSupported) {
      console.log(
        'The browser supports simd optimization, but the path of OpenCV.js with simd optimization is empty'
      );
    }

    if (threadsSupported) {
      console.log(
        'The browser supports threads optimization, but the path of OpenCV.js with threads optimization is empty'
      );
    }

    OPENCV_URL = wasmPath;
    console.log('The OpenCV.js for wasm is loaded now');
  } else if (wasmSupported) {
    console.log(
      'The browser supports wasm, but the path of OpenCV.js for wasm is empty'
    );

    if (asmPath != '') {
      OPENCV_URL = asmPath;
      console.log('The OpenCV.js for Asm.js is loaded as fallback.');
    }
  }

  if (OPENCV_URL === '') {
    throw new Error('No available OpenCV.js, please check your paths');
  }

  let script = document.createElement('script');
  script.setAttribute('async', '');
  script.setAttribute('type', 'text/javascript');
  script.setAttribute('id', 'opencv-script');

  script.addEventListener('load', () => {
    onloadCallback();
  });

  script.addEventListener('error', () => {
    console.log('Failed to load opencv.js');
    onErrorCallback();
  });

  script.src = OPENCV_URL;

  const opencvPlaceholder = document.getElementById('opencv-placeholder');
  opencvPlaceholder?.parentNode!.insertBefore(script, opencvPlaceholder);
  opencvPlaceholder?.remove();
}
