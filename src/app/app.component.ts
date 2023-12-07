import { Component } from '@angular/core';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss'],
})
export class AppComponent {
  scannedDocumentURL = '';
  showDocumentScanner = false;

  handleCapturedDocument(scannedDocumentURL: string) {
    this.scannedDocumentURL = scannedDocumentURL;
  }

  handleCancelScanning() {
    console.log('Scanning cancelled');
  }
}
