// @ts-nocheck
declare var cv: any;

export class jscanify {
  constructor() {}

  /**
   * Finds the contour of the paper within the image
   * @param {*} img image to process (cv.Mat)
   * @returns the biggest contour inside the image
   */
  findPaperContour(img) {
    let imgGray;
    let imgBlur;
    let imgThresh;
    let contours;
    let hierarchy;

    try {
      console.log('findPaperContour execution: start - src image matrix ', img);

      imgGray = new cv.Mat();
      cv.cvtColor(img, imgGray, cv.COLOR_RGBA2GRAY);

      console.log('findPaperContour execution: imgGray ', imgGray);

      imgBlur = new cv.Mat();
      cv.GaussianBlur(
        imgGray,
        imgBlur,
        new cv.Size(5, 5),
        0,
        0,
        cv.BORDER_DEFAULT
      );

      console.log('findPaperContour execution: imgBlur ', imgBlur);

      imgThresh = new cv.Mat();
      cv.threshold(
        imgBlur,
        imgThresh,
        0,
        255,
        cv.THRESH_BINARY + cv.THRESH_OTSU
      );

      console.log('findPaperContour execution: imgThresh ', imgThresh);

      contours = new cv.MatVector();
      hierarchy = new cv.Mat();
      cv.findContours(
        imgThresh,
        contours,
        hierarchy,
        cv.RETR_CCOMP,
        cv.CHAIN_APPROX_SIMPLE
      );

      console.log('findPaperContour execution: contours ', contours);

      let maxArea = 0;
      let maxContourIndex = -1;

      for (let i = 0; i < contours.size(); ++i) {
        let contourArea = cv.contourArea(contours.get(i));
        if (contourArea > maxArea) {
          maxArea = contourArea;
          maxContourIndex = i;
        }
      }

      console.log(
        'findPaperContour execution: maxArea, maxContourIndex ',
        maxArea,
        maxContourIndex
      );

      const maxContour =
        maxContourIndex !== -1 ? contours.get(maxContourIndex) : null;

      console.log('findPaperContour execution: maxContour ', maxContour);

      imgGray.delete();
      imgBlur.delete();
      imgThresh.delete();
      contours.delete();
      hierarchy.delete();

      imgGray = null;
      imgBlur = null;
      imgThresh = null;
      contours = null;
      hierarchy = null;

      console.log(
        'findPaperContour execution: cleaning matrixes',
        imgGray,
        imgBlur,
        imgThresh,
        contours,
        hierarchy
      );

      return maxContour;
    } catch (error) {
      if (imgGray) {
        imgGray.delete();
        imgGray = null;
      }

      if (imgBlur) {
        imgBlur.delete();
        imgBlur = null;
      }

      if (imgThresh) {
        imgThresh.delete();
        imgThresh = null;
      }

      if (contours) {
        contours.delete();
        contours = null;
      }

      if (hierarchy) {
        hierarchy.delete();
        hierarchy = null;
      }

      throw new Error(error);
    }
  }

  /**
   * Highlights the paper detected inside the image.
   * @param {*} image image to process
   * @param {*} options options for highlighting. Accepts `color` and `thickness` parameter
   * @returns `HTMLCanvasElement` with original image and paper highlighted
   */
  highlightPaper(image, options) {
    let img;
    let maxContour;

    try {
      console.log('highlightPaper execution: start');

      options = options || {};
      options.color = options.color || 'orange';
      options.thickness = options.thickness || 10;
      const canvas = document.createElement('canvas');
      console.log('highlightPaper execution: canvas ', canvas);
      const ctx = canvas.getContext('2d', { willReadFrequently: true });
      console.log('highlightPaper execution: canvas ctx ', ctx);
      img = cv.imread(image);

      console.log('highlightPaper execution: src img martrix ', img);

      maxContour = this.findPaperContour(img);

      console.log('highlightPaper execution:  maxContour ', maxContour);

      if (maxContour) this.drawContourInImage(img, maxContour);

      cv.imshow(canvas, img);

      img.delete();
      maxContour.delete();

      img = null;
      maxContour = null;

      console.log(
        'highlightPaper execution: cleaning img and maxContour ',
        img,
        maxContour
      );

      return canvas;
    } catch (error) {
      if (img) {
        img.delete();
        img = null;
      }

      if (maxContour) {
        maxContour.delete();
        maxContour = null;
      }

      console.log(
        'highlightPaper execution: cleaning img and maxContour ',
        img,
        maxContour
      );

      throw new Error(error);
    }
  }

  extractPaper(image, resultWidth, resultHeight, fullPaper = false) {
    const canvas = document.createElement('canvas');

    let img = cv.imread(image);

    let maxContour = this.findPaperContour(img);

    if (maxContour && !fullPaper) {
      let warpedDst = new cv.Mat();

      let dsize = new cv.Size(resultWidth, resultHeight);
      let srcTri = this.getApproximatePolyDBContour(maxContour);

      let dstTri = cv.matFromArray(4, 1, cv.CV_32FC2, [
        0,
        0,
        resultWidth,
        0,
        0,
        resultHeight,
        resultWidth,
        resultHeight,
      ]);

      let M = cv.getPerspectiveTransform(srcTri, dstTri);
      cv.warpPerspective(
        img,
        warpedDst,
        M,
        dsize,
        cv.INTER_LINEAR,
        cv.BORDER_CONSTANT,
        new cv.Scalar()
      );

      cv.imshow(canvas, warpedDst);

      warpedDst.delete();
      warpedDst = null;

      maxContour.delete();
      maxContour = null;

      srcTri.delete();
      srcTri = null;

      dstTri.delete();
      dstTri = null;

      M.delete();
      M = null;
    } else {
      cv.imshow(canvas, img);
    }

    img.delete();
    img = null;

    return canvas;
  }

  drawContourInImage(img, contour) {
    let contoursToDraw;
    let approxCurve;

    try {
      approxCurve = this.getApproximatePolyDBContour(contour);
      contoursToDraw = new cv.MatVector();
      contoursToDraw.push_back(approxCurve);
      cv.drawContours(img, contoursToDraw, 0, new cv.Scalar(0, 255, 0, 255), 2);

      // Don't forget to release the memory allocated for approxCurve
      contoursToDraw.delete();
      approxCurve.delete();

      contoursToDraw = null;
      approxCurve = null;
    } catch (error) {
      if (contoursToDraw) {
        contoursToDraw.delete();
        contoursToDraw = null;
      }

      if (approxCurve) {
        approxCurve.delete();
        approxCurve = null;
      }

      throw new Error(error);
    }
  }

  getApproximatePolyDBContour(contour) {
    let approxCurve;

    try {
      const epsilon = 0.04 * cv.arcLength(contour, true); // You can adjust the epsilon value

      approxCurve = new cv.Mat();
      cv.approxPolyDP(contour, approxCurve, epsilon, true);

      return approxCurve;
    } catch (error) {
      if (approxCurve) {
        approxCurve.delete();
        approxCurve = null;
      }

      throw new Error(error);
    }
  }
}
