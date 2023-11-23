import { Component, OnInit } from '@angular/core';
import { captureVideo } from './utils';

@Component({
  selector: 'app-document-scanner',
  templateUrl: './document-scanner.component.html',
  styleUrls: ['./document-scanner.component.scss'],
})
export class DocumentScannerComponent implements OnInit {
  cameraStreaming = false;

  constructor() {}

  ngOnInit() {}

  scanDocument() {
    this.cameraStreaming = true;
    captureVideo(this.cameraStreaming);
  }

  captureImage() {
    this.cameraStreaming = false;
  }
}
