import { Component, ElementRef, OnInit, ViewChild } from '@angular/core';
import * as Hammer from 'hammerjs';

@Component({
  selector: 'app-images-row',
  templateUrl: './images-row.component.html',
  styleUrls: ['./images-row.component.scss'],
})
export class ImagesRowComponent implements OnInit {
  // @ts-ignore
  @ViewChild('imageRow', { static: true }) imageRow: ElementRef;

  images: string[] = [
    'image1.jpg',
    'image2.jpg',
    'image3.jpg',
    'image1.jpg',
    'image2.jpg',
    'image3.jpg',
    'image1.jpg',
    'image2.jpg',
    'image3.jpg',
    'image1.jpg',
    'image2.jpg',
    'image3.jpg',
  ];

  ngOnInit() {
    const hammer = new Hammer(this.imageRow.nativeElement);
    hammer.get('swipe').set({ direction: Hammer.DIRECTION_VERTICAL });
  }

  deleteImage(index: number) {
    this.images.splice(index, 1);
  }
}
