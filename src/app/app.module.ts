import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';

import { DragDropModule } from '@angular/cdk/drag-drop';
import { PerfectScrollbarModule } from 'ngx-perfect-scrollbar';
import { ToastrModule } from 'ngx-toastr';
import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { DocumentScannerComponent } from './document-scanner/document-scanner.component';

@NgModule({
  declarations: [AppComponent, DocumentScannerComponent],
  imports: [
    BrowserModule,
    AppRoutingModule,
    PerfectScrollbarModule,
    DragDropModule,
    ToastrModule.forRoot({
      timeOut: 10000,
      positionClass: 'toast-top-center',
      preventDuplicates: true,
    }),
  ],
  providers: [],
  bootstrap: [AppComponent],
})
export class AppModule {}
