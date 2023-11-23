declare const cv: any;

export const captureVideo = (isStreaming: boolean) => {
  let video = document.getElementById('videoInput') as HTMLVideoElement;

  video.width = screen.availWidth;
  video.height = screen.availHeight;

  navigator.mediaDevices
    .getUserMedia({ video: true, audio: false })
    .then((stream) => {
      video.srcObject = stream;
      video.play();

      let src = new cv.Mat(video.height, video.width, cv.CV_8UC4);
      let dst = new cv.Mat(video.height, video.width, cv.CV_8UC1);
      let cap = new cv.VideoCapture(video);

      const FPS = 30;

      const processVideo = () => {
        try {
          if (!isStreaming) {
            // clean and stop.
            src.delete();
            dst.delete();
            return;
          }

          let begin = Date.now();
          // start processing.
          cap.read(src);
          cv.cvtColor(src, dst, cv.COLOR_RGBA2GRAY);
          cv.imshow('canvasOutput', dst);
          // schedule the next one.
          let delay = 1000 / FPS - (Date.now() - begin);
          setTimeout(processVideo, delay);
        } catch (err) {
          console.error(err);
        }
      };

      // schedule the first one.
      setTimeout(processVideo, 0);
    });
};
