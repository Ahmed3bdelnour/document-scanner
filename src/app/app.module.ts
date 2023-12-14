import { NgModule } from '@angular/core';
import {
  BrowserModule,
  HAMMER_GESTURE_CONFIG,
  HammerGestureConfig,
} from '@angular/platform-browser';

import { DragDropModule } from '@angular/cdk/drag-drop';
import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { DocumentScannerNewComponent } from './document-scanner-new/document-scanner-new.component';
import { DocumentScannerComponent } from './document-scanner/document-scanner.component';

import { HammerModule } from '@angular/platform-browser';

export class MyHammerConfig extends HammerGestureConfig {
  override overrides = <any>{
    swipe: { direction: Hammer.DIRECTION_ALL },
  };
}

debugger;
console.log(new HammerGestureConfig());

@NgModule({
  declarations: [
    AppComponent,
    DocumentScannerComponent,
    DocumentScannerNewComponent,
  ],
  imports: [BrowserModule, AppRoutingModule, DragDropModule, HammerModule],
  providers: [
    {
      provide: HAMMER_GESTURE_CONFIG,
      useClass: MyHammerConfig,
    },
  ],
  bootstrap: [AppComponent],
})
export class AppModule {}
