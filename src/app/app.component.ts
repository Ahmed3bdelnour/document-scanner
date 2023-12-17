import { Component } from '@angular/core';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss'],
})
export class AppComponent {
  scannedDocumentURL = '';
  showDocumentScanner = false;

  handleCapturedDocument(scannedDocument: File) {
    console.log(scannedDocument);
  }

  handleCancelScanning() {
    console.log('Scanning cancelled');
  }

  handleClose() {
    this.showDocumentScanner = false;
  }
}
