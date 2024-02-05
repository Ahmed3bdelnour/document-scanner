import { Component } from '@angular/core';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss'],
})
export class AppComponent {
  showDocumentScanner = false;

  handleCapturedDocument(scannedDocument: File) {
    console.log(scannedDocument);
  }
}
