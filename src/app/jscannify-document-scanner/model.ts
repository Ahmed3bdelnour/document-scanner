export class WebScanner {
  cv: any = null;

  constructor(_cv: any) {
    this.cv = _cv;
  }

  findPaperContour(img: any, contour: any) {
    let imgGray;
    let imgBlur;
    let imgThresh;
    let contours;
    let hierarchy;

    try {
      console.log('findPaperContour execution: start - src image matrix ', img);

      imgGray = new this.cv.Mat();
      this.cv.cvtColor(img, imgGray, this.cv.COLOR_RGBA2GRAY);

      console.log('findPaperContour execution: imgGray ', imgGray);

      imgBlur = new this.cv.Mat();
      this.cv.GaussianBlur(
        imgGray,
        imgBlur,
        new this.cv.Size(5, 5),
        0,
        0,
        this.cv.BORDER_DEFAULT
      );

      console.log('findPaperContour execution: imgBlur ', imgBlur);

      imgThresh = new this.cv.Mat();
      this.cv.threshold(
        imgBlur,
        imgThresh,
        0,
        255,
        this.cv.THRESH_BINARY + this.cv.THRESH_OTSU
      );

      console.log('findPaperContour execution: imgThresh ', imgThresh);

      contours = new this.cv.MatVector();
      hierarchy = new this.cv.Mat();
      this.cv.findContours(
        imgThresh,
        contours,
        hierarchy,
        this.cv.RETR_CCOMP,
        this.cv.CHAIN_APPROX_SIMPLE
      );

      console.log('findPaperContour execution: contours ', contours);

      let maxArea = 0;
      let maxContourIndex = -1;

      for (let i = 0; i < contours.size(); ++i) {
        let contourArea = this.cv.contourArea(contours.get(i));
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

      contour = maxContourIndex !== -1 ? contours.get(maxContourIndex) : null;

      console.log('findPaperContour execution: maxContour ', contour);

      this.deleteCVObject(imgGray);
      this.deleteCVObject(imgBlur);
      this.deleteCVObject(imgThresh);
      this.deleteCVObject(contours);
      this.deleteCVObject(hierarchy);

      console.log(
        'findPaperContour execution: cleaning matrixes',
        imgGray,
        imgBlur,
        imgThresh,
        contours,
        hierarchy
      );
    } catch (error: any) {
      this.deleteCVObject(imgGray);
      this.deleteCVObject(imgBlur);
      this.deleteCVObject(imgThresh);
      this.deleteCVObject(contours);
      this.deleteCVObject(hierarchy);

      throw new Error(error);
    }
  }

  highlightPaper(capture: any, width: any, height: any) {
    let img;
    let maxContour;

    try {
      console.log('highlightPaper execution: start');

      img = new this.cv.Mat(height, width, this.cv.CV_8UC4);
      capture.read(img);

      console.log('highlightPaper execution: src img martrix ', img);

      this.findPaperContour(img, maxContour);

      console.log('highlightPaper execution:  maxContour ', maxContour);

      if (maxContour) {
        this.drawContourInImage(img, maxContour);
        this.deleteCVObject(maxContour);
      }

      this.cv.imshow('result', img);

      this.deleteCVObject(img);

      console.log(
        'highlightPaper execution: cleaning img and maxContour ',
        img,
        maxContour
      );
    } catch (error: any) {
      this.deleteCVObject(img);
      this.deleteCVObject(maxContour);

      console.log(
        'highlightPaper execution: cleaning img and maxContour ',
        img,
        maxContour
      );

      throw new Error(error);
    }
  }

  extractPaper(
    image: any,
    resultWidth: any,
    resultHeight: any,
    fullPaper = false
  ) {
    const canvas = document.createElement('canvas');

    let img = this.cv.imread(image);

    if (!fullPaper) {
      let maxContour;
      this.findPaperContour(img, maxContour);

      if (maxContour) {
        let warpedDst = new this.cv.Mat();

        let dsize = new this.cv.Size(resultWidth, resultHeight);
        let srcTri = new this.cv.Mat();
        this.getApproximatePolyDBContour(maxContour, srcTri);

        let dstTri = this.cv.matFromArray(4, 1, this.cv.CV_32FC2, [
          0,
          0,
          resultWidth,
          0,
          0,
          resultHeight,
          resultWidth,
          resultHeight,
        ]);

        let M = this.cv.getPerspectiveTransform(srcTri, dstTri);
        this.cv.warpPerspective(
          img,
          warpedDst,
          M,
          dsize,
          this.cv.INTER_LINEAR,
          this.cv.BORDER_CONSTANT,
          new this.cv.Scalar()
        );

        this.cv.imshow(canvas, warpedDst);

        this.deleteCVObject(warpedDst);
        this.deleteCVObject(maxContour);
        this.deleteCVObject(srcTri);
        this.deleteCVObject(dstTri);
        this.deleteCVObject(M);
      } else {
        this.cv.imshow(canvas, img);
      }
    } else {
      this.cv.imshow(canvas, img);
    }

    this.deleteCVObject(img);

    return canvas;
  }

  drawContourInImage(img: any, contour: any) {
    let contoursToDraw;
    let approxCurve;

    try {
      approxCurve = new this.cv.Mat();
      this.getApproximatePolyDBContour(contour, approxCurve);
      contoursToDraw = new this.cv.MatVector();
      contoursToDraw.push_back(approxCurve);
      this.cv.drawContours(
        img,
        contoursToDraw,
        0,
        new this.cv.Scalar(255, 255, 0, 255),
        2
      );

      this.deleteCVObject(contoursToDraw);
      this.deleteCVObject(approxCurve);
    } catch (error: any) {
      this.deleteCVObject(contoursToDraw);
      this.deleteCVObject(approxCurve);

      throw new Error(error);
    }
  }

  getApproximatePolyDBContour(contour: any, approximateCurve: any) {
    const epsilon = 0.04 * this.cv.arcLength(contour, true); // adjust the epsilon value as needed
    this.cv.approxPolyDP(contour, approximateCurve, epsilon, true);
  }

  deleteCVObject(matrix: any) {
    if (!matrix || matrix._deleted) return;
    matrix.delete();
    matrix._deleted = true;
  }
}
